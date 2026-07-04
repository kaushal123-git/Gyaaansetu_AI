/**
 * GyaanSetu AI — Open Source Interview Service
 * Routes ALL AI calls through the local FastAPI backend (Ollama).
 *
 * Stack (100% open source, runs locally on Ollama):
 *   Chat/Reasoning → deepseek-r1 via Ollama   (~82% HumanEval coding accuracy)
 *   STT            → Whisper (openai/whisper)  (~96% WER accuracy)
 *   TTS            → Piper TTS                 (fast, expressive, local)
 *
 * No Gemini API key needed. No cloud calls made.
 */

const API_BASE = "http://localhost:8000";

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

/**
 * Detects if the user requested a specific Indian regional language.
 * Checks for keywords or Unicode ranges corresponding to: Hindi, Marathi, Tamil, Telugu, Bengali.
 */
function detectLanguage(text: string, currentLang: string = "English"): string {
  const normalized = text.toLowerCase();
  
  if (normalized.includes("hindi") || normalized.includes("हिंदी") || /[\u0900-\u097F]/.test(text)) {
    return "Hindi";
  }
  if (normalized.includes("marathi") || normalized.includes("मराठी")) {
    return "Marathi";
  }
  if (normalized.includes("tamil") || normalized.includes("தமிழ்") || /[\u0B80-\u0BFF]/.test(text)) {
    return "Tamil";
  }
  if (normalized.includes("telugu") || normalized.includes("తెలుగు") || /[\u0C00-\u0C7F]/.test(text)) {
    return "Telugu";
  }
  if (normalized.includes("bengali") || normalized.includes("বাংলা") || /[\u0980-\u09FF]/.test(text)) {
    return "Bengali";
  }
  
  return currentLang;
}

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  "Hindi": "हिंदी में जवाब दें। (Answer in Hindi language only) ",
  "Marathi": "मराठीत उत्तर द्या। (Answer in Marathi language only) ",
  "Tamil": "தமிழில் பதில் சொல்லுங்கள். (Answer in Tamil language only) ",
  "Telugu": "తెలుగులో సమాధానं చెప్పండి. (Answer in Telugu language only) ",
  "Bengali": "বাংলায় উত্তর দিন। (Answer in Bengali language only) ",
  "English": ""
};

/**
 * Send a text message to the local DeepSeek-R1 / Llama3.1 interview assistant.
 * Routes through /tutor/chat/simple on the FastAPI backend (Ollama).
 */
export async function sendOpenSourceChat(
  history: ChatTurn[],
  userMessage: string,
  problemTitle: string,
  problemDescription: string,
  language: string,
  currentCode: string,
  useThinking: boolean = false,
): Promise<string> {
  // Format conversation history as a plain string context
  const historyText = history
    .slice(-6) // last 3 turns to save tokens
    .map((m) => `${m.role === "user" ? "Candidate" : "Interviewer"}: ${m.text}`)
    .join("\n");

  const fullPrompt = historyText
    ? `${historyText}\nCandidate: ${userMessage}`
    : `Candidate: ${userMessage}`;

  const detectedLanguage = detectLanguage(fullPrompt, "English");
  const langPrompt = LANGUAGE_INSTRUCTIONS[detectedLanguage] || "";

  // Build a rich context prompt for the coding interviewer
  const systemContext = `${langPrompt}You are a professional AI coding interviewer.
The candidate is working on: "${problemTitle}"
Problem: ${problemDescription}
Language: ${language}
Current Code:
\`\`\`${language}
${currentCode.slice(0, 3000)}
\`\`\`

Guide them with hints, ask clarifying questions, evaluate their approach.
Keep responses concise (2-4 sentences). Be encouraging but rigorous.`;

  const res = await fetch(`${API_BASE}/tutor/chat/simple`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: fullPrompt,
      system: systemContext,
      task: useThinking ? "code" : "tutor", // "code" = deepseek-r1 (reasoning), "tutor" = llama3.1 (fast, offline)
      mode: "Interview Mode",
      language: detectedLanguage,
      user_id: "devinterview-session",
    }),
  });

  if (!res.ok) {
    throw new Error(`Backend chat error: ${res.status}`);
  }

  const data = await res.json();
  return data.response || data.text || "No response from local model.";
}

/**
 * Use Piper TTS via the backend to speak text locally.
 * Returns an audio URL or null if TTS is unavailable.
 */
export async function speakOpenSource(text: string): Promise<string | null> {
  try {
    const detectedLanguage = detectLanguage(text, "English");
    const res = await fetch(`${API_BASE}/tutor/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text.slice(0, 500),
        language: detectedLanguage
      }), // Piper works best with short segments
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.audio_url ? `${API_BASE}${data.audio_url}` : null;
  } catch {
    return null;
  }
}

/** Check if the local backend (Ollama + Piper) is reachable. */
export async function isOpenSourceBackendReady(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health/status`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
