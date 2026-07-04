# GyaanSetu AI -- Master Launcher (Windows PowerShell)
# Run from: d:\Gyaansetu-AI\
# Usage: .\start-all.ps1

param(
    [switch]$SkipInstall,
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "  =============================================" -ForegroundColor Cyan
Write-Host "   GYAANSETU AI  --  Offline Neural Education " -ForegroundColor Cyan
Write-Host "   All AI runs locally. No cloud APIs needed. " -ForegroundColor Cyan
Write-Host "  =============================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Ollama ────────────────────────────────────────────────────────────
if (-not $FrontendOnly) {
    Write-Host "[1/5] Checking Ollama..." -ForegroundColor Yellow

    $ollamaExe = "ollama"
    if (Test-Path "D:\Ollama\ollama.exe") {
        $ollamaExe = "D:\Ollama\ollama.exe"
    } elseif (Test-Path "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe") {
        $ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
    }

    $ollamaRunning = $false
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 -ErrorAction Stop
        $ollamaRunning = $true
        Write-Host "      Ollama already running OK" -ForegroundColor Green
    } catch {
        if (Get-Command $ollamaExe -ErrorAction SilentlyContinue) {
            Write-Host "      Starting Ollama daemon..." -ForegroundColor Gray
            Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Minimized
            Start-Sleep -Seconds 4
            $ollamaRunning = $true
            Write-Host "      Ollama started OK" -ForegroundColor Green
        } else {
            Write-Host "      [WARN] Ollama not installed. Get it from: https://ollama.ai" -ForegroundColor Red
        }
    }

    # ── Step 2: Pull models ───────────────────────────────────────────────────
    Write-Host ""
    Write-Host "[2/5] Verifying AI models (llama3.1:8b + phi3 + deepseek-r1)..." -ForegroundColor Yellow
    if ($ollamaRunning -and (Get-Command $ollamaExe -ErrorAction SilentlyContinue)) {
        foreach ($model in @("llama3.1:8b", "phi3", "deepseek-r1")) {
            Write-Host "      Pulling $model (skipped if cached)..." -ForegroundColor Gray
            Start-Process -FilePath $ollamaExe -ArgumentList "pull $model" -WindowStyle Hidden -Wait
        }
        Write-Host "      Models ready OK" -ForegroundColor Green
    } else {
        Write-Host "      Skipping model pull (Ollama unavailable)" -ForegroundColor Yellow
    }
}

# ── Step 3: FastAPI Backend ───────────────────────────────────────────────────
if (-not $FrontendOnly) {
    Write-Host ""
    Write-Host "[3/5] Starting AI Backend (FastAPI) on port 8000..." -ForegroundColor Yellow

    $backendPath = Join-Path $PSScriptRoot "gyaansetu-backend"

    if (Test-Path $backendPath) {
        $venvPython = Join-Path $backendPath "venv\Scripts\python.exe"
        $venvPip    = Join-Path $backendPath "venv\Scripts\pip.exe"
        $venvDir    = Join-Path $backendPath "venv"

        # Create venv if missing
        if (-not (Test-Path $venvDir)) {
            Write-Host "      Creating Python virtual environment..." -ForegroundColor Gray
            python -m venv $venvDir
        }

        # Install deps
        if (-not $SkipInstall) {
            Write-Host "      Installing Python dependencies..." -ForegroundColor Gray
            $reqFile = Join-Path $backendPath "requirements.txt"
            & $venvPip install -r $reqFile -q 2>&1 | Out-Null
        }

        # Copy .env if missing
        $envFile    = Join-Path $backendPath ".env"
        $envExample = Join-Path $backendPath ".env.example"
        if ((-not (Test-Path $envFile)) -and (Test-Path $envExample)) {
            Copy-Item $envExample $envFile
            Write-Host "      Created .env from template" -ForegroundColor Gray
        }

        # Create needed directories
        foreach ($dir in @("audio_out", "chroma_store", "piper_models")) {
            New-Item -ItemType Directory -Force -Path (Join-Path $backendPath $dir) | Out-Null
        }

        # Launch backend in new window
        $backendProcess = Start-Process `
            -FilePath $venvPython `
            -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8000 --reload" `
            -WorkingDirectory $backendPath `
            -PassThru `
            -WindowStyle Normal

        Start-Sleep -Seconds 4
        Write-Host ("      FastAPI Backend started (PID: " + $backendProcess.Id + ") OK") -ForegroundColor Green
        Write-Host "      API Docs  :  http://localhost:8000/docs" -ForegroundColor DarkCyan
    } else {
        Write-Host "      [ERROR] gyaansetu-backend directory not found at: $backendPath" -ForegroundColor Red
    }
}

