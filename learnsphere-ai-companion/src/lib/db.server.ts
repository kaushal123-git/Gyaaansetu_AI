import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { getCookie } from "@tanstack/react-start/server";

// Dynamic in-memory connections cache
const dbInstances: Record<string, DatabaseSync> = {};

export function getDbForUser(explicitUserId?: string): DatabaseSync {
  let userId = explicitUserId || "default";

  if (!explicitUserId) {
    try {
      const cookieVal = getCookie("gyaansetu_user_id");
      if (cookieVal) {
        userId = cookieVal;
      }
    } catch (e) {
      // outside a request context
    }
  }

  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
  
  if (!dbInstances[safeId]) {
    const dbDir = path.resolve(process.cwd(), "db_users");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, `user_${safeId}.db`);
    const dbInstance = new DatabaseSync(dbPath);
    
    try {
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          education_level TEXT DEFAULT '',
          learning_goal TEXT DEFAULT '',
          preferred_lang TEXT DEFAULT 'English',
          career_target TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_stats (
          user_id TEXT PRIMARY KEY,
          study_hours REAL DEFAULT 0,
          courses_done INTEGER DEFAULT 0,
          ai_sessions INTEGER DEFAULT 0,
          global_rank INTEGER DEFAULT 999,
          mastery_score INTEGER DEFAULT 0,
          streak_days INTEGER DEFAULT 0,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          text TEXT NOT NULL,
          completed INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS mistakes (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          topic TEXT NOT NULL,
          frequency INTEGER NOT NULL,
          type TEXT NOT NULL,
          explanation TEXT NOT NULL,
          correction TEXT NOT NULL,
          sample_question TEXT NOT NULL,
          options_json TEXT NOT NULL,
          correct_idx INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS certificates (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          event TEXT NOT NULL,
          date TEXT NOT NULL,
          issuer TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_type TEXT NOT NULL,
          grade TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS courses (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          desc TEXT NOT NULL,
          tag TEXT NOT NULL,
          progress INTEGER NOT NULL,
          hours TEXT NOT NULL,
          syllabus_json TEXT NOT NULL,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS health_metrics (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          date TEXT NOT NULL,
          screen_hours REAL DEFAULT 0,
          water_cups INTEGER DEFAULT 0,
          sleep_hours REAL DEFAULT 0,
          stress_level TEXT DEFAULT 'Low',
          focus_index INTEGER DEFAULT 100,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS interview_reports (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          interview_type TEXT NOT NULL,
          technical_score INTEGER DEFAULT 0,
          comm_score INTEGER DEFAULT 0,
          confidence_score INTEGER DEFAULT 0,
          overall_score INTEGER DEFAULT 0,
          areas_json TEXT DEFAULT '[]',
          transcript_json TEXT DEFAULT '[]',
          duration_seconds INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS career_roadmaps (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          target_title TEXT NOT NULL,
          match_score INTEGER DEFAULT 0,
          roadmap_json TEXT NOT NULL DEFAULT '[]',
          skills_json TEXT NOT NULL DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS learning_progress (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          course_id TEXT NOT NULL,
          module_name TEXT NOT NULL,
          completed INTEGER DEFAULT 0,
          completed_at DATETIME,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ai_projects (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          tag TEXT DEFAULT '',
          inputs_json TEXT NOT NULL,
          output_markdown TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // Migration for existing users
      try {
        dbInstance.exec("ALTER TABLE ai_projects ADD COLUMN tag TEXT DEFAULT ''");
      } catch (e) {
        // already exists
      }
    } catch (err) {
      console.error(`Failed to initialize database schema for user ${safeId}:`, err);
    }

    dbInstances[safeId] = dbInstance;
  }

  return dbInstances[safeId];
}

// Export db as a Proxy that routes calls dynamically based on request cookie / state
export const db = new Proxy({} as DatabaseSync, {
  get(target, prop, receiver) {
    const instance = getDbForUser();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

export function hashPassword(password: string, salt: string): string {
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function generateUUID(): string {
  return crypto.randomUUID();
}
