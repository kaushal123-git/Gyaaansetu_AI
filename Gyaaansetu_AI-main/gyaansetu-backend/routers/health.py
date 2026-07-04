"""
GyaanSetu AI — Health Monitor Router
Focus Health Index calculation, wellness metrics, and wearable CSV analysis.
"""

import json, uuid, logging, datetime
from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from services import ollama_service
from db.database import get_connection

router = APIRouter()
logger = logging.getLogger("gyaansetu.health")


class HealthSyncRequest(BaseModel):
    user_id: str = "demo-user-aarav"
    screen_hours: float = 0
    water_cups: int = 0
    sleep_hours: float = 0
    stress_level: str = "Low"


def _compute_focus_index(screen_hours: float, water_cups: int, sleep_hours: float, stress: str) -> int:
    """Compute Focus Health Index (0-100) from wellness metrics."""
    score = 100

    # Screen time penalty (ideal ≤ 6h)
    if screen_hours > 8:    score -= 25
    elif screen_hours > 6:  score -= 15
    elif screen_hours > 4:  score -= 5

    # Hydration reward (target 8 cups)
    if water_cups < 3:      score -= 20
    elif water_cups < 5:    score -= 10
    elif water_cups >= 8:   score += 5

    # Sleep penalty (ideal 7-9h)
    if sleep_hours < 5:     score -= 25
    elif sleep_hours < 6:   score -= 15
    elif sleep_hours < 7:   score -= 8
    elif sleep_hours > 9:   score -= 5

    # Stress penalty
    stress_penalties = {"Low": 0, "Calm": 0, "Moderate": -10, "Medium": -10, "High": -20, "Severe": -30}
    score += stress_penalties.get(stress, 0)

    return max(0, min(100, score))


@router.post("/sync")
async def sync_health(req: HealthSyncRequest):
    """Save daily health metrics and compute Focus Health Index."""
    focus_idx = _compute_focus_index(req.screen_hours, req.water_cups, req.sleep_hours, req.stress_level)
    today = datetime.date.today().isoformat()

    conn = get_connection()
    try:
        # Upsert today's record
        existing = conn.execute(
            "SELECT id FROM health_metrics WHERE user_id=? AND date=?",
            (req.user_id, today)
        ).fetchone()

        if existing:
            conn.execute(
                """UPDATE health_metrics
                   SET screen_hours=?, water_cups=?, sleep_hours=?, stress_level=?, focus_index=?
                   WHERE user_id=? AND date=?""",
                (req.screen_hours, req.water_cups, req.sleep_hours,
                 req.stress_level, focus_idx, req.user_id, today)
            )
        else:
            conn.execute(
                """INSERT INTO health_metrics
                   (id, user_id, date, screen_hours, water_cups, sleep_hours, stress_level, focus_index)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), req.user_id, today,
                 req.screen_hours, req.water_cups, req.sleep_hours,
                 req.stress_level, focus_idx)
            )
        conn.commit()
    finally:
        conn.close()

    return {
        "focus_index": focus_idx,
        "date": today,
        "breakdown": {
            "screen_time": f"{'⚠️' if req.screen_hours > 6 else '✅'} {req.screen_hours}h",
            "hydration": f"{'✅' if req.water_cups >= 8 else '⚠️'} {req.water_cups}/8 cups",
            "sleep": f"{'✅' if 7 <= req.sleep_hours <= 9 else '⚠️'} {req.sleep_hours}h",
            "stress": req.stress_level,
        }
    }


@router.get("/index/{user_id}")
async def get_health_index(user_id: str):
    """Get the most recent Focus Health Index for a user."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM health_metrics WHERE user_id=? ORDER BY date DESC LIMIT 1",
            (user_id,)
        ).fetchone()
        if not row:
            return {"focus_index": 100, "date": None, "message": "No data yet — great start!"}
        return dict(row)
    finally:
        conn.close()


