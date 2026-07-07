"""
GyaanSetu AI — AI Tutor Router
Handles text chat (SSE streaming), voice chat, and model listing.
"""

import json, logging
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services import ollama_service, whisper_service, piper_service, rag_service

router = APIRouter()
logger = logging.getLogger("gyaansetu.tutor")


class ChatRequest(BaseModel):
    message: str
    language: str = "English"
    mode: str = "Deep Learning"
    user_id: str = "demo-user-aarav"
    use_rag: bool = False


class ChatRequestSimple(BaseModel):
    message: str
    system: str | None = None
    task: str = "tutor"
    language: str = "English"
    mode: str = "Deep Learning"
    user_id: str = "demo-user-aarav"


class VoiceRequest(BaseModel):
    language: str = "English"
    mode: str = "Deep Learning"
    user_id: str = "demo-user-aarav"
    use_rag: bool = False


class TTSRequest(BaseModel):
    text: str
    language: str = "English"


# ── Text to Speech (Local Piper TTS) ─────────────────────────────────────────
@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    """
    Synthesize text → local Piper voice URL.
    """
    try:
        tts_result = await piper_service.synthesize(req.text, req.language)
        if tts_result.get("success"):
            return {"audio_url": tts_result.get("audio_url")}
        else:
            raise HTTPException(status_code=500, detail=tts_result.get("error", "TTS failed"))
    except Exception as e:
        logger.error(f"TTS endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Non-Streaming Text Chat (Simple JSON response) ───────────────────────────
@router.post("/chat/simple")
async def chat_simple(req: ChatRequestSimple):
    """
    Non-streaming AI response (plain JSON) for simpler integrations.
    """
    try:
        response_text = await ollama_service.complete(
            prompt=req.message,
            task=req.task,
            system=req.system,
            mode=req.mode,
            language=req.language,
        )
        return {"response": response_text}
    except Exception as e:
        logger.error(f"Chat simple error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Text Chat (SSE streaming) ────────────────────────────────────────────────
@router.post("/chat")
async def chat(req: ChatRequest):
    """
    Stream AI tutor response token by token using Server-Sent Events.
    Optionally prepends RAG context from the user's ChromaDB collection.
    """
    prompt = req.message

    # RAG augmentation: prepend retrieved notes context
    if req.use_rag:
        rag_result = await rag_service.query(req.user_id, req.message)
        if rag_result["found"] and rag_result["context"]:
            context_block = rag_result["context"]
            sources = ", ".join(rag_result["sources"])
            prompt = (
                f"Use the following student notes as context to answer the question.\n\n"
                f"CONTEXT (from: {sources}):\n{context_block}\n\n"
                f"QUESTION: {req.message}\n\n"
                f"Answer based on the context above. If context is insufficient, use your general knowledge."
            )

    async def event_stream():
        try:
            async for token in ollama_service.stream_chat(
                prompt=prompt,
                task="tutor",
                mode=req.mode,
                language=req.language,
            ):
                payload = json.dumps({"token": token, "done": False})
                yield f"data: {payload}\n\n"
            yield f"data: {json.dumps({'token': '', 'done': True})}\n\n"
        except Exception as e:
            logger.error(f"Chat stream error: {e}")
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Voice Input → Text Chat (Whisper STT → Ollama → Piper TTS) ──────────────
@router.post("/voice")
async def voice_chat(
    audio: UploadFile = File(...),
    language: str = "English",
    mode: str = "Deep Learning",
    user_id: str = "demo-user-aarav",
    use_rag: bool = False,
):
    """
    Full voice pipeline: audio → Whisper STT → Ollama → Piper TTS → audio URL
    """
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Step 1: Transcribe
    stt_result = await whisper_service.transcribe_bytes(audio_bytes, language)
    user_text = stt_result.get("text", "").strip()
    if not user_text:
        return {"transcript": "", "response": "", "audio_url": None,
                "error": "Could not transcribe audio — please speak clearly"}

    logger.info(f"Transcribed [{language}]: {user_text[:80]}…")

    # Step 2: Get AI response
    prompt = user_text
    if use_rag:
        rag_result = await rag_service.query(user_id, user_text)
        if rag_result["found"]:
            prompt = (
                f"Context: {rag_result['context']}\n\n"
                f"Question: {user_text}\n\nAnswer concisely for voice response."
            )

    response_text = await ollama_service.complete(
        prompt=prompt,
        task="tutor",
        mode=mode,
        language=language,
        max_tokens=512,  # Keep voice responses concise
    )

    # Step 3: Synthesize speech
    tts_result = await piper_service.synthesize(response_text, language)

    return {
        "transcript": user_text,
        "response": response_text,
        "audio_url": tts_result.get("audio_url"),
        "tts_success": tts_result.get("success", False),
        "stt_confidence": stt_result.get("confidence", 0),
    }


# ── OCR Image → Solve ────────────────────────────────────────────────────────
@router.post("/solve-image")
async def solve_image(
    image: UploadFile = File(...),
    language: str = "English",
    mode: str = "Exam Preparation",
    user_id: str = "demo-user-aarav",
):
    """Extract text from an uploaded image then solve it using Ollama."""
    from services import ocr_service

    image_bytes = await image.read()
    ocr_result = await ocr_service.extract_text(image_bytes, image.filename or "image.jpg")
    extracted = ocr_result.get("text", "").strip()

    if not extracted:
        raise HTTPException(status_code=422, detail="Could not extract text from image")

    prompt = (
        f"A student uploaded an image containing the following text/problem:\n\n"
        f"{extracted}\n\n"
        f"Please solve and explain this thoroughly."
    )

    response = await ollama_service.complete(
        prompt=prompt,
        task="tutor",
        mode=mode,
        language=language,
    )

    return {
        "extracted_text": extracted,
        "ocr_confidence": ocr_result.get("confidence", 0),
        "solution": response,
    }


# ── Available Models ──────────────────────────────────────────────────────────
@router.get("/models")
async def get_models():
    """Returns list of locally available Ollama models."""
    models = await ollama_service.list_models()
    return {"models": models, "default": "llama3.1:8b"}


# ── Ollama Health ─────────────────────────────────────────────────────────────
@router.get("/status")
async def tutor_status():
    healthy = await ollama_service.check_ollama_health()
    return {"ollama_online": healthy, "status": "ready" if healthy else "offline"}
