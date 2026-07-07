import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { GlassCard, PageHeader, GradientCard } from "@/components/ui-kit/Card";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  HeartPulse, Sparkles, Zap, Award, RefreshCw, X, Eye, 
  Activity, Info, Check, Brain, ShieldAlert, Coffee, Moon, Clock,
  Mic, Paperclip, FileUp, FileText, ChevronRight
} from "lucide-react";
import { 
  syncHealthMetrics, 
  getHealthIndex, 
  logBreathingSession, 
  analyzeMoodFeeling, 
  analyzeWearable 
} from "@/lib/api/ai.service";

export const Route = createFileRoute("/health")({
  head: () => ({ meta: [{ title: "Health Monitor — GyaanSetu AI" }] }),
  component: HealthDashboard,
});

// App usage database for Screen Time
const TODAY_APPS = [
  { name: "VS Code / IDE", hours: 4.2, color: "bg-[#00f5ff]" },
  { name: "GyaanSetu AI local chat", hours: 1.4, color: "bg-[#8b5cf6]" },
  { name: "Browser (Docs)", hours: 1.1, color: "bg-emerald-500" },
  { name: "Social / Media", hours: 0.3, color: "bg-red-500" }
];

const YESTERDAY_APPS = [
  { name: "VS Code / IDE", hours: 5.1, color: "bg-[#00f5ff]" },
  { name: "GyaanSetu AI local chat", hours: 1.9, color: "bg-[#8b5cf6]" },
  { name: "Browser (Docs)", hours: 1.5, color: "bg-emerald-500" },
  { name: "Social / Media", hours: 0.9, color: "bg-red-500" }
];

