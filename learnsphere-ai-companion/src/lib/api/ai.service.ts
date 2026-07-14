/**
 * GyaanSetu AI — Frontend API Service Layer
 * Centralized TypeScript client for all FastAPI AI endpoints.
 * All calls route to http://localhost:8000 (FastAPI backend).
 */

const API_BASE = "http://localhost:8000";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChatRequest {
  message: string;
  language?: string;
  mode?: string;
  user_id?: string;
  use_rag?: boolean;
}

export interface ChatStreamCallback {
  onToken: (token: string) => void;
  onDone: (trace?: any) => void;
  onError: (error: string) => void;
}

export interface OcrResult {
  text: string;
  lines: string[];
  confidence: number;
  error?: string;
}

export interface TutorVoiceResult {
  transcript: string;
  response: string;
  audio_url: string | null;
  tts_success: boolean;
  stt_confidence: number;
  trace?: any;
}

export interface RoadmapResult {
  title: string;
  match_score: number;
  salary_range: string;
  demand_trend: string;
  skill_gaps: { name: string; status: string; priority: string }[];
  roadmap: {
    id: number;
    title: string;
    status: "completed" | "in-progress" | "locked";
    desc: string;
    resources: string[];
    duration_weeks: number;
  }[];
  recommended_projects: string[];
  interview_prep: string[];
}

export interface MistakeAnalysis {
  id?: string;
  topic: string;
  type: string;
  explanation: string;
  correction: string;
  sample_question: string;
  options: string[];
  correct_idx: number;
  difficulty?: string;
  related_topics?: string[];
  transcript?: string;
  ocr_text?: string;
}

export interface HealthMetrics {
  focus_index: number;
  date: string | null;
  screen_hours?: number;
  water_cups?: number;
  sleep_hours?: number;
  stress_level?: string;
}

export interface InterviewReport {
  overall_score: number;
  technical_score: number;
  communication_score: number;
  confidence_score: number;
  strengths: string[];
  improvement_areas: string[];
  verdict: string;
  summary: string;
  report_id?: string;
}

export interface RagStats {
  chunk_count: number;
  available: boolean;
  collection?: string;
}

// Helper to retrieve active user dynamically
function getActiveUserId(userId?: string): string {
  if (userId && userId !== "demo-user-aarav" && userId !== "") return userId;
  try {
    const userStr = typeof window !== "undefined" ? window.localStorage.getItem("gyaansetu_user") : null;
    if (userStr) {
      const userObj = JSON.parse(userStr);
      if (userObj.id) return userObj.id;
    }
  } catch (e) {
    // ignore
  }
  return "default";
}

// ── Connection Health Check ───────────────────────────────────────────────────

export async function checkBackendHealth(): Promise<{ status: string; version: string; ollama_connected: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error();
    return res.json();
  } catch (err) {
    return { status: "offline", version: "unknown", ollama_connected: false };
  }
}

// ── AI Tutor ─────────────────────────────────────────────────────────────────

/**
 * Stream chat response token by token.
 * Uses Server-Sent Events (SSE) from FastAPI streaming endpoint.
 */
export async function tutorChatStream(
  req: ChatRequest,
  callbacks: ChatStreamCallback,
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/tutor/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: req.message,
        language: req.language ?? "English",
        mode: req.mode ?? "Deep Learning",
        user_id: getActiveUserId(req.user_id),
        use_rag: req.use_rag ?? false,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const cleaned = line.trim();
        if (!cleaned) continue;

        if (cleaned.startsWith("data: ")) {
          const rawPayload = cleaned.slice(6).trim();

          // Legacy plain [DONE] sentinel
          if (rawPayload === "[DONE]") {
            callbacks.onDone();
            return;
          }

          // Parse the JSON envelope the backend sends:
          // { "token": "...", "done": false } or { "token": "", "done": true }
          try {
            const parsed = JSON.parse(rawPayload) as {
              token?: string;
              done?: boolean;
              error?: string;
              trace?: any;
            };

            if (parsed.error) {
              callbacks.onError(parsed.error);
              return;
            }

            if (parsed.done) {
              callbacks.onDone(parsed.trace);
              return;
            }

            if (parsed.token) {
              callbacks.onToken(parsed.token);
            }
          } catch {
            // Fallback: treat entire payload as a plain-text token
            if (rawPayload) callbacks.onToken(rawPayload);
          }
        }
      }
    }
    callbacks.onDone();
  } catch (err: any) {
    callbacks.onError(err.message ?? "Network error — is the AI backend running?");
  }
}


/**
 * Send audio to Whisper STT → Ollama → Piper TTS pipeline.
 */
