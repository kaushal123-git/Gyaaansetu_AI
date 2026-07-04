import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, generateUUID } from "../db.server";

// Loads mistake logs for a user
export const loadMistakes = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const { userId } = data;

    const mistakes = db.prepare("SELECT * FROM mistakes WHERE user_id = ?").all(userId) as any[];

    return mistakes.map((m) => ({
      id: m.id,
      topic: m.topic,
      frequency: m.frequency,
      type: m.type,
      explanation: m.explanation,
      correction: m.correction,
      sampleQuestion: m.sample_question,
      options: JSON.parse(m.options_json),
      correctIdx: m.correct_idx,
    }));
  });

// Logs a new mistake entry
export const logNewMistake = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      topic: z.string().min(2),
      frequency: z.number().default(1),
      type: z.enum(["conceptual", "slip"]),
      explanation: z.string().min(5),
      correction: z.string().min(5),
      sampleQuestion: z.string(),
      options: z.array(z.string()),
      correctIdx: z.number(),
    })
  )
  .handler(async ({ data }) => {
    const { userId, topic, frequency, type, explanation, correction, sampleQuestion, options, correctIdx } = data;
    const id = generateUUID();

    db.prepare(`
      INSERT INTO mistakes (id, user_id, topic, frequency, type, explanation, correction, sample_question, options_json, correct_idx)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, topic, frequency, type, explanation, correction, sampleQuestion, JSON.stringify(options), correctIdx);

    return {
      id,
      topic,
      frequency,
      type,
      explanation,
      correction,
      sampleQuestion,
      options,
      correctIdx,
    };
  });

// Decrements mistake frequency upon correct practice response
export const practiceMistakeCorrect = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const { id } = data;

    db.prepare(`
      UPDATE mistakes
      SET frequency = CASE WHEN frequency > 1 THEN frequency - 1 ELSE 0 END
      WHERE id = ?
    `).run(id);

    const m = db.prepare("SELECT frequency FROM mistakes WHERE id = ?").get(id) as { frequency: number };
    return { id, frequency: m ? m.frequency : 0 };
  });