function HealthDashboard() {
  // Wellness check states
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  
  // Hydration state
  const [waterCups, setWaterCups] = useState(3); // 3 glasses of 250ml
  const [activeDuration, setActiveDuration] = useState<"today" | "yesterday">("today");

  // Health Metrics
  const [focusHealth, setFocusHealth] = useState(88);
  const [stressLevel, setStressLevel] = useState("Low");
  const [sleepScore, setSleepScore] = useState(7.4);
  const [screenHours, setScreenHours] = useState(6.2);

  // Active Modals
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // AI Input Hub States
  const [hubMode, setHubMode] = useState<"none" | "voice" | "upload" | "text">("none");
  const [recording, setRecording] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [wearableFile, setWearableFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [submittingHub, setSubmittingHub] = useState(false);
  
  const [breathingStep, setBreathingStep] = useState("Inhale...");
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingTimer, setBreathingTimer] = useState(60);

  // Eye timer countdown
  const [eyeTimerActive, setEyeTimerActive] = useState(false);
  const [eyeTimer, setEyeTimer] = useState(20);

  // AI Response from Companion / Wearable
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [wearableInsights, setWearableInsights] = useState<string | null>(null);

  // Toast State
  const [toast, setToast] = useState<{ message: string; icon: any } | null>(null);

  const showToast = (message: string, icon: any) => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 4000);
  };

  // Load metrics from backend on mount
  useEffect(() => {
    async function loadMetrics() {
      try {
        const data = await getHealthIndex();
        if (data && data.date) {
          setFocusHealth(data.focus_index);
          setWaterCups(data.water_cups ?? 3);
          setSleepScore(data.sleep_hours ?? 7.4);
          setStressLevel(data.stress_level ?? "Low");
          setScreenHours(data.screen_hours ?? 6.2);
        }
      } catch (err) {
        console.error("Failed to load health metrics from backend:", err);
      }
    }
    loadMetrics();
  }, []);

  // Sync state changes helper
  const syncWithBackend = async (updates: {
    screen_hours?: number;
    water_cups?: number;
    sleep_hours?: number;
    stress_level?: string;
  }) => {
    try {
      const payload = {
        date: new Date().toISOString().split("T")[0],
        screen_hours: updates.screen_hours !== undefined ? updates.screen_hours : screenHours,
        water_cups: updates.water_cups !== undefined ? updates.water_cups : waterCups,
        sleep_hours: updates.sleep_hours !== undefined ? updates.sleep_hours : sleepScore,
        stress_level: updates.stress_level !== undefined ? updates.stress_level : stressLevel,
      };
      const result = await syncHealthMetrics(payload);
      setFocusHealth(result.focus_index);
      return result;
    } catch (err) {
      console.error("Failed to sync metrics with backend:", err);
    }
  };

  // Run wellness check
  const runWellnessCheck = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const result = await syncWithBackend({
        screen_hours: screenHours,
        water_cups: waterCups,
        sleep_hours: sleepScore,
        stress_level: stressLevel,
      });
      setChecking(false);
      if (result) {
        setFocusHealth(result.focus_index);
        setCheckResult(`Wellness Sync Optimal: Focus index calculated as ${result.focus_index}. Breakdown: Screen Time ${result.breakdown.screen_time}, Hydration ${result.breakdown.hydration}, Sleep ${result.breakdown.sleep}, Stress ${result.breakdown.stress}.`);
        showToast(`Wellness check complete! Focus Health updated to ${result.focus_index}/100`, HeartPulse);
      }
    } catch (err) {
      setChecking(false);
      console.error(err);
      showToast("Failed to run wellness check with backend.", ShieldAlert);
    }
  };

  // Hydration incrementor
  const addWaterCup = async () => {
    if (waterCups >= 8) {
      showToast("Hydration limit achieved! Daily water goal met.", Award);
      return;
    }
    const nextCups = waterCups + 1;
    setWaterCups(nextCups);
    showToast(`Drunk 1 glass of water (250ml). Total: ${nextCups * 250}ml`, Coffee);
    await syncWithBackend({ water_cups: nextCups });
  };

  // Stress relief breathing timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (breathingActive && breathingTimer > 0) {
      interval = setInterval(() => {
        setBreathingTimer(t => t - 1);
        // Toggle steps every 4 seconds
        setBreathingStep((prev) => {
          if (breathingTimer % 12 === 0) return "Inhale...";
          if (breathingTimer % 12 === 8) return "Hold...";
          if (breathingTimer % 12 === 4) return "Exhale...";
          return prev;
        });
      }, 1000);
    } else if (breathingTimer === 0) {
      setBreathingActive(false);
      setBreathingTimer(60);
      
      // Log breathing session to backend
      logBreathingSession()
        .then((res) => {
          setStressLevel("Calm");
          if (res.focus_index) {
            setFocusHealth(res.focus_index);
          }
          showToast(res.message || "Breathing cycle completed! Stress score minimized.", HeartPulse);
        })
        .catch((err) => {
          console.error("Failed to log breathing session:", err);
          setStressLevel("Calm");
          setFocusHealth(f => Math.min(100, f + 5));
          showToast("Breathing cycle completed locally.", HeartPulse);
        });
    }
    return () => clearInterval(interval);
  }, [breathingActive, breathingTimer]);

  // Eye rest timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (eyeTimerActive && eyeTimer > 0) {
      interval = setInterval(() => {
        setEyeTimer(t => t - 1);
      }, 1000);
    } else if (eyeTimer === 0) {
      setEyeTimerActive(false);
      showToast("Eye rest completed! Ocular strain reduced.", Award);
      setEyeTimer(20);
    }
    return () => clearInterval(interval);
  }, [eyeTimerActive, eyeTimer]);

  const toggleBreathing = () => {
    if (breathingActive) {
      setBreathingActive(false);
      setBreathingStep("Inhale...");
    } else {
      setBreathingActive(true);
      setBreathingTimer(60);
      showToast("Breathing pacer started.", Activity);
    }
  };

  // Voice Log submit handler
  const handleVoiceSubmit = async () => {
    if (!voiceText) return;
    setSubmittingHub(true);
    setAiResponse(null);
    try {
      const result = await analyzeMoodFeeling("😐", voiceText);
      setSubmittingHub(false);
      setHubMode("none");
      setAiResponse(result.analysis);
      if (result.suggested_stress) {
        setStressLevel(result.suggested_stress);
        await syncWithBackend({ stress_level: result.suggested_stress });
      }
      showToast("Asha analyzed your voice mood log!", HeartPulse);
    } catch (err) {
      setSubmittingHub(false);
      showToast("Failed to analyze voice log with AI.", ShieldAlert);
    }
  };

  // Symptoms note submit handler
  const handleSymptomsSubmit = async () => {
    if (!pastedText) return;
    setSubmittingHub(true);
    setAiResponse(null);
    try {
      const result = await analyzeMoodFeeling("😔", pastedText);
      setSubmittingHub(false);
      setHubMode("none");
      setAiResponse(result.analysis);
      if (result.suggested_stress) {
        setStressLevel(result.suggested_stress);
        await syncWithBackend({ stress_level: result.suggested_stress });
      }
      showToast("Symptoms synced and analyzed by Asha!", Award);
    } catch (err) {
      setSubmittingHub(false);
      showToast("Failed to analyze symptoms.", ShieldAlert);
    }
  };

  // Wearable CSV submit handler
  const handleWearableSubmit = async () => {
    if (!wearableFile) return;
    setSubmittingHub(true);
    setAiResponse(null);
    try {
      const result = await analyzeWearable(wearableFile);
      setSubmittingHub(false);
      setHubMode("none");
      setAiResponse(result.analysis);
      setWearableInsights(result.analysis);
      
      // Update sleep score/stress level from wearable sync (we default to 7.8 hours and Moderate)
      setSleepScore(7.8);
      setStressLevel("Moderate");
      await syncWithBackend({ sleep_hours: 7.8, stress_level: "Moderate" });
      
      showToast("Wearable insights generated and synced!", Award);
    } catch (err) {
      setSubmittingHub(false);
      showToast("Failed to analyze wearable CSV.", ShieldAlert);
    }
  };

  const appData = activeDuration === "today" ? TODAY_APPS : YESTERDAY_APPS;

  return (
    <AppLayout>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 right-6 z-50 px-5 py-4 rounded-2xl border border-[#00F5FF]/30 shadow-2xl flex items-center gap-3 bg-[#0d1322] max-w-sm"
          >
            <div className="h-8 w-8 rounded-lg bg-[#00F5FF]/10 text-[#00F5FF] flex items-center justify-center shrink-0">
              <toast.icon className="h-4.5 w-4.5" />
            </div>
            <div className="text-xs font-semibold text-white">{toast.message}</div>
            <button onClick={() => setToast(null)} className="text-muted-foreground hover:text-white transition ml-auto">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader 
        title="Health Monitor" 
        subtitle="Your student wellness dashboard — track screen time, sleep, stress, and the Focus Health Index." 
        icon={HeartPulse} 
      />

      {/* AI Input Hub Panel */}
      <GlassCard className="mb-6 bg-[#0b1530] border border-blue-500/20 text-white shadow-lg">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-[#00f5ff]" />
              <span className="font-display font-bold text-sm text-white">AI Health Sync</span>
            </div>
            <span className="text-[9px] font-mono text-blue-300 uppercase tracking-wider">Upload Wearable Export or Log Mood</span>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {/* Voice option */}
            <button
              onClick={() => {
                setHubMode(hubMode === "voice" ? "none" : "voice");
                setVoiceText("");
              }}
              className={`flex items-center justify-between p-3 rounded-xl border transition text-left ${
                hubMode === "voice" ? "bg-[#00f5ff]/10 border-[#00f5ff]/30 text-white" : "bg-slate-800/40 border-slate-700/30 text-slate-400 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-[#00f5ff]" />
                <span className="text-xs font-semibold">Voice Mood Log</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            {/* Document option */}
            <button
              onClick={() => {
                setHubMode(hubMode === "upload" ? "none" : "upload");
                setSelectedFile(null);
              }}
              className={`flex items-center justify-between p-3 rounded-xl border transition text-left ${
                hubMode === "upload" ? "bg-[#00f5ff]/10 border-[#00f5ff]/30 text-white" : "bg-slate-800/40 border-slate-700/30 text-slate-400 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-[#00f5ff]" />
                <span className="text-xs font-semibold">Upload Wearable Data</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            {/* Text option */}
            <button
              onClick={() => {
                setHubMode(hubMode === "text" ? "none" : "text");
                setPastedText("");
              }}
              className={`flex items-center justify-between p-3 rounded-xl border transition text-left ${
                hubMode === "text" ? "bg-[#00f5ff]/10 border-[#00f5ff]/30 text-white" : "bg-slate-800/40 border-slate-700/30 text-slate-400 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#00f5ff]" />
                <span className="text-xs font-semibold">Paste Symptoms</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Conditional Input Areas */}
          <AnimatePresence>
            {hubMode === "voice" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-3 bg-[#050816] rounded-xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-slate-400">Microphone Input</span>
                  {recording && <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />}
                </div>
                {recording ? (
                  <div className="flex items-center justify-center gap-1.5 py-4">
                    {[1,2,3,4,5].map(i => (
                      <motion.span key={i} animate={{ height: [6, 20, 6] }} transition={{ duration: 0.5 + i*0.1, repeat: Infinity }} className="w-0.5 bg-red-400 rounded-full" />
                    ))}
                  </div>
                ) : voiceText ? (
                  <p className="text-xs text-white leading-relaxed font-mono">"{voiceText}"</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Click Start Recording to dictate your wellness status...</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (recording) {
                        setRecording(false);
                        setVoiceText("I feel a slight ocular strain after 5 hours of continuous screen coding.");
                        showToast("Voice mood log transcribed!", Mic);
                      } else {
                        setRecording(true);
                        setVoiceText("");
                        setTimeout(() => {
                          setRecording(false);
                          setVoiceText("I feel a slight ocular strain after 5 hours of continuous screen coding.");
                          showToast("Voice mood log transcribed!", Mic);
                        }, 2500);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold hover:bg-red-500/30 transition"
                  >
                    {recording ? "Stop Dictation" : "Start Recording"}
                  </button>
                  {voiceText && (
                    <button
                      onClick={handleVoiceSubmit}
                      disabled={submittingHub}
                      className="px-4 py-2 rounded-lg bg-[#00F5FF] text-[#050816] text-xs font-bold hover:scale-105 transition ml-auto disabled:opacity-50"
                    >
                      {submittingHub ? "Syncing..." : "Submit to AI"}
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {hubMode === "upload" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-4 bg-[#050816] rounded-xl border border-white/5 space-y-4">
                <label className="border border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center hover:border-[#00f5ff]/40 transition cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setWearableFile(file);
                        setSelectedFile(file.name);
                        showToast(`Uploaded ${file.name}`, FileUp);
                      }
                    }}
                  />
                  <FileUp className="h-8 w-8 text-[#00f5ff] mb-2" />
                  {selectedFile ? (
                    <span className="text-xs text-white font-mono font-bold">{selectedFile}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground text-center">Click to choose wearable CSV export</span>
                  )}
                </label>
                {selectedFile && (
                  <button
                    onClick={handleWearableSubmit}
                    disabled={submittingHub}
                    className="w-full py-2 rounded-lg bg-[#00F5FF] text-[#050816] text-xs font-bold hover:scale-[1.01] transition disabled:opacity-50"
                  >
                    {submittingHub ? "Analyzing wearable logs..." : "Sync Wearable CSV"}
                  </button>
                )}
              </motion.div>
            )}

            {hubMode === "text" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-3 bg-[#050816] rounded-xl border border-white/5 space-y-3">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste symptoms, energy logs, or water tallies..."
                  className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f5ff]/40 font-mono"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSymptomsSubmit}
                    disabled={!pastedText || submittingHub}
                    className="px-4 py-2 rounded-lg bg-[#00F5FF] text-[#050816] text-xs font-bold hover:scale-105 transition disabled:opacity-50"
                  >
                    {submittingHub ? "Analyzing..." : "Sync Notes"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {aiResponse && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 p-4 rounded-xl bg-slate-900/60 border border-[#00f5ff]/20 text-xs space-y-2 relative"
            >
              <button 
                onClick={() => setAiResponse(null)}
                className="absolute top-2.5 right-2.5 text-slate-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5 text-[#00f5ff] font-bold">
                <Brain className="h-4 w-4" />
                Asha (AI Wellness Coach):
              </div>
              <p className="text-slate-200 leading-relaxed italic">"{aiResponse}"</p>
            </motion.div>
          )}
        </div>
      </GlassCard>

      {/* Hero CTA Box */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <GradientCard className="overflow-hidden relative mb-6">
          <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 glass rounded-full px-3 py-1 text-xs">
                <Sparkles className="h-3 w-3 text-[#00F5FF]" />
                Powered by GyaanSetu AI
              </div>
              <h1 className="mt-3 text-2xl lg:text-3xl font-display font-bold">
                Student Wellness Hub
              </h1>
              <p className="mt-2 text-slate-300 max-w-xl text-xs leading-relaxed">
                Evaluating behavioral patterns offline to prevent academic burnout and regulate attention span.
              </p>
            </div>
            <div>
              <button 
                onClick={runWellnessCheck}
                disabled={checking}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] px-5 py-3 text-xs font-bold text-[#050816] glow-cyan hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                {checking ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Assessing metrics...
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4" /> Run Wellness Check
                  </>
                )}
              </button>
            </div>
          </div>
        </GradientCard>
      </motion.div>

      {/* 4 Interactive Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <button 
          onClick={() => { setActiveModal("screentime"); showToast("Opening screen time app logs...", Clock); }}
          className="bg-[#0b1530] border border-blue-500/20 p-4 rounded-2xl text-left hover:border-[#00F5FF]/30 transition hover:scale-[1.02] text-white shadow-lg"
        >
          <div className="text-[10px] text-blue-300 uppercase font-mono tracking-wider">Screen Time</div>
          <div className="text-xl font-bold text-white mt-1 leading-none">{Math.floor(screenHours)}h {Math.round((screenHours % 1) * 60)}m</div>
          <div className="text-[9px] text-[#00F5FF] mt-2 underline">Click to view app breakdown</div>
        </button>
        <button 
          onClick={() => { setActiveModal("sleep"); showToast("Opening sleep patterns insights...", Moon); }}
          className="bg-[#0b1530] border border-blue-500/20 p-4 rounded-2xl text-left hover:border-[#8B5CF6]/30 transition hover:scale-[1.02] text-white shadow-lg"
        >
          <div className="text-[10px] text-blue-300 uppercase font-mono tracking-wider">Sleep</div>
          <div className="text-xl font-bold text-white mt-1 leading-none">{sleepScore}h</div>
          <div className="text-[9px] text-[#8B5CF6] mt-2 underline">Healthy range (7-8h)</div>
        </button>
        <button 
          onClick={() => { setActiveModal("breathing"); showToast("Opening breathing stress relief...", Activity); }}
          className="bg-[#0b1530] border border-blue-500/20 p-4 rounded-2xl text-left hover:border-emerald-500/30 transition hover:scale-[1.02] text-white shadow-lg"
        >
          <div className="text-[10px] text-blue-300 uppercase font-mono tracking-wider">Stress Level</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 leading-none">{stressLevel}</div>
          <div className="text-[9px] text-blue-200/60 mt-2 underline">Click to start breathing cycle</div>
        </button>
        <div className="bg-[#0b1530] border border-blue-500/20 p-4 rounded-2xl text-white shadow-lg">
          <div className="text-[10px] text-blue-300 uppercase font-mono tracking-wider">Focus Health</div>
          <div className="text-xl font-bold text-white mt-1 leading-none">{focusHealth}/100</div>
          <div className="text-[9px] text-blue-200/60 mt-2">Aggregated wellness rating</div>
        </div>
      </div>

      {/* Center Layout: Water Tracker & App Time charts */}
      <div className="grid lg:grid-cols-12 gap-6 items-stretch mb-6">
        
        {/* Left: Interactive Water Intake Tracker */}
        <div className="lg:col-span-5 flex flex-col">
          <GlassCard className="flex-1 flex flex-col justify-between items-center bg-[#0b1530] border border-blue-500/20 p-6 min-h-[350px] text-white shadow-lg">
            
            <div className="w-full flex justify-between items-center mb-3">
              <div>
                <h3 className="font-display font-bold text-base text-white">Water Intake</h3>
                <p className="text-[11px] text-blue-200/60">Hydration tracker (Daily Target: 2.0L)</p>
              </div>
              <span className="text-[9px] font-mono text-[#00F5FF] bg-[#00F5FF]/10 px-2 py-0.5 rounded">Goal: 8 cups</span>
            </div>

            {/* Visual Glass cup */}
            <div className="my-6 relative flex items-center justify-center">
              {/* Outer glass border */}
              <div className="h-44 w-32 border-2 border-white/20 rounded-b-2xl rounded-t-lg relative overflow-hidden flex flex-col justify-end bg-slate-900/40">
                {/* Water Level */}
                <motion.div 
                  className="w-full bg-[#00F5FF] relative shadow-[0_0_15px_rgba(0,245,255,0.4)]"
                  initial={{ height: "0%" }}
                  animate={{ height: `${(waterCups / 8) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {/* Water waves effect */}
                  <div className="absolute inset-x-0 -top-1.5 h-1.5 bg-[#00f5ff] opacity-80 animate-pulse" />
                </motion.div>
              </div>

              {/* Digital progress overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-xl font-mono font-extrabold text-white">
                  {waterCups * 250} ml
                </div>
                <div className="text-[8px] font-mono text-white/70 uppercase tracking-widest mt-1">
                  {waterCups}/8 Glasses
                </div>
              </div>
            </div>

            <button
              onClick={addWaterCup}
              className="w-full py-2.5 rounded-xl bg-[#00F5FF] text-[#050816] text-xs font-bold glow-cyan hover:scale-[1.02] transition"
            >
              + Drink Glass (250ml)
            </button>

          </GlassCard>
        </div>

        {/* Right: Screen Time app chart logs */}
        <div className="lg:col-span-7 flex flex-col">
          <GlassCard className="flex-1 bg-[#0b1530] border border-blue-500/20 p-6 flex flex-col justify-between text-white shadow-lg">
            <div>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                <div>
                  <h3 className="font-display font-bold text-base text-white">Screen Time Distribution</h3>
                  <p className="text-[11px] text-blue-200/60">Detailed logs of screen focus per app</p>
                </div>
                <div className="flex gap-1.5 text-[9px] font-bold">
                  <button 
                    onClick={() => setActiveDuration("today")}
                    className={`px-2.5 py-1 rounded transition ${activeDuration === "today" ? "bg-white/10 text-white" : "text-blue-200/60 hover:text-white"}`}
                  >
                    Today
                  </button>
                  <button 
                    onClick={() => setActiveDuration("yesterday")}
                    className={`px-2.5 py-1 rounded transition ${activeDuration === "yesterday" ? "bg-white/10 text-white" : "text-blue-200/60 hover:text-white"}`}
                  >
                    Yesterday
                  </button>
                </div>
              </div>

              {/* Custom progress distribution list */}
              <div className="space-y-4 py-2">
                {appData.map((ap) => (
                  <div key={ap.name} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-300">{ap.name}</span>
                      <span className="text-white font-mono">{ap.hours} hours</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        className={`h-full rounded-full ${ap.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(ap.hours / 8) * 100}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-blue-200/60 flex items-center gap-1 bg-slate-900/40 p-3 rounded-lg border border-white/5 mt-4">
              <Info className="h-3.5 w-3.5 text-[#00f5ff]" /> GyaanSetu suggests taking a 20-second break every 2 hours of IDE focus.
            </div>

          </GlassCard>
        </div>

      </div>

      {/* Grid of Features with interactive hooks */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { id: "screentime", title: "Screen Time Tracker", desc: "Per-app breakdown with healthy-usage targets and gentle break reminders.", tag: "Interactive" },
          { id: "eyehealth", title: "Eye Health", desc: "20-20-20 rule reminders, blue-light insights, and daily eye exercises.", tag: "Pacer Ready" },
          { id: "sleep", title: "Sleep Insights", desc: "Sleep score, REM patterns, and AI suggestions for better bedtime routines." },
          { id: "stress", title: "Stress Detection", desc: "Behavioral cues + optional wearable sync to detect early burnout signs.", tag: "Wearable Sync" },
          { id: "water", title: "Water Intake", desc: "Hydration goal tracking with smart nudges based on your activity." },
          { id: "coach", title: "Wellness Coach", desc: "Weekly AI-generated wellness report with personalized recommendations." }
        ].map((it, i) => (
          <motion.div
            key={it.title}
            whileHover={{ y: -3 }}
            onClick={() => {
              if (it.id === "water") {
                showToast("Drink glasses of water on the left hydration panel!", Info);
              } else {
                setActiveModal(it.id);
                showToast(`Opening ${it.title} parameters...`, Sparkles);
              }
            }}
            className="cursor-pointer"
          >
            <GlassCard className="h-full bg-[#0b1530] border border-blue-500/20 text-white shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="h-8.5 w-8.5 rounded-xl bg-gradient-to-br from-[#00F5FF] to-[#8B5CF6] flex items-center justify-center text-[#050816] font-bold text-xs">
                  {String(i + 1).padStart(2, "0")}
                </div>
                {it.tag && (
                  <span className="text-[8px] font-mono bg-[#00F5FF]/10 px-2 py-0.5 rounded text-[#00F5FF]">{it.tag}</span>
                )}
              </div>
              <h3 className="font-display font-bold text-xs text-white mb-1">{it.title}</h3>
              <p className="text-[10.5px] text-blue-200/70 leading-normal">{it.desc}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Pop-up Modals for interactive logs */}
      <AnimatePresence>
        
        {/* Breathing stress pacer Modal */}
        {activeModal === "breathing" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0d1322] border border-[#00f5ff]/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f5ff]/5 rounded-full blur-2xl" />

              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <h4 className="font-display font-extrabold text-sm text-white flex items-center gap-1.5">
                  <Activity className="h-4.5 w-4.5 text-[#00f5ff]" />
                  Breathing Stress Regulator
                </h4>
                <button onClick={() => { setActiveModal(null); setBreathingActive(false); }} className="text-muted-foreground hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col items-center justify-center py-6 space-y-6">
                
                {/* Visual Breathing Ring */}
                <div className="relative h-40 w-40 flex items-center justify-center">
                  <motion.div 
                    animate={{
                      scale: breathingActive 
                        ? (breathingStep === "Inhale..." ? [1, 1.4, 1] : breathingStep === "Hold..." ? 1.4 : [1.4, 1, 1.4]) 
                        : 1
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-4 rounded-full bg-[#00f5ff]/10 border border-[#00f5ff]/30 shadow-[0_0_20px_rgba(0,245,255,0.15)] flex items-center justify-center"
                  />
                  <div className="absolute text-sm font-bold text-white font-mono leading-none z-10">
                    {breathingStep}
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <div className="text-xs text-muted-foreground">Timer remaining: <span className="font-bold text-white font-mono">{breathingTimer}s</span></div>
                  <p className="text-[10px] text-slate-400 max-w-xs leading-normal">Helps oxygenate cognitive systems and reduce mental anxiety triggers.</p>
                </div>

                <button
                  onClick={toggleBreathing}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition ${
                    breathingActive ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-[#00F5FF] text-[#050816] glow-cyan"
                  }`}
                >
                  {breathingActive ? "Pause Breathing" : "Start 60s Breathing Exercise"}
                </button>
              </div>

            </motion.div>
          </div>
        )}

        {/* Eye Break 20-20-20 Pacer */}
        {activeModal === "eyehealth" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0d1322] border border-[#00f5ff]/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#8b5cf6]/5 rounded-full blur-2xl" />

              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <h4 className="font-display font-extrabold text-sm text-white flex items-center gap-1.5">
                  <Eye className="h-4.5 w-4.5 text-[#00f5ff]" />
                  20-20-20 Eye Rest Pacer
                </h4>
                <button onClick={() => { setActiveModal(null); setEyeTimerActive(false); }} className="text-muted-foreground hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="bg-[#00f5ff]/10 text-[#00f5ff] p-3.5 rounded-xl text-[10.5px] leading-relaxed">
                  <b>20-20-20 Rule:</b> Every 20 minutes, look at an object 20 feet away for at least 20 seconds.
                </div>
                {eyeTimerActive ? (
                  <div className="flex flex-col items-center justify-center py-4 space-y-2">
                    <div className="h-20 w-20 rounded-full border-4 border-dashed border-[#00f5ff] animate-spin flex items-center justify-center">
                      <Eye className="h-8 w-8 text-[#00f5ff] animate-pulse" />
                    </div>
                    <div className="text-base font-bold font-mono text-white mt-2">
                      Looking 20ft away: {eyeTimer}s
                    </div>
                  </div>
                ) : (
                  <p>This simple habit prevents computer vision fatigue, aligns ocular focus, and prevents dry eyes.</p>
                )}
                
                <button 
                  onClick={() => {
                    if (eyeTimerActive) {
                      setEyeTimerActive(false);
                      setEyeTimer(20);
                    } else {
                      setEyeTimerActive(true);
                      setEyeTimer(20);
                      showToast("Ocular rest timer started.", Eye);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] text-xs font-bold text-[#050816] transition hover:shadow-lg"
                >
                  {eyeTimerActive ? "Cancel Timer" : "Start Ocular Rest Timer (20s)"}
                </button>
              </div>

            </motion.div>
          </div>
        )}

        {/* Sleep stage hypnogram Modal */}
        {activeModal === "sleep" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0d1322] border border-[#00f5ff]/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#8b5cf6]/5 rounded-full blur-2xl" />

              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <h4 className="font-display font-extrabold text-sm text-white flex items-center gap-1.5">
                  <Moon className="h-4.5 w-4.5 text-[#8b5cf6]" />
                  Hypnogram Sleep Stage Insights
                </h4>
                <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                  <div className="bg-[#050816] p-2 rounded-lg border border-white/5">
                    <div className="text-slate-400">Deep Sleep</div>
                    <div className="text-white font-bold mt-1">{Math.max(0, (sleepScore * 0.25).toFixed(1))}h</div>
                  </div>
                  <div className="bg-[#050816] p-2 rounded-lg border border-white/5">
                    <div className="text-slate-400">REM Stage</div>
                    <div className="text-white font-bold mt-1">{Math.max(0, (sleepScore * 0.28).toFixed(1))}h</div>
                  </div>
                  <div className="bg-[#050816] p-2 rounded-lg border border-white/5">
                    <div className="text-slate-400">Light Stage</div>
                    <div className="text-white font-bold mt-1">{Math.max(0, (sleepScore * 0.47).toFixed(1))}h</div>
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[10px] leading-relaxed">
                  <b>Sleep Hours:</b> {sleepScore}h (Target: 7-8h)
                </div>

                <div className="p-3 bg-slate-900/60 border border-white/5 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 font-semibold">Adjust Sleep Hours:</span>
                    <span className="font-mono font-bold text-[#8b5cf6]">{sleepScore}h</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="12" 
                    step="0.5"
                    value={sleepScore} 
                    onChange={(e) => setSleepScore(parseFloat(e.target.value))}
                    className="w-full accent-[#8b5cf6] bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                  />
                  <button
                    onClick={() => {
                      syncWithBackend({ sleep_hours: sleepScore });
                      showToast("Sleep hours synced with backend!", Award);
                    }}
                    className="w-full py-1.5 bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 text-[#8b5cf6] rounded-lg text-[10px] font-bold transition"
                  >
                    Sync with Database
                  </button>
                </div>

                {wearableInsights && (
                  <div className="p-3 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-xl text-[10px] leading-relaxed text-slate-200">
                    <b className="text-[#8b5cf6] block mb-1">Wearable Analytics:</b>
                    <p className="italic font-mono text-[9px] leading-normal">{wearableInsights}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full mt-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition"
              >
                Close Panel
              </button>
            </motion.div>
          </div>
        )}

        {/* Screen time app lists */}
        {activeModal === "screentime" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0d1322] border border-[#00f5ff]/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f5ff]/5 rounded-full blur-2xl" />

              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <h4 className="font-display font-extrabold text-sm text-white flex items-center gap-1.5">
                  <Clock className="h-4.5 w-4.5 text-[#00f5ff]" />
                  Active Apps Screen Log
                </h4>
                <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {TODAY_APPS.map((a, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#050816] border border-white/5 flex justify-between items-center">
                    <span className="font-semibold text-slate-300">{a.name}</span>
                    <span className="font-mono text-[#00f5ff]">{a.hours}h today</span>
                  </div>
                ))}

                <div className="p-3 bg-slate-900/60 border border-white/5 rounded-xl space-y-2 mt-4 text-white">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 font-semibold">Total Screen Hours:</span>
                    <span className="font-mono font-bold text-[#00f5ff]">{screenHours}h</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="16" 
                    step="0.5"
                    value={screenHours} 
                    onChange={(e) => setScreenHours(parseFloat(e.target.value))}
                    className="w-full accent-[#00f5ff] bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                  />
                  <button
                    onClick={() => {
                      syncWithBackend({ screen_hours: screenHours });
                      showToast("Screen hours synced with backend!", Award);
                    }}
                    className="w-full py-1.5 bg-[#00f5ff]/10 hover:bg-[#00f5ff]/20 border border-[#00f5ff]/30 text-[#00f5ff] rounded-lg text-[10px] font-bold transition"
                  >
                    Sync with Database
                  </button>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full mt-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition"
              >
                Close Logs
              </button>
            </motion.div>
          </div>
        )}

        {/* Stress detection & Wellness reports */}
        {(activeModal === "stress" || activeModal === "coach") && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0d1322] border border-[#00f5ff]/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#8b5cf6]/5 rounded-full blur-2xl" />

              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <h4 className="font-display font-extrabold text-sm text-white flex items-center gap-1.5">
                  <Info className="h-4.5 w-4.5 text-[#00f5ff]" />
                  {activeModal === "stress" ? "Wearable Index Sync" : "Wellness Report"}
                </h4>
                <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {activeModal === "stress" ? (
                <div className="space-y-3.5 text-xs text-slate-300">
                  <p>Synchronize stress markers via local wearable APIs:</p>
                  <div className="p-3 bg-[#050816] rounded-xl border border-white/5 space-y-1.5 font-mono text-[9.5px]">
                    <div className="flex justify-between"><span>Heart Rate Variability:</span> <span className="text-emerald-400">74 ms (Optimal)</span></div>
                    <div className="flex justify-between"><span>Skin Conductance:</span> <span className="text-[#00f5ff]">1.2 μS</span></div>
                    <div className="flex justify-between"><span>Wearable Connection:</span> <span className="text-emerald-400">CONNECTED</span></div>
                    <div className="flex justify-between"><span>Aggregated Stress Level:</span> <span className="text-[#00f5ff] font-bold">{stressLevel}</span></div>
                  </div>
                  {wearableInsights && (
                    <div className="p-3 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-xl text-[10px] leading-relaxed text-slate-200">
                      <b className="text-[#8b5cf6] block mb-1">Wearable Analytics:</b>
                      <p className="italic font-mono text-[9px] leading-normal">{wearableInsights}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10.5px]">
                    <div className="flex justify-between font-bold">
                      <span>Focus Health Rating:</span> 
                      <span>{focusHealth}/100</span>
                    </div>
                  </div>
                  <p>Daily breakdown suggests your screen-to-rest ratio is {screenHours > 6 ? "slightly high" : "excellent"} and hydration is {waterCups >= 8 ? "optimal" : "moderate"}. Asha suggests completing 20-20-20 ocular pacers regularly.</p>
                  
                  {wearableInsights && (
                    <div className="p-3 bg-slate-900/60 border border-white/5 rounded-xl text-[10px] leading-relaxed text-slate-200">
                      <b className="text-[#00f5ff] block mb-1">Coach Diagnostic Analysis:</b>
                      <p className="italic font-mono text-[9px] leading-normal">{wearableInsights}</p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setActiveModal(null)}
                className="w-full mt-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition"
              >
                Close Panel
              </button>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

    </AppLayout>
  );
}
