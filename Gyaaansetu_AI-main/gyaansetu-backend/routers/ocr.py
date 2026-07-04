"""
GyaanSetu AI — OCR Router
Extract text from images, handwritten notes, and PDFs.
"""

import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from services import ocr_service, ollama_service

router = APIRouter()
logger = logging.getLogger("gyaansetu.ocr")


@router.post("/extract")
async def extract_text(image: UploadFile = File(...)):
    """Extract text from an uploaded image using PaddleOCR."""
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    result = await ocr_service.extract_text(image_bytes, image.filename or "image.jpg")
    return result


@router.post("/extract-pdf")
async def extract_pdf(pdf: UploadFile = File(...)):
    """Extract text from a PDF (text layer + OCR fallback)."""
    pdf_bytes = await pdf.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Empty PDF")

    result = await ocr_service.extract_from_pdf(pdf_bytes)
    return result


@router.post("/solve")
async def solve_ocr(
    image: UploadFile = File(...),
    language: str = "English",
    mode: str = "Exam Preparation",
):
    """OCR image then solve the extracted question with Ollama."""
    image_bytes = await image.read()
    ocr_result = await ocr_service.extract_text(image_bytes, image.filename or "upload.jpg")
    text = ocr_result.get("text", "").strip()

    if not text:
        raise HTTPException(status_code=422, detail="No text extracted from image")

    solution = await ollama_service.complete(
        prompt=f"Solve and explain the following problem extracted from a student's image:\n\n{text}",
        task="tutor",
        mode=mode,
        language=language,
    )

    return {
        "extracted_text": text,
        "confidence": ocr_result.get("confidence", 0),
        "solution": solution,
        "lines": ocr_result.get("lines", []),
    }