export async function tutorVoiceChat(
  audioBlob: Blob,
  language = "English",
  mode = "Deep Learning",
  userId?: string,
): Promise<TutorVoiceResult> {
  const activeUser = getActiveUserId(userId);
  const form = new FormData();
  form.append("audio", audioBlob, "recording.wav");

  const res = await fetch(
    `${API_BASE}/tutor/voice?language=${encodeURIComponent(language)}&mode=${encodeURIComponent(mode)}&user_id=${activeUser}`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    throw new Error(`Voice Assistant Error: HTTP ${res.status}`);
  }
  return res.json();
}

// ── Vision & OCR ──────────────────────────────────────────────────────────────

export async function extractOcrText(file: File): Promise<OcrResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/ocr/extract`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`OCR error: ${res.status}`);
  return res.json();
}

export async function solveImageQuestion(
  file: File,
  language = "English",
  mode = "Deep Learning",
): Promise<{ extracted_text: string; confidence: number; solution: string; lines: string[]; trace?: any }> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(
    `${API_BASE}/ocr/solve?language=${encodeURIComponent(language)}&mode=${encodeURIComponent(mode)}`,
    { method: "POST", body: form }
  );
  if (!res.ok) throw new Error(`OCR solve error: ${res.status}`);
  return res.json();
}

// ── RAG Engine ────────────────────────────────────────────────────────────────

export async function ragIngestFile(
  file: File,
  userId?: string,
): Promise<{ chunks_stored: number; filename: string }> {
  const activeUser = getActiveUserId(userId);
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/rag/ingest-file?user_id=${activeUser}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`RAG ingest error: ${res.status}`);
  return res.json();
}

export async function ragQuery(
  question: string,
  userId?: string,
): Promise<{ answer: string; context_used: boolean; sources: string[] }> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(`${API_BASE}/rag/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, user_id: activeUser }),
  });
  if (!res.ok) throw new Error(`RAG query error: ${res.status}`);
  return res.json();
}

export async function ragGetStats(userId?: string): Promise<RagStats> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(`${API_BASE}/rag/stats/${activeUser}`);
  return res.json();
}

export async function ragClear(userId?: string): Promise<{ success: boolean }> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(`${API_BASE}/rag/clear/${activeUser}`, { method: "DELETE" });
  return res.json();
}

// ── Career ────────────────────────────────────────────────────────────────────

export async function generateRoadmap(
  targetTitle: string,
  currentSkills: string[] = [],
  userId?: string,
): Promise<RoadmapResult> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(`${API_BASE}/career/generate-roadmap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_title: targetTitle, current_skills: currentSkills, user_id: activeUser }),
  });
  if (!res.ok) throw new Error(`Career API error: ${res.status}`);
  return res.json();
}

export async function analyzeResume(
  file: File,
  targetRole = "Software Engineer",
  userId?: string,
): Promise<RoadmapResult> {
  const activeUser = getActiveUserId(userId);
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${API_BASE}/career/analyze-resume?target_role=${encodeURIComponent(targetRole)}&user_id=${activeUser}`,
    { method: "POST", body: form }
  );
  if (!res.ok) throw new Error(`Resume analysis error: ${res.status}`);
  return res.json();
}

// ── Interview ─────────────────────────────────────────────────────────────────

export async function startInterview(
  interviewType: string,
  userId?: string,
  language = "English",
): Promise<{ session_id: string; question: string; audio_url: string | null }> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(`${API_BASE}/interview/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interview_type: interviewType, user_id: activeUser, language }),
  });
  if (!res.ok) throw new Error(`Interview start error: ${res.status}`);
  return res.json();
}

export async function respondInterview(
  sessionId: string,
  audioBlob: Blob,
): Promise<{ transcript: string; feedback: string; next_question: string; audio_url: string | null; running_tech_score: number }> {
  const form = new FormData();
  form.append("audio", audioBlob, "answer.wav");
  const res = await fetch(`${API_BASE}/interview/respond?session_id=${sessionId}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Interview response error: ${res.status}`);
  return res.json();
}

export async function endInterview(sessionId: string): Promise<InterviewReport> {
  const res = await fetch(`${API_BASE}/interview/end/${sessionId}`, { method: "POST" });
  if (!res.ok) throw new Error(`Interview evaluation error: ${res.status}`);
  return res.json();
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function syncHealthMetrics(
  metrics: Omit<HealthMetrics, "focus_index">,
  userId?: string,
): Promise<{ focus_index: number; message: string }> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(`${API_BASE}/health/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: activeUser,
      date: metrics.date,
      screen_hours: metrics.screen_hours ?? 0,
      water_cups: metrics.water_cups ?? 0,
      sleep_hours: metrics.sleep_hours ?? 0,
      stress_level: metrics.stress_level ?? "Low",
    }),
  });
  if (!res.ok) throw new Error(`Health sync error: ${res.status}`);
  return res.json();
}

export async function getHealthIndex(userId?: string): Promise<HealthMetrics> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(`${API_BASE}/health/index/${activeUser}`);
  return res.json();
}

