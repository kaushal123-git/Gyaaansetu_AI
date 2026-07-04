"""
GyaanSetu AI — Ollama Service
Unified client for all local LLM tasks. Routes to the optimal model per task.
Models used:
  llama3.1:8b    → general tutor, health analysis, mistake explanation
  deepseek-r1    → code review, interview Q&A, career roadmaps
  phi3           → fast quick answers, health index calculation
  gemma3         → creative content, career descriptions, flashcards
"""

import os, json, logging, httpx, asyncio
from typing import AsyncGenerator, Literal
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("gyaansetu.ollama")

OLLAMA_BASE  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL_DEFAULT  = os.getenv("OLLAMA_DEFAULT_MODEL",  "llama3.1:8b")
MODEL_CODE     = os.getenv("OLLAMA_CODE_MODEL",     "deepseek-r1")
MODEL_FAST     = os.getenv("OLLAMA_FAST_MODEL",     "phi3")
MODEL_CREATIVE = os.getenv("OLLAMA_CREATIVE_MODEL", "gemma3")

TaskType = Literal["tutor", "code", "fast", "creative", "interview", "career", "mistakes"]

_MODEL_MAP: dict[TaskType, str] = {
    "tutor":     MODEL_DEFAULT,
    "code":      MODEL_CODE,
    "fast":      MODEL_FAST,
    "creative":  MODEL_CREATIVE,
    "interview": MODEL_CODE,
    "career":    MODEL_CODE,
    "mistakes":  MODEL_DEFAULT,
}

def _append_language_instruction(system_prompt: str, language: str) -> str:
    if not language or language == "English":
        return system_prompt

    lang_info = {
        "Hindi": ("Hindi (हिंदी) using the Devanagari script", "आपका पूरा उत्तर केवल हिंदी भाषा में होना चाहिए। देवनागरी लिपि का उपयोग करें।"),
        "Marathi": ("Marathi (मराठी)", "तुमचे संपूर्ण उत्तर फक्त मराठीत असावे."),
        "Gujarati": ("Gujarati (ગુજરાતી)", "તમારો સંપૂર્ણ જવાબ ફક્ત ગુજરાતીમાં હોવો જોઈએ."),
        "Tamil": ("Tamil (தமிழ்)", "உங்கள் முழு பதிலும் தமிழில் மட்டுமே இருக்க வேண்டும்."),
        "Telugu": ("Telugu (తెలుగు)", "మీ సమాధానం అంతా తెలుగులోనే ఉండాలి."),
        "Bengali": ("Bengali (বাংলা)", "আপনার সম্পূর্ণ উত্তরটি কেবল বাংলায় হতে হবে।"),
        "Kannada": ("Kannada (ಕನ್ನಡ)", "ನಿಮ್ಮ ಸಂಪೂರ್ಣ ಉತ್ತರವು ಕನ್ನಡದಲ್ಲಿರಬೇಕು."),
        "Malayalam": ("Malayalam (മലയാളം)", "നിങ്ങളുടെ മുഴുവൻ ഉത്തരവും മലയാളത്തിലായിരിക്കണം."),
        "Punjabi": ("Punjabi (ਪੰਜਾਬੀ)", "ਤੁਹਾਡਾ ਸਾਰਾ ਜਵਾਬ ਪੰਜਾਬੀ ਵਿੱਚ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।")
    }

    if language in lang_info:
        lang_name, native_instruction = lang_info[language]
        lang_instruction = (
            f"\n\n[SYSTEM LANGUAGE OVERRIDE: {language}]\n"
            f"CRITICAL: The user has set the response language to {lang_name}.\n"
            f"You MUST translate and output your entire response EXCLUSIVELY in {lang_name}.\n"
            f"DO NOT respond in English. Do not mix English sentences unless they are technical words or code.\n"
            f"If the system requires a JSON response, keep the JSON keys exactly in English as defined, but write the values (textual content, feedback, questions, descriptions) in {lang_name}.\n"
            f"Local language instruction: {native_instruction}"
        )
        return f"{system_prompt}{lang_instruction}"
        
    return system_prompt

# Mode-specific system instructions optimized for ChatGPT-style high quality
_MODE_PROMPTS: dict[str, str] = {
    "Explain Like I'm 10": (
        "You are a friendly, highly encouraging AI Tutor. Explain the topic like you are speaking to a 10-year-old child. "
        "Use simple language, fun analogies, and clear, structured explanations. Break complex concepts into short steps. "
        "Use bullet points, bold key words, and brief examples. Avoid technical jargon unless you immediately explain it simply."
    ),
    "Exam Preparation": (
        "You are a structured exam coach. Provide highly detailed, precise, and factually accurate answers optimized for exam scores. "
        "Structure your response with: 1) Core Definition, 2) Key Formulas/Concepts, 3) Step-by-Step explanation, and 4) Common Exam Traps/Pitfalls. "
        "Use bold text, markdown lists, and bullet points to make the content highly readable and study-friendly."
    ),
    "Quick Revision": (
        "You are a rapid revision coach. Provide a concise, high-yield cheat sheet style summary of the topic. "
        "Use bold terms, key formulas, bullet points, and markdown tables where appropriate. "
        "Ensure the user can revise the entire topic in 30 seconds. Do not write introductory or concluding fluff."
    ),
    "Deep Learning": (
        "You are an expert professor and deep-learning mentor. Give comprehensive, theoretically rigorous explanations. "
        "Break down the topic from first principles. Include: 1) Conceptual Foundations, 2) Mathematical formulas (if applicable) or strict rules, "
        "3) Edge cases, and 4) Relationships/connections to other fields or advanced concepts. Use clean code snippets or tables where helpful."
    ),
    "Competitive Exam Mode": (
        "You are a competitive exam expert specializing in national-level reasoning and analytical exams (e.g., UPSC, JEE, NEET, GATE). "
        "Provide highly crisp, structured, high-yield notes. Highlight: - Memory shortcuts or Mnemonics, - Most common mistakes students make, "
        "- Standard question patterns, - Step-by-step solving algorithms. Format with bulleted points and code blocks/tables."
    ),
    "Interview Mode": (
        "You are an expert corporate interviewer and mock interview coach. Frame your responses exactly as a high-performing candidate "
        "would answer in a FAANG interview, using the STAR method (Situation, Task, Action, Result) if explaining a scenario. "
        "Follow this with 2-3 realistic follow-up questions the interviewer might ask next to test depth of knowledge."
    ),
}

