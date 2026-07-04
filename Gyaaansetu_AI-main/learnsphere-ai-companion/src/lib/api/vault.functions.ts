import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, generateUUID } from "../db.server";

// Loads certificates
export const loadCertificates = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const { userId } = data;

    const certs = db.prepare("SELECT * FROM certificates WHERE user_id = ? ORDER BY date DESC").all(userId) as any[];

    return certs.map((c) => ({
      id: c.id,
      title: c.title,
      event: c.event,
      date: c.date,
      issuer: c.issuer,
      fileName: c.file_name,
      fileType: c.file_type as "pdf" | "image",
      grade: c.grade,
    }));
  });

// Adds a certificate
export const saveCertificate = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      title: z.string().min(1),
      event: z.string().min(1),
      date: z.string(),
      issuer: z.string().min(1),
      fileName: z.string().min(1),
      fileType: z.enum(["pdf", "image"]),
      grade: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const { userId, title, event, date, issuer, fileName, fileType, grade } = data;
    const id = generateUUID();

    db.prepare(`
      INSERT INTO certificates (id, user_id, title, event, date, issuer, file_name, file_type, grade)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, title, event, date, issuer, fileName, fileType, grade);

    return {
      id,
      title,
      event,
      date,
      issuer,
      fileName,
      fileType,
      grade,
    };
  });

// Deletes a certificate
export const deleteCertificate = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const { id } = data;

    db.prepare("DELETE FROM certificates WHERE id = ?").run(id);

    return { id };
  });
