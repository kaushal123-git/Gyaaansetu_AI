"""
GyaanSetu AI — Mistakes Analyzer Router
AI-powered error categorization, weakness heatmaps, and remedial quiz generation.
"""

import json, uuid, logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from services import ollama_service, whisper_service, ocr_service
from db.database import get_connection

router = APIRouter()
logger = logging.getLogger("gyaansetu.mistakes")

MISTAKE_SYSTEM = """
You are an expert educational diagnostician.
Analyze the student's mistake or error and return a JSON object:
{
  "topic": "Specific topic name",
  "type": "conceptual|slip|calculation|memory|time-management",
  "explanation": "Clear explanation of what went wrong (2-3 sentences)",
  "correction": "The correct approach or answer",
  "sample_question": "A practice question to test this concept",
  "options": ["Option A", "Option B", "Option C"],
  "correct_idx": 0,
  "difficulty": "Easy|Medium|Hard",
  "related_topics": ["topic1", "topic2"]
}
Respond with ONLY the JSON.
"""

QUIZ_SYSTEM = """
You are an adaptive quiz generator.
Generate 3 multiple-choice questions to test a student's weak topic.
Return JSON: {
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct_idx": 0,
      "explanation": "Why this is correct"
    }
  ]
}
"""


class TextMistakeRequest(BaseModel):
    text: str
    user_id: str = "demo-user-aarav"
    language: str = "English"


class QuizRequest(BaseModel):
    topic: str
    difficulty: str = "Medium"
    user_id: str = "demo-user-aarav"
    language: str = "English"


@router.post("/analyze-text")
async def analyze_text_mistake(req: TextMistakeRequest):
    """Analyze a student's written mistake description using Ollama."""
    raw = await ollama_service.complete(
        prompt=f"Student's mistake or error log:\n\n{req.text}",
        task="mistakes",
        system=MISTAKE_SYSTEM,
        language=req.language,
    )

    mistake = _parse_json(raw)
    if not mistake:
        mistake = _fallback_mistake(req.text)

    # Save to SQLite
    mistake_id = await _save_mistake(req.user_id, mistake)
    mistake["id"] = mistake_id
    return mistake


@router.post("/analyze-voice")
async def analyze_voice_mistake(
    audio: UploadFile = File(...),
    user_id: str = "demo-user-aarav",
    language: str = "English",
):
    """Transcribe voice log then analyze as a mistake."""
    audio_bytes = await audio.read()
    stt = await whisper_service.transcribe_bytes(audio_bytes, language)
    transcript = stt.get("text", "").strip()

    if not transcript:
        raise HTTPException(status_code=422, detail="Could not transcribe audio")

    req = TextMistakeRequest(text=transcript, user_id=user_id, language=language)
    result = await analyze_text_mistake(req)
    result["transcript"] = transcript
    return result


@router.post("/analyze-image")
async def analyze_image_mistake(
    image: UploadFile = File(...),
    user_id: str = "demo-user-aarav",
    language: str = "English",
):
    """OCR an uploaded mistake image then analyze it."""
    image_bytes = await image.read()
    ocr = await ocr_service.extract_text(image_bytes, image.filename or "mistake.jpg")
    text = ocr.get("text", "").strip()

    if not text:
        raise HTTPException(status_code=422, detail="Could not extract text from image")

    req = TextMistakeRequest(text=text, user_id=user_id, language=language)
    result = await analyze_text_mistake(req)
    result["ocr_text"] = text
    return result


@router.get("/heatmap/{user_id}")
async def get_heatmap(user_id: str):
    """
    Returns topic-level frequency aggregation for weakness heatmap rendering.
    """
    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT topic, type, SUM(frequency) as total_freq
               FROM mistakes WHERE user_id=?
               GROUP BY topic, type
               ORDER BY total_freq DESC""",
            (user_id,)
        ).fetchall()

        topics = []
        for row in rows:
            topics.append({
                "topic": row["topic"],
                "type": row["type"],
                "frequency": row["total_freq"],
                "error_index": min(100, row["total_freq"] * 15),
            })

        # AI-generated insight about top weaknesses
        if topics:
            top3 = [t["topic"] for t in topics[:3]]
            insight = await ollama_service.complete(
                prompt=(
                    f"A student has the most mistakes in: {', '.join(top3)}. "
                    f"Give a 2-sentence personalized study recommendation to fix these gaps."
                ),
                task="fast",
                max_tokens=150,
            )
        else:
            insight = "No mistakes logged yet. Start logging your errors to get AI insights!"

        return {"topics": topics, "ai_insight": insight}
    finally:
        conn.close()


@router.post("/quiz-generate")
async def generate_quiz(req: QuizRequest):
    """Generate 3 remedial MCQ questions for a weak topic using Ollama."""
    raw = await ollama_service.complete(
        prompt=(
            f"Generate 3 {req.difficulty} level MCQs for: {req.topic}\n"
            f"Language: {req.language}\n"
            f"Focus on common student errors in this topic."
        ),
        task="mistakes",
        system=QUIZ_SYSTEM,
        language=req.language,
        max_tokens=1000,
    )

    quiz = _parse_json(raw)
    if not quiz:
        quiz = {
            "questions": [
                {
                    "question": f"What is the most common mistake in {req.topic}?",
                    "options": ["Misapplying the formula", "Correct approach", "Skipping steps", "Wrong units"],
                    "correct_idx": 0,
                    "explanation": f"Understanding {req.topic} requires careful attention to each step.",
                }
            ]
        }

    return {**quiz, "topic": req.topic, "difficulty": req.difficulty}


@router.post("/practice-correct/{mistake_id}")
async def mark_practice_correct(mistake_id: str, user_id: str = "demo-user-aarav"):
    """Reduce the frequency of a mistake after successful practice."""
    conn = get_connection()
    try:
        conn.execute(
            """UPDATE mistakes
               SET frequency = MAX(0, frequency - 1)
               WHERE id=? AND user_id=?""",
            (mistake_id, user_id)
        )
        conn.commit()
        return {"success": True, "message": "Mistake frequency reduced. Keep practicing!"}
    finally:
        conn.close()


async def _save_mistake(user_id: str, mistake: dict) -> str:
    """Insert a new mistake into SQLite."""
    conn = get_connection()
    mistake_id = str(uuid.uuid4())
    try:
        conn.execute(
            """INSERT INTO mistakes
               (id, user_id, topic, frequency, type, explanation, correction,
                sample_question, options_json, correct_idx)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                mistake_id, user_id,
                mistake.get("topic", "Unknown Topic"),
                1,
                mistake.get("type", "conceptual"),
                mistake.get("explanation", ""),
                mistake.get("correction", ""),
                mistake.get("sample_question", ""),
                json.dumps(mistake.get("options", [])),
                mistake.get("correct_idx", 0),
            )
        )
        conn.commit()
    finally:
        conn.close()
    return mistake_id


def _parse_json(raw: str) -> dict | None:
    import re
    try:
        return json.loads(raw)
    except Exception:
        pass
    match = re.search(r'\{[\s\S]+\}', raw)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return None


def _fallback_mistake(text: str) -> dict:
    return {
        "topic": "General Concept",
        "type": "conceptual",
        "explanation": f"Error logged: {text[:100]}",
        "correction": "Review the fundamental concepts and retry systematically.",
        "sample_question": "Can you explain the concept in your own words?",
        "options": ["Yes, clearly", "Partially", "Not yet"],
        "correct_idx": 0,
        "difficulty": "Medium",
        "related_topics": [],
    }
