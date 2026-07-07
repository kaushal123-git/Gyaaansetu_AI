# GyaanSetu AI — Offline Neural Education Ecosystem

> **Production-grade, AI-powered education platform built entirely offline.**  
> Notion + Duolingo + ChatGPT + Coursera + DigiLocker + Apple Vision Pro — for Indian students.

---

## 🏗️ Architecture

```
d:\Gyaansetu-AI\
├── learnsphere-ai-companion/   # React frontend (port 3000)
│   ├── src/routes/             # 10 page routes (dashboard, tutor, career, etc.)
│   ├── src/lib/api/            # Server functions + AI service layer
│   └── gyaansetu.db            # SQLite database
├── gyaansetu-backend/          # FastAPI AI backend (port 8000)
│   ├── routers/                # tutor, ocr, rag, career, interview, health, mistakes
│   ├── services/               # Ollama, Whisper, Piper, PaddleOCR, ChromaDB
│   └── db/                     # SQLite schema (9 tables)
├── devinterviewbot/            # 3D VRM mock interviewer (port 5180)
│   └── services/offlineInterviewService.ts
└── start-all.ps1               # Master launcher
```

---

## ⚡ Quick Start

### Prerequisites

| Tool | Install |
|------|---------|
| [Node.js 20+](https://nodejs.org) | `winget install OpenJS.NodeJS` |
| [Python 3.11+](https://python.org) | `winget install Python.Python.3.11` |
| [Ollama](https://ollama.ai) | Download from ollama.ai |
| [Piper TTS](https://github.com/rhasspy/piper/releases) | Add binary to PATH |

### Launch Everything (One Command)

```powershell
cd d:\Gyaansetu-AI
.\start-all.ps1
```

The script automatically:
1. Starts Ollama daemon
2. Pulls AI models (`llama3.1:8b`, `phi3`, `deepseek-r1`, `gemma3`)
3. Creates Python venv + installs requirements
4. Launches FastAPI backend on port `8000`
5. Launches React portal on port `3000`
6. Launches DevInterview bot on port `5180`

### Manual Start (Backend Only)

```powershell
cd d:\Gyaansetu-AI\gyaansetu-backend
.\start.ps1
```

---

## 🤖 AI Engine Map

| Module | Model | Engine |
|--------|-------|--------|
| AI Tutor (chat) | `llama3.1:8b` | Ollama |
| Code Review / Interview | `deepseek-r1` | Ollama |
| Quick Answers | `phi3` | Ollama |
| Career Roadmaps | `gemma3` | Ollama |
| Voice Input (STT) | `base` Whisper | Faster-Whisper |
| Voice Output (TTS) | Lessac Medium | Piper TTS |
| Image / OCR | PP-OCRv4 | PaddleOCR |
| Notes Search | MiniLM-L6-v2 | ChromaDB |

**100% offline. No OpenAI. No Google. No cloud APIs.**

---

## 🗺️ Feature Pages

| Route | Page | Key AI Feature |
|-------|------|----------------|
| `/` | Landing | Offline inference simulator |
| `/dashboard` | Dashboard | Study analytics, task planner |
| `/tutor` | AI Tutor | Streaming Llama chat, OCR solve, voice, RAG |
| `/learning` | Learning Hub | Netflix-style courses, syllabus generator |
| `/focus` | Focus Room | Pomodoro + DevInterview AI embed |
| `/health` | Health Monitor | Focus Health Index (Llama analysis) |
| `/mistakes` | Mistake Analyzer | AI error categorization + remedial quiz |
| `/career` | Career Paths | Resume parsing → AI roadmap (DeepSeek) |
| `/vault` | Certificate Vault | PDF metadata extraction |
| `/avatar` | Avatar DNA | Learning profile + XP badges |

---

## 🔌 API Reference

FastAPI auto-generates interactive docs at:  
**`http://localhost:8000/docs`**

### Key Endpoints

```
POST /tutor/chat          → SSE streaming Llama chat
POST /tutor/voice         → Whisper STT → Ollama → Piper TTS
POST /ocr/extract         → PaddleOCR image text extraction
POST /rag/ingest-file     → PDF → ChromaDB embeddings
POST /rag/query           → Semantic search + Llama answer
POST /career/analyze-resume → PDF resume → AI roadmap
POST /career/generate-roadmap → Target → milestone plan
POST /interview/start     → Begin mock interview session
POST /interview/respond   → Audio → Whisper → DeepSeek → TTS
POST /interview/end/{id}  → Generate scored report
POST /mistakes/analyze-text → Text error → AI categorization
POST /mistakes/quiz-generate → Remedial MCQ generation
GET  /health/index/{uid}  → Focus Health Index (0-100)
POST /health/sync         → Save daily wellness metrics
```

---

## 🗄️ Database Schema

SQLite database at `gyaansetu_ai.db` (backend) and `gyaansetu.db` (frontend).

| Table | Purpose |
|-------|---------|
| `users` | Auth + profile |
| `user_stats` | XP, streaks, mastery |
| `tasks` | Study checklist |
| `mistakes` | Error log + remedial quiz data |
| `certificates` | Vault credentials |
| `courses` | Learning paths |
| `health_metrics` | Daily wellness tracking |
| `interview_reports` | Mock interview scores |
| `career_roadmaps` | AI-generated career plans |
| `learning_progress` | Module completion tracking |
| `rag_documents` | ChromaDB ingest history |

---

## 🔐 Demo Credentials

```
Email:    student@gyaansetu.ai
Password: password123
```

---

## 📦 Tech Stack

**Frontend**: React 19 · Vite · TypeScript · Tailwind CSS · Framer Motion · TanStack Router  
**Backend**: FastAPI · Python 3.11 · SQLite · ChromaDB  
**AI**: Ollama · Llama 3.1 · DeepSeek R1 · Phi-3 · Gemma 3 · Faster Whisper · Piper TTS · PaddleOCR  
**3D Interview**: Three.js · @pixiv/three-vrm · MediaPipe · Web Audio API  

---

## 🛠️ Troubleshooting

| Issue | Fix |
|-------|-----|
| Ollama not found | Install from [ollama.ai](https://ollama.ai) |
| Model pull fails | Run `ollama pull llama3.1:8b` manually |
| Piper TTS silent | Download voice models: `en_US-lessac-medium.onnx` to `gyaansetu-backend/piper_models/` |
| PaddleOCR slow | First run downloads ~1GB model. Subsequent runs are fast. |
| ChromaDB error | Delete `chroma_store/` folder and restart backend |
| Port 8000 busy | Kill existing process: `netstat -ano \| findstr :8000` |
