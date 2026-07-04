import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Loads active roadmap for a given user
export const loadActiveRoadmap = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const { userId } = data;
    const { db } = await import("../db.server");
    const stmt = db.prepare("SELECT * FROM career_roadmaps WHERE user_id = ? ORDER BY created_at DESC LIMIT 1");
    const row = stmt.get(userId) as any;
    if (!row) return null;
    return {
      id: row.id,
      title: row.target_title,
      match_score: row.match_score,
      roadmap: JSON.parse(row.roadmap_json),
      skills: JSON.parse(row.skills_json),
    };
  });

// Saves roadmap for a given user
export const saveActiveRoadmap = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      title: z.string(),
      matchScore: z.number(),
      roadmapJson: z.string(),
      skillsJson: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const { userId, title, matchScore, roadmapJson, skillsJson } = data;
    const { db, generateUUID } = await import("../db.server");
    const id = generateUUID();
    db.prepare(`
      INSERT INTO career_roadmaps (id, user_id, target_title, match_score, roadmap_json, skills_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, title, matchScore, roadmapJson, skillsJson);
    return { id };
  });
