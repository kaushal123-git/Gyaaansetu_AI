import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDbForUser } from "../db.server";

// Loads courses
export const loadCourses = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const { userId } = data;
    const db = getDbForUser(userId);

    const courses = db.prepare("SELECT * FROM courses WHERE user_id = ?").all(userId) as any[];

    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      desc: c.desc,
      tag: c.tag,
      progress: c.progress,
      hours: c.hours,
      syllabus: JSON.parse(c.syllabus_json),
    }));
  });

// Resumes/Updates progress of a course
export const updateCourseProgress = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      progress: z.number(),
      tag: z.string(),
      userId: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const { id, progress, tag, userId } = data;
    const db = getDbForUser(userId);

    db.prepare(`
      UPDATE courses
      SET progress = ?, tag = ?
      WHERE id = ?
    `).run(progress, tag, id);

    return { id, progress, tag };
  });
