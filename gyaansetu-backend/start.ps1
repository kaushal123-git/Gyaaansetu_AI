# GyaanSetu AI Backend — Start Script (Windows PowerShell)
# Run this from: d:\Gyaansetu-AI\gyaansetu-backend\
# Usage: .\start.ps1

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " GyaanSetu AI Backend — Starting Up" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Python not found. Install from https://python.org" -ForegroundColor Red
    exit 1
}

# 2. Create/activate virtual environment
if (-not (Test-Path ".\venv")) {
    Write-Host "`n[SETUP] Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

Write-Host "`n[SETUP] Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# 3. Install requirements
Write-Host "`n[SETUP] Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt -q

# 4. Copy .env if not exists
if (-not (Test-Path ".\.env")) {
    if (Test-Path ".\.env.example") {
        Copy-Item ".\.env.example" ".\.env"
        Write-Host "`n[SETUP] Created .env from template" -ForegroundColor Green
    }
}

# 5. Check Ollama
Write-Host "`n[CHECK] Testing Ollama connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "[OK] Ollama is running" -ForegroundColor Green

    # Pull required models if not already cached
    $models = @("llama3.1:8b", "phi3", "deepseek-r1", "gemma3")
    foreach ($model in $models) {
        Write-Host "`n[MODEL] Checking $model..." -ForegroundColor Yellow
        ollama pull $model
    }
} catch {
    Write-Host "[WARN] Ollama not running. Starting ollama serve in background..." -ForegroundColor Yellow
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

# 6. Create required directories
New-Item -ItemType Directory -Force -Path "audio_out" | Out-Null
New-Item -ItemType Directory -Force -Path "chroma_store" | Out-Null
New-Item -ItemType Directory -Force -Path "piper_models" | Out-Null

# 7. Start FastAPI
Write-Host "`n[START] Launching GyaanSetu AI Backend on http://localhost:8000 ..." -ForegroundColor Green
Write-Host "        API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "        Press Ctrl+C to stop`n" -ForegroundColor Gray

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload --log-level info
