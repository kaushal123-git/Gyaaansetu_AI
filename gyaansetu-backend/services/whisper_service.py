"""
GyaanSetu AI — Faster Whisper Speech-to-Text Service
Transcribes audio files or buffers offline using Faster Whisper.
Model is loaded once at startup for speed.
"""

import os, tempfile, logging
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("gyaansetu.whisper")

WHISPER_MODEL  = os.getenv("WHISPER_MODEL",  "base")

def _detect_device() -> str:
    env_device = os.getenv("WHISPER_DEVICE")
    if env_device:
        return env_device
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
    except Exception:
        pass
    try:
        import ctranslate2
        if "cuda" in ctranslate2.get_supported_devices():
            return "cuda"
    except Exception:
        pass
    return "cpu"

WHISPER_DEVICE = _detect_device()
_model = None  # Lazy-loaded on first use


def _get_model():
    global _model
    if _model is None:
        try:
            from faster_whisper import WhisperModel
            logger.info(f"Loading Whisper model '{WHISPER_MODEL}' on {WHISPER_DEVICE}…")
            try:
                _model = WhisperModel(
                    WHISPER_MODEL,
                    device=WHISPER_DEVICE,
                    compute_type="int8" if WHISPER_DEVICE == "cpu" else "float16",
                )
            except Exception as cuda_err:
                if WHISPER_DEVICE == "cuda":
                    logger.warning(f"Failed to load Whisper on CUDA: {cuda_err}. Falling back to CPU.")
                    _model = WhisperModel(
                        WHISPER_MODEL,
                        device="cpu",
                        compute_type="int8",
                    )
                else:
                    raise cuda_err
            logger.info("✅ Whisper model loaded")
        except ImportError:
            logger.error("faster-whisper not installed. Run: pip install faster-whisper")
            return None
        except Exception as e:
            logger.error(f"Failed to load Whisper: {e}")
            return None
    return _model


async def transcribe_bytes(audio_bytes: bytes, language: str = "en") -> dict:
    """
    Transcribe raw audio bytes.
    Returns: {"text": str, "language": str, "confidence": float}
    """
    model = _get_model()
    if model is None:
        return {"text": "", "language": language, "confidence": 0.0, "error": "Whisper unavailable"}

    # Write to temp file (Whisper needs a file path)
    suffix = ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        lang_code = _language_to_code(language)
        segments, info = model.transcribe(
            tmp_path,
            language=lang_code if lang_code != "auto" else None,
            beam_size=5,
            vad_filter=True,
        )

        text_parts = [seg.text for seg in segments]
        full_text = " ".join(text_parts).strip()

        return {
            "text": full_text,
            "language": info.language,
            "confidence": round(info.language_probability, 3),
        }
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        return {"text": "", "language": language, "confidence": 0.0, "error": str(e)}
    finally:
        Path(tmp_path).unlink(missing_ok=True)


async def transcribe_file(file_path: str, language: str = "en") -> dict:
    """Transcribe an audio file by path."""
    with open(file_path, "rb") as f:
        audio_bytes = f.read()
    return await transcribe_bytes(audio_bytes, language)


def _language_to_code(language: str) -> str:
    """Map language name to ISO code."""
    mapping = {
        "English": "en", "Hindi": "hi", "Marathi": "mr",
        "Tamil": "ta", "Telugu": "te", "Bengali": "bn",
        "Gujarati": "gu", "Kannada": "kn", "Malayalam": "ml",
        "Punjabi": "pa",
    }
    return mapping.get(language, "auto")
