"""
GyaanSetu AI — Interview Router
AI mock interview: Whisper STT → DeepSeek R1 → Piper TTS.
Tracks session scores and persists reports to SQLite.
"""

import json, uuid, logging, datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from services import whisper_service, piper_service, ollama_service
from db.database import get_connection

router = APIRouter()
logger = logging.getLogger("gyaansetu.interview")

# In-memory session store (per-process)
_sessions: dict[str, dict] = {}

INTERVIEW_SYSTEM = """
You are an expert technical interviewer at a top tech company.
Conduct a professional, realistic interview for the given role.
Your job:
1. Ask ONE clear technical question based on the interview type.
2. Evaluate the candidate's previous answer (if any).
3. Give brief, constructive feedback (1-2 sentences).
4. Rate the answer: score 0-10 for technical accuracy and communication.
Format: JSON with keys: "question", "feedback", "technical_score", "comm_score", "next_topic"
"""

SCORE_SYSTEM = """
You are a senior interviewer generating a final report.
Return JSON: {
  "overall_score": int (0-100),
  "technical_score": int,
  "communication_score": int,
  "confidence_score": int,
  "strengths": [str],
  "improvement_areas": [str],
  "verdict": "Strong Hire | Hire | Consider | Reject",
  "summary": str
}
"""


class StartRequest(BaseModel):
    interview_type: str = "Full Stack"
    user_id: str = "demo-user-aarav"
    language: str = "English"


@router.post("/start")
async def start_interview(req: StartRequest):
    """Initialize a new interview session and return the first question."""
    session_id = str(uuid.uuid4())

    prompt = (
        f"Start a {req.interview_type} developer interview. "
        f"Introduce yourself briefly and ask the first question. "
        f"The candidate prefers {req.language}."
    )

    response_raw = await ollama_service.complete(
        prompt=prompt,
        task="interview",
        system=INTERVIEW_SYSTEM,
        max_tokens=300,
    )

    # Parse or fall back
    parsed = _try_json(response_raw)
    first_question = parsed.get("question", response_raw) if parsed else response_raw

    # Create session
    _sessions[session_id] = {
        "user_id": req.user_id,
        "interview_type": req.interview_type,
        "language": req.language,
        "transcript": [],
        "technical_scores": [],
        "comm_scores": [],
        "turn": 0,
        "started_at": datetime.datetime.utcnow().isoformat(),
    }

    # Synthesize first question
    tts = await piper_service.synthesize(first_question, req.language)

    return {
        "session_id": session_id,
        "question": first_question,
        "audio_url": tts.get("audio_url"),
        "turn": 0,
    }


@router.post("/respond")
async def respond(
    audio: UploadFile = File(...),
    session_id: str = "",
):
    """Process candidate's audio answer → evaluate → return next question."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found. Call /interview/start first.")

    session = _sessions[session_id]

    # Step 1: Transcribe candidate's voice
    audio_bytes = await audio.read()
    stt = await whisper_service.transcribe_bytes(audio_bytes, session["language"])
    candidate_text = stt.get("text", "").strip()

    if not candidate_text:
        return {"error": "Could not transcribe audio", "audio_url": None}

    session["transcript"].append({"role": "candidate", "text": candidate_text})
    session["turn"] += 1

    # Step 2: Evaluate answer & generate next question
    history = json.dumps(session["transcript"][-6:])  # Last 3 exchanges
    prompt = (
        f"Interview type: {session['interview_type']}\n"
        f"Turn: {session['turn']}\n"
        f"Conversation so far: {history}\n\n"
        f"Evaluate the latest candidate answer and ask the next question."
    )

    raw = await ollama_service.complete(
        prompt=prompt,
        task="interview",
        system=INTERVIEW_SYSTEM,
        max_tokens=400,
    )

    parsed = _try_json(raw)
    if parsed:
        next_q = parsed.get("question", "Tell me more about that.")
        feedback = parsed.get("feedback", "")
        tech_score = parsed.get("technical_score", 5)
        comm_score = parsed.get("comm_score", 5)
    else:
        next_q = raw
        feedback = ""
        tech_score = 5
        comm_score = 5

    session["technical_scores"].append(tech_score)
    session["comm_scores"].append(comm_score)
    session["transcript"].append({"role": "interviewer", "text": next_q})

    # Synthesize next question
    full_response = f"{feedback} {next_q}".strip()
    tts = await piper_service.synthesize(full_response, session["language"])

    return {
        "transcript": candidate_text,
        "feedback": feedback,
        "next_question": next_q,
        "audio_url": tts.get("audio_url"),
        "turn": session["turn"],
        "running_tech_score": round(sum(session["technical_scores"]) / len(session["technical_scores"]), 1),
    }


@router.post("/end/{session_id}")
async def end_interview(session_id: str):
    """Generate final score report and persist to SQLite."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = _sessions[session_id]

    # Generate final evaluation
    transcript_text = json.dumps(session["transcript"])
    raw = await ollama_service.complete(
        prompt=f"Interview type: {session['interview_type']}\nFull transcript: {transcript_text[:3000]}\n\nGenerate final evaluation.",
        task="interview",
        system=SCORE_SYSTEM,
        max_tokens=600,
    )

    report = _try_json(raw) or _build_fallback_report(session)

    # Persist report
    report_id = str(uuid.uuid4())
    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO interview_reports
               (id, user_id, interview_type, technical_score, comm_score, confidence_score,
                overall_score, areas_json, transcript_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                report_id,
                session["user_id"],
                session["interview_type"],
                report.get("technical_score", 70),
                report.get("communication_score", 70),
                report.get("confidence_score", 70),
                report.get("overall_score", 70),
                json.dumps(report.get("improvement_areas", [])),
                json.dumps(session["transcript"]),
            )
        )
        conn.commit()
    finally:
        conn.close()

    # Clean up session
    del _sessions[session_id]

    return {**report, "report_id": report_id, "session_id": session_id}


@router.get("/report/{report_id}")
async def get_report(report_id: str):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM interview_reports WHERE id = ?", (report_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Report not found")
        return dict(row)
    finally:
        conn.close()


@router.get("/history/{user_id}")
async def get_history(user_id: str):
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM interview_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
            (user_id,)
        ).fetchall()
        return {"reports": [dict(r) for r in rows]}
    finally:
        conn.close()


def _try_json(text: str) -> dict | None:
    import re
    try:
        return json.loads(text)
    except Exception:
        pass
    match = re.search(r'\{[\s\S]+\}', text)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return None


def _build_fallback_report(session: dict) -> dict:
    techs = session.get("technical_scores", [5])
    comms = session.get("comm_scores", [5])
    avg_t = round(sum(techs) / len(techs) * 10)
    avg_c = round(sum(comms) / len(comms) * 10)
    return {
        "overall_score": round((avg_t + avg_c) / 2),
        "technical_score": avg_t,
        "communication_score": avg_c,
        "confidence_score": 65,
        "strengths": ["Showed understanding of core concepts"],
        "improvement_areas": ["Practice system design", "Improve code complexity analysis"],
        "verdict": "Consider",
        "summary": f"Completed {session['turn']} turn interview for {session['interview_type']}.",
    }
