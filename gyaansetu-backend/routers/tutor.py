"""
GyaanSetu AI — AI Tutor Router
Handles text chat (SSE streaming), voice chat, and model listing.
"""

import json, logging
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services import ollama_service, whisper_service, piper_service, rag_service
from services.orchestrator import GyaanSetuOrchestrator

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
    Uses GyaanSetuOrchestrator to perform CAG + KAG + RAG context fusion and route requests.
    """
    # 1. Intent Detection
    intent_info = GyaanSetuOrchestrator.detect_intent(req.message)
    
    # 2. Query Rewriter
    rewritten = GyaanSetuOrchestrator.rewrite_query(req.message, intent_info)
    
    # 3. Retrieval
    cag_context = GyaanSetuOrchestrator.retrieve_cag(req.user_id)
    kag_context = GyaanSetuOrchestrator.retrieve_kag(req.message)
    
    if req.use_rag:
        rag_context = await GyaanSetuOrchestrator.retrieve_rag(req.user_id, req.message)
    else:
        rag_context = {"chunks_retrieved": 0, "sources": [], "context": "", "vector_db": "ChromaDB", "active": False}
        
    # 4. Context Fusion
    fused_prompt, fusion_stats = GyaanSetuOrchestrator.fuse_context(
        query=rewritten,
        cag=cag_context,
        kag=kag_context,
        rag=rag_context
    )

    async def event_stream():
        try:
            async for token in GyaanSetuOrchestrator.route_and_generate(
                fused_prompt=fused_prompt,
                task="tutor",
                mode=req.mode,
                language=req.language,
                user_id=req.user_id
            ):
                if token.startswith("__TRACE_JSON_METADATA__"):
                    trace_json = token.replace("__TRACE_JSON_METADATA__", "")
                    try:
                        trace_data = json.loads(trace_json)
                        trace_data["retrieval"]["cag"] = {
                            "history_context_pulled": cag_context["history_loaded"],
                            "previous_mistakes_count": len(cag_context["recent_mistakes"]),
                            "profile_matched": True
                        }
                        trace_data["retrieval"]["kag"] = {
                            "neo4j_concept": kag_context["matched_concept"],
                            "prerequisites": kag_context["prerequisites"],
                            "related_concepts": kag_context["related_concepts"],
                            "hierarchy": kag_context["hierarchy"]
                        }
                        trace_data["retrieval"]["rag"] = {
                            "chunks_retrieved": rag_context["chunks_retrieved"],
                            "sources": rag_context["sources"],
                            "vector_db": rag_context["vector_db"]
                        }
                        trace_data["context_fusion"] = fusion_stats
                        yield f"data: {json.dumps({'token': '', 'done': True, 'trace': trace_data})}\n\n"
                    except Exception as e:
                        logger.error(f"Error yielding trace: {e}")
                        yield f"data: {json.dumps({'token': '', 'done': True})}\n\n"
                else:
                    payload = json.dumps({"token": token, "done": False})
                    yield f"data: {payload}\n\n"
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
    Full voice pipeline: audio → Whisper STT → Orchestrator → Piper TTS → audio URL
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

    # Step 2: Get AI response via Orchestrator
    intent_info = GyaanSetuOrchestrator.detect_intent(user_text)
    rewritten = GyaanSetuOrchestrator.rewrite_query(user_text, intent_info)
    cag_context = GyaanSetuOrchestrator.retrieve_cag(user_id)
    kag_context = GyaanSetuOrchestrator.retrieve_kag(user_text)
    
    if use_rag:
        rag_context = await GyaanSetuOrchestrator.retrieve_rag(user_id, user_text)
    else:
        rag_context = {"chunks_retrieved": 0, "sources": [], "context": "", "vector_db": "ChromaDB", "active": False}
        
    fused_prompt, fusion_stats = GyaanSetuOrchestrator.fuse_context(
        query=rewritten,
        cag=cag_context,
        kag=kag_context,
        rag=rag_context
    )

    response_text = ""
    trace_data = None
    async for token in GyaanSetuOrchestrator.route_and_generate(
        fused_prompt=fused_prompt,
        task="tutor",
        mode=mode,
        language=language,
        user_id=user_id
    ):
        if token.startswith("__TRACE_JSON_METADATA__"):
            trace_json = token.replace("__TRACE_JSON_METADATA__", "")
            try:
                trace_data = json.loads(trace_json)
                trace_data["retrieval"]["cag"] = {
                    "history_context_pulled": cag_context["history_loaded"],
                    "previous_mistakes_count": len(cag_context["recent_mistakes"]),
                    "profile_matched": True
                }
                trace_data["retrieval"]["kag"] = {
                    "neo4j_concept": kag_context["matched_concept"],
                    "prerequisites": kag_context["prerequisites"],
                    "related_concepts": kag_context["related_concepts"],
                    "hierarchy": kag_context["hierarchy"]
                }
                trace_data["retrieval"]["rag"] = {
                    "chunks_retrieved": rag_context["chunks_retrieved"],
                    "sources": rag_context["sources"],
                    "vector_db": rag_context["vector_db"]
                }
                trace_data["context_fusion"] = fusion_stats
            except Exception:
                pass
        else:
            response_text += token

    # Step 3: Synthesize speech
    tts_result = await piper_service.synthesize(response_text, language)

    return {
        "transcript": user_text,
        "response": response_text,
        "audio_url": tts_result.get("audio_url"),
        "tts_success": tts_result.get("success", False),
        "stt_confidence": stt_result.get("confidence", 0),
        "trace": trace_data
    }


# ── OCR Image → Solve ────────────────────────────────────────────────────────
@router.post("/solve-image")
async def solve_image(
    image: UploadFile = File(...),
    language: str = "English",
    mode: str = "Exam Preparation",
    user_id: str = "demo-user-aarav",
):
    """Extract text from an uploaded image then solve it using Orchestrator."""
    from services import ocr_service

    image_bytes = await image.read()
    ocr_result = await ocr_service.extract_text(image_bytes, image.filename or "image.jpg")
    extracted = ocr_result.get("text", "").strip()

    if not extracted:
        raise HTTPException(status_code=422, detail="Could not extract text from image")

    # Pipeline processing via Orchestrator
    intent_info = GyaanSetuOrchestrator.detect_intent(extracted)
    rewritten = GyaanSetuOrchestrator.rewrite_query(extracted, intent_info)
    cag_context = GyaanSetuOrchestrator.retrieve_cag(user_id)
    kag_context = GyaanSetuOrchestrator.retrieve_kag(extracted)
    rag_context = {"chunks_retrieved": 0, "sources": [], "context": "", "vector_db": "ChromaDB", "active": False}
    
    fused_prompt, fusion_stats = GyaanSetuOrchestrator.fuse_context(
        query=rewritten,
        cag=cag_context,
        kag=kag_context,
        rag=rag_context
    )

    solution_text = ""
    trace_data = None
    async for token in GyaanSetuOrchestrator.route_and_generate(
        fused_prompt=fused_prompt,
        task="tutor",
        mode=mode,
        language=language,
        user_id=user_id
    ):
        if token.startswith("__TRACE_JSON_METADATA__"):
            trace_json = token.replace("__TRACE_JSON_METADATA__", "")
            try:
                trace_data = json.loads(trace_json)
                trace_data["retrieval"]["cag"] = {
                    "history_context_pulled": cag_context["history_loaded"],
                    "previous_mistakes_count": len(cag_context["recent_mistakes"]),
                    "profile_matched": True
                }
                trace_data["retrieval"]["kag"] = {
                    "neo4j_concept": kag_context["matched_concept"],
                    "prerequisites": kag_context["prerequisites"],
                    "related_concepts": kag_context["related_concepts"],
                    "hierarchy": kag_context["hierarchy"]
                }
                trace_data["retrieval"]["rag"] = {
                    "chunks_retrieved": rag_context["chunks_retrieved"],
                    "sources": rag_context["sources"],
                    "vector_db": rag_context["vector_db"]
                }
                trace_data["context_fusion"] = fusion_stats
            except Exception:
                pass
        else:
            solution_text += token

    return {
        "extracted_text": extracted,
        "ocr_confidence": ocr_result.get("confidence", 0),
        "solution": solution_text,
        "trace": trace_data
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
