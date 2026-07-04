import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, generateUUID } from "../db.server";

// Loads stats and tasks for a given user
export const loadDashboardData = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const { userId } = data;

    // 1. Fetch Stats
    const statsStmt = db.prepare("SELECT * FROM user_stats WHERE user_id = ?");
    let stats = statsStmt.get(userId) as any;

    if (!stats) {
      // Create if missing
      db.prepare(`
        INSERT INTO user_stats (user_id, study_hours, courses_done, ai_sessions, global_rank, mastery_score, streak_days)
        VALUES (?, 0.0, 0, 0, 999, 0, 0)
      `).run(userId);
      stats = statsStmt.get(userId) as any;
    }

    // 2. Fetch Tasks
    const tasksStmt = db.prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC");
    const tasks = tasksStmt.all(userId) as any[];

    return {
      stats: {
        studyHours: stats.study_hours,
        coursesDone: stats.courses_done,
        aiSessions: stats.ai_sessions,
        globalRank: stats.global_rank,
        masteryScore: stats.mastery_score,
        streakDays: stats.streak_days,
      },
      tasks: tasks.map((t) => ({
        id: t.id,
        text: t.text,
        completed: t.completed === 1,
      })),
    };
  });

// Adds a task
export const addTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      text: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { userId, text } = data;
    const id = generateUUID();

    db.prepare(`
      INSERT INTO tasks (id, user_id, text, completed)
      VALUES (?, ?, ?, 0)
    `).run(id, userId, text);

    return { id, text, completed: false };
  });

// Toggles completion status of a task
export const toggleTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      completed: z.boolean(),
    })
  )
  .handler(async ({ data }) => {
    const { id, completed } = data;
    const task = db.prepare("SELECT user_id, completed FROM tasks WHERE id = ?").get(id) as any;

    if (!task) {
      throw new Error("Task not found.");
    }

    const wasCompleted = task.completed === 1;
    db.prepare(`
      UPDATE tasks SET completed = ? WHERE id = ?
    `).run(completed ? 1 : 0, id);

    if (wasCompleted !== completed) {
      db.prepare(`
        UPDATE user_stats
        SET courses_done = MAX(0, courses_done + ?),
            mastery_score = MIN(100, MAX(0, mastery_score + ?))
        WHERE user_id = ?
      `).run(completed ? 1 : -1, completed ? 1 : -1, task.user_id);
    }

    const stats = db.prepare("SELECT * FROM user_stats WHERE user_id = ?").get(task.user_id) as any;

    return {
      id,
      completed,
      stats: {
        coursesDone: stats?.courses_done ?? 0,
        masteryScore: stats?.mastery_score ?? 0,
      },
    };
  });

// Deletes a task
export const deleteTask = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { id } = data;
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    return { id };
  });

// Log Pomodoro Completion and update stats
export const completeFocusSession = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      hoursIncrement: z.number(),
    })
  )
  .handler(async ({ data }) => {
    const { userId, hoursIncrement } = data;

    db.prepare(`
      UPDATE user_stats
      SET study_hours = study_hours + ?,
          streak_days = streak_days + 1
      WHERE user_id = ?
    `).run(hoursIncrement, userId);

    const stats = db.prepare("SELECT * FROM user_stats WHERE user_id = ?").get(userId) as any;
    return {
      studyHours: stats.study_hours,
      streakDays: stats.streak_days,
    };
  });
