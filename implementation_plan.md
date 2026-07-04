# User-Friendly UI/UX Enhancements for GyaanSetu AI

This plan outlines improvements to make the GyaanSetu AI user interface highly user-friendly. It targets two major areas of friction:
1. **Light Mode Legibility & Contrast (Legibility Fixes)**: The application features a default light theme. However, many pages contain hardcoded Tailwind dark background classes (such as `bg-[#0d1322]` and `bg-[#050816]`) that do not have light mode overrides. Because `.text-white` is globally overriden to dark text in light mode, this results in dark text on dark backgrounds, making text completely invisible/illegible.
2. **AI Connection Diagnostic Tool**: The application runs completely offline and relies on a local FastAPI server (port 8000) and Ollama. When these services are offline, generating roadmaps, tutoring, and other features fail. We will replace the hardcoded "AI ready" label with a dynamic, clickable status indicator that diagnostics local services and displays instructions to run `.\start-all.ps1`.

---

## User Review Required

> [!IMPORTANT]
> The dynamic AI Connection dot will poll the local backend status every 10 seconds. Clicking it will open a diagnosing popup with clear instructions to run the launcher script.
> We are also mapping all hardcoded dark gray/navy backgrounds to soft glass card elements in light mode, ensuring that text remains perfectly readable.

---

## Proposed Changes

### 1. Global Styling & Contrast Overrides
#### [MODIFY] [styles.css](file:///c:/Users/Kaushal Dubey/Downloads/Gyaaansetu_AI-main/Gyaaansetu_AI-main/learnsphere-ai-companion/src/styles.css)
- Expand the `html:not(.dark)` flat selectors to include all other hardcoded dark backgrounds used in the routes (e.g. `bg-[#0d1322]`, `bg-[#050816]`, `bg-[#0e172e]`, `bg-[#0a0f1d]`, etc.) mapping them to `var(--card)` or `var(--muted)`.
- Map light text colors (`text-slate-300`, `text-slate-200`, `text-blue-100`) to `var(--muted-foreground)` when rendering in light mode to guarantee sufficient contrast.
- Override neon border colors (`border-[#00F5FF]/30`, `border-[#00f5ff]/20`) to `var(--border)` in light mode.

### 2. Main Shell Header Indicator
#### [MODIFY] [AppLayout.tsx](file:///c:/Users/Kaushal Dubey/Downloads/Gyaaansetu_AI-main/Gyaaansetu_AI-main/learnsphere-ai-companion/src/components/layout/AppLayout.tsx)
- Import `checkBackendHealth` from the AI service layer.
- Set up a React hook that checks backend status on mount and at 10-second intervals.
- Replace the hardcoded "AI ready" badge with a dynamic, colored status indicator (`AI Engine Online` / `Ollama Disconnected` / `AI Server Offline`).
- Add an animated diagnosis modal that opens when the user clicks the badge, containing step-by-step instructions on running `.\start-all.ps1` or pulling Ollama models.

---

## Verification Plan

### Manual Verification
1. Open the application in the browser at `http://localhost:8080/`.
2. Inspect cards, toast messages, and inputs in the **Career Roadmap**, **Learning Path**, and **AI Tutor** pages to verify text is highly legible and backgrounds look clean and premium.
3. Stop the backend server or Ollama and verify that the header badge dynamically transitions to `AI Server Offline` or `Ollama Disconnected`.
4. Click the badge to verify the help modal opens and provides accurate startup scripts.