# ── Step 4: React Frontend ────────────────────────────────────────────────────
if (-not $BackendOnly) {
    Write-Host ""
    Write-Host "[4/5] Starting GyaanSetu Portal (React) on port 3000..." -ForegroundColor Yellow

    $frontendPath = Join-Path $PSScriptRoot "learnsphere-ai-companion"

    if (Test-Path $frontendPath) {
        if (-not $SkipInstall) {
            Write-Host "      Installing npm packages..." -ForegroundColor Gray
            Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm install" -WorkingDirectory $frontendPath -Wait -WindowStyle Hidden
        }

        $frontendProcess = Start-Process `
            -FilePath "cmd.exe" `
            -ArgumentList "/c npm run dev" `
            -WorkingDirectory $frontendPath `
            -PassThru `
            -WindowStyle Normal

        Start-Sleep -Seconds 4
        Write-Host ("      Frontend started (PID: " + $frontendProcess.Id + ") OK") -ForegroundColor Green
        Write-Host "      Portal    :  http://localhost:3000" -ForegroundColor DarkCyan
    } else {
        Write-Host "      [ERROR] learnsphere-ai-companion not found at: $frontendPath" -ForegroundColor Red
    }
}

# ── Step 5: DevInterview Bot ──────────────────────────────────────────────────
if (-not $BackendOnly) {
    Write-Host ""
    Write-Host "[5/5] Starting DevInterview AI Bot on port 5180..." -ForegroundColor Yellow

    $botPath = Join-Path $PSScriptRoot "devinterviewbot"

    if (Test-Path $botPath) {
        if (-not $SkipInstall) {
            Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm install" -WorkingDirectory $botPath -Wait -WindowStyle Hidden
        }

        $botProcess = Start-Process `
            -FilePath "cmd.exe" `
            -ArgumentList "/c npm run dev" `
            -WorkingDirectory $botPath `
            -PassThru `
            -WindowStyle Normal

        Start-Sleep -Seconds 3
        Write-Host ("      DevInterview Bot started (PID: " + $botProcess.Id + ") OK") -ForegroundColor Green
        Write-Host "      Bot       :  http://localhost:5180" -ForegroundColor DarkCyan
    } else {
        Write-Host "      [WARN] devinterviewbot directory not found. Skipping." -ForegroundColor Yellow
    }
}

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  =============================================" -ForegroundColor Green
Write-Host "   GyaanSetu AI -- All Services Running!" -ForegroundColor Green
Write-Host "  =============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  GyaanSetu Portal     ->  http://localhost:3000" -ForegroundColor White
Write-Host "  AI Backend (FastAPI) ->  http://localhost:8000" -ForegroundColor White
Write-Host "  API Documentation    ->  http://localhost:8000/docs" -ForegroundColor White
Write-Host "  DevInterview Bot     ->  http://localhost:5180" -ForegroundColor White
Write-Host "  Ollama               ->  http://localhost:11434" -ForegroundColor White
Write-Host ""
Write-Host "  Demo Login: student@gyaansetu.ai / password123" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  Close this window or press Ctrl+C to stop all services." -ForegroundColor Gray
Write-Host ""

# Keep alive
try {
    while ($true) {
        Start-Sleep -Seconds 60
    }
} finally {
    Write-Host "`nGyaanSetu AI shutting down..." -ForegroundColor Yellow
}
