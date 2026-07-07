"""
GyaanSetu AI — RAG Router
Ingest PDFs/notes into ChromaDB and query them with Llama 3.1 context.
"""

import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from services import rag_service, ocr_service, ollama_service

router = APIRouter()
logger = logging.getLogger("gyaansetu.rag")


class QueryRequest(BaseModel):
    question: str
    user_id: str = "demo-user-aarav"
    n_results: int = 5


class IngestTextRequest(BaseModel):
    text: str
    source_name: str = "manual_notes"
    user_id: str = "demo-user-aarav"


@router.post("/ingest-file")
async def ingest_file(
    file: UploadFile = File(...),
    user_id: str = "demo-user-aarav",
):
    """Ingest a PDF or text file into the user's ChromaDB collection."""
    file_bytes = await file.read()
    filename = file.filename or "document"

    if filename.lower().endswith(".pdf"):
        extract_result = await ocr_service.extract_from_pdf(file_bytes)
        text = extract_result.get("text", "")
    else:
        text = file_bytes.decode("utf-8", errors="ignore")

    if not text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from file")

    result = await rag_service.ingest_text(user_id, text, source_name=filename)
    return {**result, "filename": filename, "source": "file_upload"}


@router.post("/ingest-text")
async def ingest_text(req: IngestTextRequest):
    """Ingest raw text directly into the user's ChromaDB collection."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Empty text")

    result = await rag_service.ingest_text(req.user_id, req.text, req.source_name)
    return result


@router.post("/query")
async def query(req: QueryRequest):
    """
    Semantic search over user's notes → Ollama context-aware answer.
    """
    rag_result = await rag_service.query(req.user_id, req.question, req.n_results)

    if not rag_result["found"]:
        # No relevant notes found — fall back to plain Ollama
        answer = await ollama_service.complete(
            prompt=req.question,
            task="tutor",
        )
        return {
            "answer": answer,
            "context_used": False,
            "sources": [],
            "note": "No relevant notes found. Answered from general knowledge.",
        }

    context = rag_result["context"]
    augmented_prompt = (
        f"You are a personal AI tutor. Use the student's own notes as primary reference.\n\n"
        f"STUDENT NOTES:\n{context}\n\n"
        f"QUESTION: {req.question}\n\n"
        f"Give a thorough answer grounded in the student's notes. "
        f"Quote specific parts if helpful."
    )

    answer = await ollama_service.complete(
        prompt=augmented_prompt,
        task="tutor",
        max_tokens=1500,
    )

    return {
        "answer": answer,
        "context_used": True,
        "sources": rag_result["sources"],
        "chunks_retrieved": rag_result.get("context", "").count("---") + 1,
    }


@router.get("/stats/{user_id}")
async def get_stats(user_id: str):
    """Returns how many chunks are stored for a user."""
    return await rag_service.get_stats(user_id)


@router.delete("/clear/{user_id}")
async def clear(user_id: str):
    """Delete all stored notes for a user."""
    return await rag_service.clear_collection(user_id)
