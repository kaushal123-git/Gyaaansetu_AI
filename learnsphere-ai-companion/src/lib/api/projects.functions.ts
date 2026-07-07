import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const loadProjects = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const { userId } = data;
    const { db } = await import("../db.server");
    const stmt = db.prepare("SELECT * FROM ai_projects WHERE user_id = ? ORDER BY created_at DESC");
    const rows = stmt.all(userId) as any[];
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      tag: row.tag || "",
      outputMarkdown: row.output_markdown,
      createdAt: row.created_at,
    }));
  });

export const deleteProject = createServerFn({ method: "POST" })
  .inputValidator(z.object({ projectId: z.string() }))
  .handler(async ({ data }) => {
    const { projectId } = data;
    const { db } = await import("../db.server");
    db.prepare("DELETE FROM ai_projects WHERE id = ?").run(projectId);
    return { success: true };
  });

export const saveProject = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    id: z.string(),
    userId: z.string(),
    title: z.string(),
    category: z.string(),
    tag: z.string(),
    outputMarkdown: z.string(),
    inputsJson: z.string().default("{}")
  }))
  .handler(async ({ data }) => {
    const { id, userId, title, category, tag, outputMarkdown, inputsJson } = data;
    const { db } = await import("../db.server");
    db.prepare(`
      INSERT OR REPLACE INTO ai_projects (id, user_id, title, category, tag, inputs_json, output_markdown)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, title, category, tag, inputsJson, outputMarkdown);
    return { success: true };
  });

