/**
 * GyaanSetu AI — DevInterview Offline Interview Service
 * Replaces cloud Gemini with local: Whisper → DeepSeek R1 → Piper TTS
 * Connect to the FastAPI backend running on port 8000.
 */

const API_BASE = "http://localhost:8000";

export interface InterviewSession {
  sessionId: string;
  interviewType: string;
  language: string;
  currentQuestion: string;
  audioUrl: string | null;
  turn: number;
}

export interface InterviewResponse {
  transcript: string;
  feedback: string;
  nextQuestion: string;
  audioUrl: string | null;
  turn: number;
  runningTechScore: number;
}

export interface InterviewReport {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  confidenceScore: number;
  strengths: string[];
  improvementAreas: string[];
  verdict: string;
  summary: string;
  reportId: string;
}

export class OfflineInterviewService {
  private sessionId: string | null = null;

  /**
   * Start a new offline interview session.
   * Backend: POST /interview/start → DeepSeek R1 generates first question.
   */
  async startSession(
    interviewType: string,
    userId = "demo-user-aarav",
    language = "English"
  ): Promise<InterviewSession> {
    const res = await fetch(`${API_BASE}/interview/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interview_type: interviewType,
        user_id: userId,
        language,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to start interview session: ${res.status}`);
    }

    const data = await res.json();
    this.sessionId = data.session_id;

    return {
      sessionId: data.session_id,
      interviewType,
      language,
      currentQuestion: data.question,
      audioUrl: data.audio_url
        ? `${API_BASE}${data.audio_url}`
        : null,
      turn: 0,
    };
  }

  /**
   * Send candidate audio answer → Whisper STT → DeepSeek R1 eval → Piper TTS.
   */
  async sendAnswer(audioBlob: Blob): Promise<InterviewResponse> {
    if (!this.sessionId) {
      throw new Error("No active session. Call startSession() first.");
    }

    const form = new FormData();
    form.append("audio", audioBlob, "answer.wav");

    const res = await fetch(
      `${API_BASE}/interview/respond?session_id=${this.sessionId}`,
      { method: "POST", body: form }
    );

    if (!res.ok) {
      throw new Error(`Interview respond failed: ${res.status}`);
    }

    const data = await res.json();

    return {
      transcript: data.transcript,
      feedback: data.feedback,
      nextQuestion: data.next_question,
      audioUrl: data.audio_url ? `${API_BASE}${data.audio_url}` : null,
      turn: data.turn,
      runningTechScore: data.running_tech_score,
    };
  }

  /**
   * End session and get final scored report.
   */
  async endSession(): Promise<InterviewReport> {
    if (!this.sessionId) {
      throw new Error("No active session.");
    }

    const res = await fetch(`${API_BASE}/interview/end/${this.sessionId}`, {
      method: "POST",
    });

    if (!res.ok) {
      throw new Error(`End session failed: ${res.status}`);
    }

    const data = await res.json();
    this.sessionId = null;

    return {
      overallScore: data.overall_score,
      technicalScore: data.technical_score,
      communicationScore: data.communication_score,
      confidenceScore: data.confidence_score,
      strengths: data.strengths ?? [],
      improvementAreas: data.improvement_areas ?? [],
      verdict: data.verdict,
      summary: data.summary,
      reportId: data.report_id,
    };
  }

  /**
   * Fetch a previously saved report by ID.
   */
  async getReport(reportId: string): Promise<InterviewReport> {
    const res = await fetch(`${API_BASE}/interview/report/${reportId}`);
    if (!res.ok) throw new Error(`Report not found: ${res.status}`);
    const data = await res.json();
    return {
      overallScore: data.overall_score,
      technicalScore: data.technical_score,
      communicationScore: data.comm_score,
      confidenceScore: data.confidence_score,
      strengths: [],
      improvementAreas: JSON.parse(data.areas_json ?? "[]"),
      verdict: "See Report",
      summary: "",
      reportId: data.id,
    };
  }

  /** Check if Ollama + Whisper backend is reachable. */
  async isBackendReady(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/ping`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  get activeSessionId() {
    return this.sessionId;
  }
}

// Singleton export
export const offlineInterviewService = new OfflineInterviewService();