export async function logBreathingSession(
  userId?: string,
  durationSeconds = 60,
): Promise<{ focus_index: number; message: string }> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(
    `${API_BASE}/health/breathing-session?user_id=${activeUser}&duration_seconds=${durationSeconds}`,
    { method: "POST" }
  );
  return res.json();
}

export async function analyzeMoodFeeling(
  moodEmoji: string,
  feelingText: string,
  userId?: string,
): Promise<{ analysis: string; suggested_stress: string }> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(`${API_BASE}/health/analyze-mood`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mood_emoji: moodEmoji, feeling_text: feelingText, user_id: activeUser }),
  });
  if (!res.ok) throw new Error(`Mood analysis error: ${res.status}`);
  return res.json();
}

export async function analyzeWearable(
  file: File,
  userId?: string,
): Promise<{ analysis: string; filename: string }> {
  const activeUser = getActiveUserId(userId);
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/health/analyze-wearable?user_id=${activeUser}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Wearable analysis error: ${res.status}`);
  return res.json();
}

export async function chatCompanion(
  message: string,
  history: { role: string; content: string }[],
  userId?: string,
): Promise<{ response: string }> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(`${API_BASE}/health/chat-companion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, user_id: activeUser }),
  });
  if (!res.ok) throw new Error(`Companion chat error: ${res.status}`);
  return res.json();
}


// ── Mistakes ──────────────────────────────────────────────────────────────────

export async function analyzeMistakeText(
  text: string,
  userId?: string,
  language = "English",
): Promise<MistakeAnalysis> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(`${API_BASE}/mistakes/analyze-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, user_id: activeUser, language }),
  });
  if (!res.ok) throw new Error(`Mistake analyze error: ${res.status}`);
  return res.json();
}

export async function analyzeMistakeVoice(
  audioBlob: Blob,
  userId?: string,
  language = "English",
): Promise<MistakeAnalysis> {
  const activeUser = getActiveUserId(userId);
  const form = new FormData();
  form.append("audio", audioBlob, "mistake.wav");
  const res = await fetch(
    `${API_BASE}/mistakes/analyze-voice?user_id=${activeUser}&language=${encodeURIComponent(language)}`,
    { method: "POST", body: form }
  );
  if (!res.ok) throw new Error(`Voice mistake error: ${res.status}`);
  return res.json();
}

export async function getMistakeHeatmap(
  userId?: string,
): Promise<{ topics: { topic: string; type: string; frequency: number; error_index: number }[]; ai_insight: string }> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(`${API_BASE}/mistakes/heatmap/${activeUser}`);
  return res.json();
}

export async function generateRemedialQuiz(
  topic: string,
  difficulty = "Medium",
  language = "English",
  userId?: string,
): Promise<{ questions: { question: string; options: string[]; correct_idx: number; explanation: string }[]; topic: string }> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(`${API_BASE}/mistakes/quiz-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, difficulty, user_id: activeUser, language }),
  });
  if (!res.ok) throw new Error(`Quiz gen error: ${res.status}`);
  return res.json();
}

export async function markMistakePracticed(
  mistakeId: string,
  userId?: string,
): Promise<{ success: boolean; message: string }> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(
    `${API_BASE}/mistakes/practice-correct/${mistakeId}?user_id=${activeUser}`,
    { method: "POST" }
  );
  return res.json();
}

export interface ProjectGenerateRequest {
  title: string;
  category: string;
  user_id: string;
  tag?: string;
  description?: string;
  team_size?: number;
  tech_stack?: string;
  target_audience?: string;
}

export interface ProjectResult {
  id: string;
  title: string;
  category: string;
  tag?: string;
  output_markdown: string;
  created_at: string;
}

export async function generateProject(req: ProjectGenerateRequest): Promise<ProjectResult> {
  const res = await fetch(`${API_BASE}/projects/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Project generation error: ${res.status}`);
  return res.json();
}

export async function generateQuiz(
  topic: string,
  quizType: string,
  difficulty: string,
  userId?: string,
): Promise<any> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(`${API_BASE}/quiz/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, quiz_type: quizType, difficulty, user_id: activeUser }),
  });
  if (!res.ok) throw new Error(`Quiz generation error: ${res.status}`);
  return res.json();
}

export async function gradeSubjective(
  question: string,
  userAnswer: string,
  userId?: string,
): Promise<any> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(`${API_BASE}/quiz/grade-subjective`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, user_answer: userAnswer, user_id: activeUser }),
  });
  if (!res.ok) throw new Error(`Subjective grading error: ${res.status}`);
  return res.json();
}

export async function gradeCoding(
  problem: string,
  code: string,
  userId?: string,
): Promise<any> {
  const activeUser = getActiveUserId(userId);
  const res = await fetch(`${API_BASE}/quiz/grade-coding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problem, code, user_id: activeUser }),
  });
  if (!res.ok) throw new Error(`Coding grading error: ${res.status}`);
  return res.json();
}


