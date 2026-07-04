"""
GyaanSetu AI — PaddleOCR Service
Extracts text from images, handwritten notes, exam papers, and scanned PDFs.
"""

import os, logging, tempfile
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("gyaansetu.ocr")

_ocr_engine = None


def _get_engine():
    global _ocr_engine
    if _ocr_engine is None:
        try:
            from paddleocr import PaddleOCR
            logger.info("Loading PaddleOCR engine…")
            _ocr_engine = PaddleOCR(
                use_angle_cls=True,
                lang="en",
                use_gpu=False,
                show_log=False,
            )
            logger.info("✅ PaddleOCR loaded")
        except ImportError:
            logger.error("paddleocr not installed. Run: pip install paddleocr paddlepaddle")
        except Exception as e:
            logger.error(f"PaddleOCR init failed: {e}")
    return _ocr_engine


async def extract_text(image_bytes: bytes, filename: str = "image.jpg") -> dict:
    """
    Extract text from image bytes.
    Returns: {"text": str, "lines": list[str], "confidence": float}
    """
    engine = _get_engine()
    if engine is None:
        return {"text": "", "lines": [], "confidence": 0.0, "error": "PaddleOCR unavailable"}

    suffix = Path(filename).suffix or ".jpg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        results = engine.ocr(tmp_path, cls=True)

        lines = []
        confidences = []

        if results and results[0]:
            for block in results[0]:
                if block and len(block) >= 2:
                    text_data = block[1]
                    if isinstance(text_data, (list, tuple)) and len(text_data) >= 2:
                        line_text = str(text_data[0]).strip()
                        conf = float(text_data[1])
                        if line_text:
                            lines.append(line_text)
                            confidences.append(conf)

        full_text = "\n".join(lines)
        avg_conf = round(sum(confidences) / len(confidences), 3) if confidences else 0.0

        return {"text": full_text, "lines": lines, "confidence": avg_conf}

    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        return {"text": "", "lines": [], "confidence": 0.0, "error": str(e)}
    finally:
        Path(tmp_path).unlink(missing_ok=True)


async def extract_from_pdf(pdf_bytes: bytes) -> dict:
    """Extract text from PDF pages using pdfplumber (text layer) + PaddleOCR fallback."""
    try:
        import pdfplumber, io
        pdf_file = io.BytesIO(pdf_bytes)
        all_text = []
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text and text.strip():
                    all_text.append(text.strip())
                else:
                    # Fallback: render page as image and OCR it
                    img = page.to_image(resolution=200).original
                    import io as _io
                    buf = _io.BytesIO()
                    img.save(buf, format="PNG")
                    ocr_result = await extract_text(buf.getvalue(), "page.png")
                    if ocr_result["text"]:
                        all_text.append(ocr_result["text"])

        combined = "\n\n".join(all_text)
        return {"text": combined, "pages": len(all_text), "method": "pdfplumber+ocr"}

    except ImportError:
        return {"text": "", "pages": 0, "error": "pdfplumber not installed"}
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        return {"text": "", "pages": 0, "error": str(e)}