_installed_models: list[str] = []

def _build_system_prompt(mode: str, language: str) -> str:
    mode_prompt = _MODE_PROMPTS.get(mode, _MODE_PROMPTS["Deep Learning"])
    return _append_language_instruction(mode_prompt, language)


async def get_best_available_model(task: TaskType) -> str:
    """
    Returns the mapped model for the task if installed,
    otherwise falls back to llama3.1:8b, phi3, or the first available model.
    """
    global _installed_models
    # Refresh/load installed models list
    models = await list_models()
    if models:
        _installed_models = models
        
    target_model = _MODEL_MAP.get(task, MODEL_DEFAULT)
    
    # Check if exact match or simple name match exists in installed list
    normalized_installed = [m.lower() for m in _installed_models]
    
    # 1. Direct match
    if target_model.lower() in normalized_installed:
        return target_model
        
    # 2. Check if a version of the model is installed (e.g., deepseek-r1:latest matches deepseek-r1)
    for inst in _installed_models:
        if inst.lower().startswith(target_model.lower() + ":") or target_model.lower().startswith(inst.lower() + ":"):
            return inst

    # 3. Fallback to default (llama3.1:8b) if it is installed
    default_lower = MODEL_DEFAULT.lower()
    for inst in _installed_models:
        if inst.lower() == default_lower or inst.lower().startswith(default_lower + ":"):
            return inst

    # 4. Fallback to fast model (phi3) if installed
    fast_lower = MODEL_FAST.lower()
    for inst in _installed_models:
        if inst.lower() == fast_lower or inst.lower().startswith(fast_lower + ":"):
            return inst

    # 5. Fallback to any installed model
    if _installed_models:
        return _installed_models[0]
        
    # 6. Absolute fallback
    return target_model


async def check_ollama_health() -> bool:
    """Returns True if Ollama is reachable."""
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(f"{OLLAMA_BASE}/api/tags")
            return r.status_code == 200
    except Exception:
        return False


async def list_models() -> list[str]:
    """Returns a list of locally installed Ollama models."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{OLLAMA_BASE}/api/tags")
            data = r.json()
            return [m["name"] for m in data.get("models", [])]
    except Exception as e:
        logger.warning(f"Could not list models: {e}")
        return []


async def stream_chat(
    prompt: str,
    task: TaskType = "tutor",
    system: str | None = None,
    mode: str = "Deep Learning",
    language: str = "English",
) -> AsyncGenerator[str, None]:
    """Stream tokens from Ollama for a given prompt."""
    model = await get_best_available_model(task)
    system_prompt = _append_language_instruction(system, language) if system else _build_system_prompt(mode, language)

    # Lower temperature for rigorous academic modes, standard for creative
    temp = 0.3 if mode in ["Exam Preparation", "Deep Learning", "Competitive Exam Mode", "Interview Mode"] else 0.7

    options = {
        "temperature": temp,
        "num_predict": 1536, # Allow longer reasoning replies
        "num_ctx": 8192,     # Large context window for better memory retrieval
        "top_p": 0.9,
    }

    payload = {
        "model": model,
        "prompt": prompt,
        "system": system_prompt,
        "stream": True,
        "options": options,
    }

    logger.info(f"Streaming [{model}] task={task} lang={language} mode={mode} temp={temp}")

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            async with client.stream("POST", f"{OLLAMA_BASE}/api/generate", json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        token = data.get("response", "")
                        if token:
                            yield token
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue
    except httpx.ConnectError:
        yield "\n\n⚠️ **Ollama is not running.** Start it with `ollama serve` in a terminal."
    except Exception as e:
        logger.error(f"Ollama stream error: {e}")
        yield f"\n\n⚠️ AI engine error: {str(e)}"


async def complete(
    prompt: str,
    task: TaskType = "tutor",
    system: str | None = None,
    mode: str = "Deep Learning",
    language: str = "English",
    max_tokens: int = 2048,
) -> str:
    """Blocking completion — collects all tokens and returns full string."""
    model = await get_best_available_model(task)
    system_prompt = _append_language_instruction(system, language) if system else _build_system_prompt(mode, language)

    temp = 0.3 if mode in ["Exam Preparation", "Deep Learning", "Competitive Exam Mode", "Interview Mode"] else 0.7

    options = {
        "temperature": temp,
        "num_predict": max_tokens,
        "num_ctx": 8192,
        "top_p": 0.9,
    }

    payload = {
        "model": model,
        "prompt": prompt,
        "system": system_prompt,
        "stream": False,
        "options": options,
    }

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            r = await client.post(f"{OLLAMA_BASE}/api/generate", json=payload)
            r.raise_for_status()
            return r.json().get("response", "")
    except httpx.ConnectError:
        return "⚠️ Ollama is not running. Start with: ollama serve"
    except Exception as e:
        logger.error(f"Ollama complete error: {e}")
        return f"⚠️ AI error: {str(e)}"
