"""
GyaanSetu AI — Piper TTS Service
Converts text to speech locally using Piper TTS binary.
Returns WAV audio bytes or a file path for serving via /audio static mount.
"""

import os, uuid, asyncio, logging, subprocess, tempfile
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("gyaansetu.piper")

PIPER_EXEC      = os.getenv("PIPER_EXECUTABLE",   "piper")
PIPER_MODELS    = os.getenv("PIPER_MODELS_DIR",   "./piper_models")
DEFAULT_VOICE   = os.getenv("PIPER_DEFAULT_VOICE", "en_US-lessac-medium")
HINDI_VOICE     = os.getenv("PIPER_HINDI_VOICE",   "hi_IN-sangita-medium")
AUDIO_OUT_DIR   = "audio_out"

os.makedirs(AUDIO_OUT_DIR, exist_ok=True)
os.makedirs(PIPER_MODELS, exist_ok=True)

# Language → Piper voice model mapping
_VOICE_MAP: dict[str, str] = {
    "English": DEFAULT_VOICE,
    "Hindi":   HINDI_VOICE,
    "Marathi": HINDI_VOICE,   # Fallback to Hindi voice
    "Tamil":   DEFAULT_VOICE,
    "Telugu":  DEFAULT_VOICE,
    "Bengali": DEFAULT_VOICE,
}


def _resolve_model_path(voice_name: str) -> str:
    """Build path to .onnx model file inside PIPER_MODELS_DIR."""
    return str(Path(PIPER_MODELS) / f"{voice_name}.onnx")


async def synthesize(text: str, language: str = "English") -> dict:
    """
    Synthesize text → WAV audio.
    Returns: {"audio_url": str, "filename": str, "success": bool}
    """
    voice = _VOICE_MAP.get(language, DEFAULT_VOICE)
    model_path = _resolve_model_path(voice)
    filename = f"tts_{uuid.uuid4().hex[:12]}.wav"
    output_path = os.path.join(AUDIO_OUT_DIR, filename)

    # Check model exists; if not, download automatically
    if not Path(model_path).exists():
        logger.warning(f"Piper model '{voice}' not found at {model_path}. Attempting download…")
        dl_success = await _download_model(voice)
        if not dl_success:
            logger.error("Piper model download failed — returning silence placeholder")
            return {"audio_url": None, "filename": None, "success": False,
                    "error": f"Piper model '{voice}' not available. Run: piper --download-voices"}

    cmd = [
        PIPER_EXEC,
        "--model", model_path,
        "--output_file", output_path,
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate(input=text.encode("utf-8"))

        if proc.returncode != 0:
            err = stderr.decode()
            logger.error(f"Piper failed: {err}")
            return {"audio_url": None, "filename": None, "success": False, "error": err}

        return {
            "audio_url": f"/audio/{filename}",
            "filename": filename,
            "success": True,
        }

    except FileNotFoundError:
        logger.error(f"Piper binary not found at '{PIPER_EXEC}'. Install Piper from https://github.com/rhasspy/piper")
        return {"audio_url": None, "filename": None, "success": False,
                "error": "Piper binary not installed"}
    except Exception as e:
        logger.error(f"TTS synthesis error: {e}")
        return {"audio_url": None, "filename": None, "success": False, "error": str(e)}


async def _download_model(voice: str) -> bool:
    """Try to download a Piper model using pip install piper-tts."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "python", "-m", "piper", "--download-voice", voice,
            "--data-dir", PIPER_MODELS,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await proc.communicate()
        return proc.returncode == 0
    except Exception as e:
        logger.error(f"Model download failed: {e}")
        return False
