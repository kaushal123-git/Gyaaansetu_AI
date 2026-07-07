import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import net from "node:net";
import tls from "node:tls";

type VerificationStore = Record<
  string,
  {
    email: string;
    codeHash: string;
    expiresAt: number;
    purpose: "email" | "social";
    provider?: "Google" | "GitHub";
  }
>;

function getVerificationStorePath() {
  const dbDir = path.resolve(process.cwd(), "db_users");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return path.join(dbDir, "email_verifications.json");
}

function readVerificationStore(): VerificationStore {
  const storePath = getVerificationStorePath();
  if (!fs.existsSync(storePath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(storePath, "utf8")) as VerificationStore;
  } catch {
    return {};
  }
}

function writeVerificationStore(store: VerificationStore) {
  fs.writeFileSync(getVerificationStorePath(), JSON.stringify(store, null, 2));
}

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const envelopeFrom = from.match(/<([^>]+)>/)?.[1] || from;
  const secure = (process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;

  if (!host || !user || !pass || !from) {
    throw new Error("SMTP is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.");
  }

  return { host, port, user, pass, from, envelopeFrom, secure };
}

function waitForSmtpResponse(socket: net.Socket): Promise<string> {
  return new Promise((resolve, reject) => {
    let response = "";

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    };

    const onData = (chunk: Buffer) => {
      response += chunk.toString("utf8");
      const lines = response.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1] || "";
      if (/^\d{3} /.test(lastLine)) {
        cleanup();
        resolve(response);
      }
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onClose = () => {
      cleanup();
      reject(new Error("SMTP connection closed unexpectedly."));
    };

    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", onClose);
  });
}

async function sendSmtpCommand(socket: net.Socket, command: string, expectedCodes: number[]) {
  socket.write(`${command}\r\n`);
  const response = await waitForSmtpResponse(socket);
  const code = Number(response.slice(0, 3));

  if (!expectedCodes.includes(code)) {
    throw new Error(`SMTP command failed: ${response.trim()}`);
  }

  return response;
}

function createPlainSocket(host: string, port: number): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, host, () => resolve(socket));
    socket.once("error", reject);
  });
}

function createTlsSocket(host: string, port: number, socket?: net.Socket): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const tlsSocket = tls.connect({ host, port, socket, servername: host }, () => resolve(tlsSocket));
    tlsSocket.once("error", reject);
  });
}