@router.get("/history/{user_id}")
async def get_history(user_id: str, days: int = 7):
    """Get last N days of health metrics."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM health_metrics WHERE user_id=? ORDER BY date DESC LIMIT ?",
            (user_id, days)
        ).fetchall()
        return {"metrics": [dict(r) for r in rows]}
    finally:
        conn.close()


@router.post("/analyze-wearable")
async def analyze_wearable(
    file: UploadFile = File(...),
    user_id: str = "demo-user-aarav",
):
    """Parse a wearable CSV export and generate AI health insights."""
    csv_bytes = await file.read()
    csv_text = csv_bytes.decode("utf-8", errors="ignore")[:3000]

    prompt = (
        f"Analyze this wearable fitness tracker data export for a student:\n\n"
        f"{csv_text}\n\n"
        f"Provide: 1) Key health insights, 2) Sleep quality assessment, "
        f"3) Activity recommendations, 4) Focus optimization tips. "
        f"Keep it practical and student-focused."
    )

    analysis = await ollama_service.complete(
        prompt=prompt,
        task="fast",
        max_tokens=800,
    )

    return {"analysis": analysis, "filename": file.filename}


@router.post("/breathing-session")
async def log_breathing(user_id: str = "demo-user-aarav", duration_seconds: int = 60):
    """Log a completed breathing exercise session."""
    conn = get_connection()
    today = datetime.date.today().isoformat()
    try:
        # Reduce stress score on breathing session completion
        row = conn.execute(
            "SELECT id, stress_level, focus_index FROM health_metrics WHERE user_id=? AND date=?",
            (user_id, today)
        ).fetchone()
        if row:
            new_focus = min(100, (row["focus_index"] or 80) + 5)
            conn.execute(
                "UPDATE health_metrics SET focus_index=?, stress_level=? WHERE id=?",
                (new_focus, "Calm", row["id"])
            )
            conn.commit()
            return {"focus_index": new_focus, "stress_level": "Calm",
                    "message": f"Breathing session logged. +5 Focus Index!"}
        return {"message": "No health record for today. Sync first."}
    finally:
        conn.close()


class MoodAnalysisRequest(BaseModel):
    user_id: str = "demo-user-aarav"
    mood_emoji: str
    feeling_text: str


class CompanionChatRequest(BaseModel):
    user_id: str = "demo-user-aarav"
    message: str
    history: list[dict] = []


@router.post("/analyze-mood")
async def analyze_mood(req: MoodAnalysisRequest):
    """Analyze student mood feeling text using Llama 3.1 (8B) and suggest updates."""
    prompt = (
        f"The student checked in feeling {req.mood_emoji}. They wrote this description of their current state:\n"
        f"\"{req.feeling_text}\"\n\n"
        f"Act as a warm, highly empathetic student wellness advisor. "
        f"Provide a brief 3-4 sentence response: 1) Acknowledge and validate their feelings, "
        f"2) Provide a gentle encouraging affirmation, 3) Recommend a specific quick breathing or focus action. "
        f"Respond in a supportive tone. Keep it under 150 words."
    )
    
    analysis = await ollama_service.complete(
        prompt=prompt,
        task="tutor",  # Map to llama3.1:8b
        max_tokens=250,
    )
    
    # Determine stress level change suggestion
    stress_map = {"😊": "Low", "😐": "Moderate", "😔": "Moderate", "😠": "High", "😴": "Moderate"}
    suggested_stress = stress_map.get(req.mood_emoji, "Moderate")
    
    lower_feeling = req.feeling_text.lower()
    if any(word in lower_feeling for word in ["stressed", "anxious", "overwhelmed", "exam stress", "pressure", "panic"]):
        suggested_stress = "High"
    elif any(word in lower_feeling for word in ["depressed", "sad", "unmotivated", "exhausted", "burnout"]):
        suggested_stress = "Moderate"

    return {
        "analysis": analysis,
        "suggested_stress": suggested_stress
    }


@router.post("/chat-companion")
async def chat_companion(req: CompanionChatRequest):
    """Chat with Asha, the empathetic wellness AI companion."""
    history_context = ""
    for h in req.history[-6:]:
        role = "User" if h.get("role") == "user" else "Asha"
        history_context += f"{role}: {h.get('content')}\n"

    prompt = (
        f"You are Asha, a warm, highly empathetic, cute mental wellness AI companion for students. "
        f"Your goal is to listen, provide gentle comfort, support stress reduction, and keep conversation engaging. "
        f"Always keep your response under 80 words. Be friendly, kind, and supportive.\n\n"
        f"Recent Conversation History:\n{history_context}"
        f"User: {req.message}\n"
        f"Asha:"
    )

    response = await ollama_service.complete(
        prompt=prompt,
        task="tutor",  # Map to llama3.1:8b
        max_tokens=150,
    )

    return {"response": response}