function formatEmailMessage(to: string, subject: string, text: string) {
  const headers = [
    `From: ${getSmtpConfig().from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
  ];

  const safeText = text.replace(/^\./gm, "..");
  return `${headers.join("\r\n")}\r\n\r\n${safeText}\r\n.`;
}

async function sendVerificationEmail(email: string, code: string, purpose: "email" | "social", provider?: "Google" | "GitHub") {
  const config = getSmtpConfig();
  const subject = purpose === "social"
    ? `Your GyaanSetu ${provider} verification code`
    : "Your GyaanSetu verification code";
  const text = [
    `Your GyaanSetu AI verification code is ${code}.`,
    "",
    "This code expires in 10 minutes.",
    "If you did not request this code, you can ignore this email.",
  ].join("\n");

  let socket: net.Socket = config.secure
    ? await createTlsSocket(config.host, config.port)
    : await createPlainSocket(config.host, config.port);

  try {
    await waitForSmtpResponse(socket);
    await sendSmtpCommand(socket, `EHLO ${config.host}`, [250]);

    if (!config.secure) {
      await sendSmtpCommand(socket, "STARTTLS", [220]);
      socket = await createTlsSocket(config.host, config.port, socket);
      await sendSmtpCommand(socket, `EHLO ${config.host}`, [250]);
    }

    await sendSmtpCommand(socket, "AUTH LOGIN", [334]);
    await sendSmtpCommand(socket, Buffer.from(config.user).toString("base64"), [334]);
    await sendSmtpCommand(socket, Buffer.from(config.pass).toString("base64"), [235]);
    await sendSmtpCommand(socket, `MAIL FROM:<${config.envelopeFrom}>`, [250]);
    await sendSmtpCommand(socket, `RCPT TO:<${email}>`, [250, 251]);
    await sendSmtpCommand(socket, "DATA", [354]);
    socket.write(`${formatEmailMessage(email, subject, text)}\r\n`);

    const dataResponse = await waitForSmtpResponse(socket);
    if (Number(dataResponse.slice(0, 3)) !== 250) {
      throw new Error(`SMTP email send failed: ${dataResponse.trim()}`);
    }

    await sendSmtpCommand(socket, "QUIT", [221]);
  } finally {
    socket.end();
  }
}

function verifyChallenge(challengeId: string, email: string, code: string, purpose: "email" | "social") {
  const store = readVerificationStore();
  const challenge = store[challengeId];

  if (!challenge || challenge.email !== email || challenge.purpose !== purpose) {
    throw new Error("Verification code is invalid. Please request a new code.");
  }

  if (Date.now() > challenge.expiresAt) {
    delete store[challengeId];
    writeVerificationStore(store);
    throw new Error("Verification code expired. Please request a new code.");
  }

  if (challenge.codeHash !== hashCode(code.trim())) {
    throw new Error("Verification code is incorrect.");
  }

  delete store[challengeId];
  writeVerificationStore(store);
}

function normalizeGitHubUsername(username: string) {
  return username.trim().replace(/^@/, "");
}

async function assertGitHubAccountExists(username: string) {
  const normalizedUsername = normalizeGitHubUsername(username);

  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(normalizedUsername)) {
    throw new Error("Please enter a valid GitHub username.");
  }

  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(normalizedUsername)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "GyaanSetu-AI",
    },
  });

  if (response.status === 404) {
    throw new Error("No GitHub account found with that username.");
  }

  if (!response.ok) {
    throw new Error("Could not verify the GitHub account right now. Please try again.");
  }

  return normalizedUsername;
}

export const verifyGitHubAccount = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      username: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const username = await assertGitHubAccountExists(data.username);

    return {
      username,
      exists: true,
    };
  });

export const requestEmailVerification = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      purpose: z.enum(["email", "social"]),
      provider: z.enum(["Google", "GitHub"]).optional(),
    })
  )
  .handler(async ({ data }) => {
    const code = crypto.randomInt(100000, 999999).toString();
    const challengeId = crypto.randomUUID();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const store = readVerificationStore();

    store[challengeId] = {
      email: data.email,
      codeHash: hashCode(code),
      expiresAt,
      purpose: data.purpose,
      provider: data.provider,
    };
    writeVerificationStore(store);
    await sendVerificationEmail(data.email, code, data.purpose, data.provider);

    return {
      challengeId,
      expiresAt,
    };
  });

// Authenticates User and returns user data
export const loginUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
    })
  )
  .handler(async ({ data }) => {
    const { email, password } = data;
    const safeId = email.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();

    // Verify if database file exists
    const dbDir = path.resolve(process.cwd(), "db_users");
    const dbPath = path.join(dbDir, `user_${safeId}.db`);
    if (!fs.existsSync(dbPath)) {
      throw new Error("Invalid email or password.");
    }

    const { getDbForUser, hashPassword } = await import("../db.server");
    const userDb = getDbForUser(safeId);
    const stmt = userDb.prepare("SELECT * FROM users WHERE email = ?");
    const user = stmt.get(email) as any;

    if (!user) {
      throw new Error("Invalid email or password.");
    }

    const computedHash = hashPassword(password, user.salt);
    if (computedHash !== user.password_hash) {
      throw new Error("Invalid email or password.");
    }

    return {
      id: safeId,
      email: user.email,
      name: user.name,
    };
  });

// Registers a new user and populates baseline database data
export const registerUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      name: z.string().min(2),
      password: z.string().min(6),
      verificationId: z.string().min(1),
      verificationCode: z.string().min(6),
    })
  )
  .handler(async ({ data }) => {
    const { email, name, password, verificationId, verificationCode } = data;
    const safeId = email.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    verifyChallenge(verificationId, email, verificationCode, "email");

    // Check if user already exists by database file existence
    const dbDir = path.resolve(process.cwd(), "db_users");
    const dbPath = path.join(dbDir, `user_${safeId}.db`);
    if (fs.existsSync(dbPath)) {
      throw new Error("Email already registered.");
    }

    const { getDbForUser, hashPassword, generateSalt } = await import("../db.server");
    const userDb = getDbForUser(safeId);
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    // 1. Insert User
    userDb.prepare(`
      INSERT INTO users (id, email, name, password_hash, salt)
      VALUES (?, ?, ?, ?, ?)
    `).run(safeId, email, name, passwordHash, salt);

    // 2. Initialize Stats
    userDb.prepare(`
      INSERT INTO user_stats (user_id, study_hours, courses_done, ai_sessions, global_rank, mastery_score, streak_days)
      VALUES (?, 0.0, 0, 0, 999, 0, 0)
    `).run(safeId);

    // 3. Initialize baseline Courses (Clean / 0% Progress)
    const insertCourse = userDb.prepare(`
      INSERT INTO courses (id, user_id, title, desc, tag, progress, hours, syllabus_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertCourse.run(
      "react-" + safeId,
      safeId,
      "Advanced React Patterns",
      "Master compound components, headless UI, and server components in depth.",
      "0% done",
      0,
      "12 hours total",
      JSON.stringify(["Compound Components", "Higher-Order Functions", "Render Props", "Server Component Hydration"])
    );

    insertCourse.run(
      "dsa-" + safeId,
      safeId,
      "Data Structures & Algorithms",
      "350+ curated problems with AI-powered hints when you're stuck.",
      "Core",
      0,
      "20 hours total",
      JSON.stringify(["Dynamic Programming", "Graph DFS/BFS traversal", "Trie Index Structs", "Sliding Window Optimization"])
    );

    return {
      id: safeId,
      email: email,
      name: name,
    };
  });

export const completeSocialLogin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      provider: z.enum(["Google", "GitHub"]),
      email: z.string().email(),
      githubUsername: z.string().min(1).optional(),
      verificationId: z.string().min(1),
      verificationCode: z.string().min(6),
    })
  )
  .handler(async ({ data }) => {
    const { provider, email, githubUsername, verificationId, verificationCode } = data;

    if (provider === "GitHub") {
      if (!githubUsername) {
        throw new Error("Please enter your GitHub username.");
      }

      await assertGitHubAccountExists(githubUsername);
    }

    verifyChallenge(verificationId, email, verificationCode, "social");

    const safeId = email.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const dbDir = path.resolve(process.cwd(), "db_users");
    const dbPath = path.join(dbDir, `user_${safeId}.db`);

    if (fs.existsSync(dbPath)) {
      const { getDbForUser } = await import("../db.server");
      const userDb = getDbForUser(safeId);
      const user = userDb.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;

      if (!user) {
        throw new Error("Unable to verify this account.");
      }

      return {
        id: safeId,
        email: user.email,
        name: user.name,
      };
    }

    const { getDbForUser, hashPassword, generateSalt } = await import("../db.server");
    const userDb = getDbForUser(safeId);
    const salt = generateSalt();
    const passwordHash = hashPassword(`${provider}:${email}:${verificationId}`, salt);
    const name = `${provider} Learner`;

    userDb.prepare(`
      INSERT INTO users (id, email, name, password_hash, salt)
      VALUES (?, ?, ?, ?, ?)
    `).run(safeId, email, name, passwordHash, salt);

    userDb.prepare(`
      INSERT INTO user_stats (user_id, study_hours, courses_done, ai_sessions, global_rank, mastery_score, streak_days)
      VALUES (?, 0.0, 0, 0, 999, 0, 0)
    `).run(safeId);

    return {
      id: safeId,
      email,
      name,
    };
  });
