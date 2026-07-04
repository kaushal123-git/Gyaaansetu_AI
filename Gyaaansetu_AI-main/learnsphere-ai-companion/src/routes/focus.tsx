import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { GlassCard, PageHeader, GradientCard } from "@/components/ui-kit/Card";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { 
  Home, Sparkles, Play, Square, Volume2, ShieldAlert, 
  Settings, Award, RefreshCw, X, Users, BarChart2, BellOff, Info, Check, VolumeX,
  Mic, Paperclip, FileUp, FileText, ChevronRight
} from "lucide-react";

export const Route = createFileRoute("/focus")({
  head: () => ({ meta: [{ title: "Focus Room — GyaanSetu AI" }] }),
  component: FocusDashboard,
});

const SOUNDSCAPES = [
  { id: "rain", name: "Rain Storm", icon: "🌧️" },
  { id: "cafe", name: "Paris Café", icon: "☕" },
  { id: "forest", name: "Summer Forest", icon: "🌲" },
  { id: "space", name: "Deep Space", icon: "🛸" },
  { id: "lofi", name: "LoFi Chill Beats", icon: "🎧" }
];

const STUDY_MATES = [
  { name: "Aarav Sharma", status: "Focusing (14m left)", avatar: "👨‍💻" },
  { name: "Dr. Elena Vaneva", status: "Focusing (3m left)", avatar: "👩‍🏫" },
  { name: "Mark Thompson", status: "Break (5m)", avatar: "🧔" }
];

function FocusDashboard() {
  // Mode Tab State
  const [activeTab, setActiveTab] = useState<"study" | "interview">("study");
  const [botPort, setBotPort] = useState("5180");
  const [showPortSettings, setShowPortSettings] = useState(false);

  // Timer States
  const [activeDuration, setActiveDuration] = useState(1500); // 25 min default
  const [secondsLeft, setSecondsLeft] = useState(1500);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Soundscape States
  const [activeSound, setActiveSound] = useState<string | null>(null);
  
  // Customization & Panel States
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [shieldActive, setShieldActive] = useState(true);
  
  // Statistics States
  const [todayFocus, setTodayFocus] = useState(168); // 2h 48m = 168 mins

  // AI Input Hub States
  const [hubMode, setHubMode] = useState<"none" | "voice" | "upload" | "text">("none");
  const [recording, setRecording] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [submittingHub, setSubmittingHub] = useState(false);
  const [sessionsCount, setSessionsCount] = useState(6);
  const [distractionsCount, setDistractionsCount] = useState(47);

  // Toast State
  const [toast, setToast] = useState<{ message: string; icon: any } | null>(null);

  const showToast = (message: string, icon: any) => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 4000);
  };

  // Timer Tick Logic
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerActive(false);
            setTodayFocus(t => t + Math.floor(activeDuration / 60));
            setSessionsCount(s => s + 1);
            showToast("Congratulations! Focus Session Completed! +1 Session", Award);
            return activeDuration;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, activeDuration]);

  // Adjust duration selectors
  const handleDurationChange = (mins: number) => {
    const secs = mins * 60;
    setActiveDuration(secs);
    setSecondsLeft(secs);
    setTimerActive(false);
    showToast(`Timer duration set to ${mins} minutes.`, Settings);
  };

  const handleToggleTimer = () => {
    if (timerActive) {
      setTimerActive(false);
      showToast("Focus session paused.", Play);
    } else {
      setTimerActive(true);
      showToast("Focus session started. Notifications muted.", BellOff);
    }
  };

  const handleResetTimer = () => {
    setTimerActive(false);
    setSecondsLeft(activeDuration);
    showToast("Timer reset.", RefreshCw);
  };

  // Format Helper
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rs.toString().padStart(2, "0")}`;
  };

  const getProgressPercentage = () => {
    return ((activeDuration - secondsLeft) / activeDuration) * 100;
  };

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
        title="Focus Room" 
        subtitle="A futuristic deep-work environment with Pomodoro, ambient sounds, and productivity analytics." 
        icon={Home} 
      />

      {/* Futuristic Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-2 border-b border-slate-200">
        <div className="flex gap-2 bg-slate-200/50 p-1.5 rounded-2xl border border-slate-300/40">
          <button
            onClick={() => setActiveTab("study")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold font-display transition-all ${
              activeTab === "study"
                ? "bg-[#0b1530] text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/30"
            }`}
          >
            Study Space & Pomodoro
          </button>
          <button
            onClick={() => setActiveTab("interview")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold font-display transition-all flex items-center gap-2 ${
              activeTab === "interview"
                ? "bg-[#0b1530] text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/30"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            DevInterview AI Workspace
          </button>
        </div>

        {activeTab === "interview" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPortSettings(!showPortSettings)}
              className="text-xs text-slate-600 hover:text-slate-950 font-bold transition flex items-center gap-1.5"
            >
              <Settings className="h-4 w-4" />
              Configure Connection
            </button>
          </div>
        )}
      </div>

      {showPortSettings && activeTab === "interview" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl border border-blue-500/20 bg-[#0d1322] text-white max-w-md"
        >
          <h4 className="text-xs font-bold mb-2">DevInterview Bot Connection Address</h4>
          <div className="flex gap-2">
            <span className="bg-[#050816] px-3 py-2 rounded-xl text-xs font-mono text-slate-400 border border-white/5 flex items-center">
              http://localhost:
            </span>
            <input
              type="text"
              value={botPort}
              onChange={(e) => setBotPort(e.target.value)}
              className="bg-[#050816] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00f5ff]/40 flex-1"
              placeholder="5180"
            />
            <button
              onClick={() => {
                setShowPortSettings(false);
                showToast(`Switched port connection to ${botPort}`, Check);
              }}
              className="bg-[#00f5ff] text-[#050816] rounded-xl px-4 py-2 text-xs font-bold hover:scale-[1.02] transition"
            >
              Apply
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === "study" ? (
        <>
        {/* AI Focus Assistant Panel */}
        <GlassCard className="mb-6 bg-[#0b1530] border border-blue-500/20 text-white shadow-lg">
          <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-[#00f5ff]" />
              <span className="font-display font-bold text-sm text-white">AI Focus Assistant</span>
            </div>
            <span className="text-[9px] font-mono text-blue-300 uppercase tracking-wider">Upload Study PDFs or Dictate Tasks</span>
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
                <span className="text-xs font-semibold">Voice Task Input</span>
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
                <span className="text-xs font-semibold">Upload Study PDF</span>
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
                <span className="text-xs font-semibold">Paste Study Notes</span>
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
                  <p className="text-xs text-muted-foreground italic">Click Start Recording to dictate focus targets...</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (recording) {
                        setRecording(false);
                        setVoiceText("Study session target: Complete 3 modules on React Hydration optimization.");
                        showToast("Voice goals transcribed!", Mic);
                      } else {
                        setRecording(true);
                        setVoiceText("");
                        setTimeout(() => {
                          setRecording(false);
                          setVoiceText("Study session target: Complete 3 modules on React Hydration optimization.");
                          showToast("Voice goals transcribed!", Mic);
                        }, 2500);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold hover:bg-red-500/30 transition"
                  >
                    {recording ? "Stop Dictation" : "Start Recording"}
                  </button>
                  {voiceText && (
                    <button
                      onClick={() => {
                        setSubmittingHub(true);
                        setTimeout(() => {
                          setSubmittingHub(false);
                          setHubMode("none");
                          showToast("Focus session updated with voice goals! Ready.", Award);
                        }, 1200);
                      }}
                      className="px-4 py-2 rounded-lg bg-[#00F5FF] text-[#050816] text-xs font-bold hover:scale-105 transition ml-auto"
                    >
                      {submittingHub ? "Syncing..." : "Submit to AI"}
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {hubMode === "upload" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-4 bg-[#050816] rounded-xl border border-white/5 space-y-4">
                <div className="border border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center hover:border-[#00f5ff]/40 transition cursor-pointer"
                  onClick={() => {
                    setSelectedFile("study_guide_networks.pdf");
                    showToast("Uploaded study_guide_networks.pdf", FileUp);
                  }}
                >
                  <FileUp className="h-8 w-8 text-[#00f5ff] mb-2" />
                  {selectedFile ? (
                    <span className="text-xs text-white font-mono font-bold">{selectedFile}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground text-center">Drag and drop textbook PDF here, or click to upload</span>
                  )}
                </div>
                {selectedFile && (
                  <button
                    onClick={() => {
                      setSubmittingHub(true);
                      setTimeout(() => {
                        setSubmittingHub(false);
                        setHubMode("none");
                        showToast("Study guide summarized! Focus block optimized.", Award);
                      }, 1200);
                    }}
                    className="w-full py-2 rounded-lg bg-[#00F5FF] text-[#050816] text-xs font-bold hover:scale-[1.01] transition"
                  >
                    {submittingHub ? "Analyzing text..." : "Summarize & Start Focus"}
                  </button>
                )}
              </motion.div>
            )}

            {hubMode === "text" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-3 bg-[#050816] rounded-xl border border-white/5 space-y-3">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your custom notes or exam question outline here..."
                  className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f5ff]/40 font-mono"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      if (!pastedText) return;
                      setSubmittingHub(true);
                      setTimeout(() => {
                        setSubmittingHub(false);
                        setHubMode("none");
                        showToast("Focus session outlines created!", Award);
                      }, 1200);
                    }}
                    disabled={!pastedText}
                    className="px-4 py-2 rounded-lg bg-[#00F5FF] text-[#050816] text-xs font-bold hover:scale-105 transition disabled:opacity-50"
                  >
                    {submittingHub ? "Analyzing..." : "Sync Outline"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>

      {/* Main layout */}
      <div className="grid lg:grid-cols-12 gap-6 items-stretch mb-6">
        
        {/* Left Column: Pomodoro Circular Progress clock */}
        <div className="lg:col-span-7 flex flex-col">
          <GradientCard className="flex-1 flex flex-col justify-between items-center relative overflow-hidden bg-[#0b1530] border border-blue-500/20 p-6 min-h-[420px] text-white shadow-lg">
            
            {/* Top Bar inside Timer */}
            <div className="flex justify-between items-center w-full z-10">
              <div>
                <div className="text-[10px] font-mono text-blue-300 uppercase tracking-wider">Pomodoro Cycle</div>
                <div className="text-sm font-bold text-white mt-0.5">Deep Work Mode</div>
              </div>
              <div className="flex gap-1">
                {[25, 45, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleDurationChange(m)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition ${
                      activeDuration === m * 60 
                        ? "bg-[#00f5ff] text-[#050816]" 
                        : "bg-slate-800/40 border border-slate-700/30 text-slate-400 hover:text-white"
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            {/* Circular Progress & Digital clock */}
            <div className="my-6 relative flex items-center justify-center">
              {/* Outer Glow Ring */}
              <div className={`absolute h-56 w-56 rounded-full border border-white/5 transition-all duration-700 ${
                timerActive ? "shadow-[0_0_50px_rgba(0,245,255,0.2)] border-[#00f5ff]/20 animate-pulse" : ""
              }`} />
              
              {/* SVG Circle Progress */}
              <svg className="h-52 w-52 transform -rotate-90">
                <circle
                  cx="104"
                  cy="104"
                  r="94"
                  className="stroke-white/5 fill-none"
                  strokeWidth="6"
                />
                <motion.circle
                  cx="104"
                  cy="104"
                  r="94"
                  className="stroke-[#00F5FF] fill-none"
                  strokeWidth="6"
                  strokeDasharray="590"
                  strokeDashoffset={590 - (590 * getProgressPercentage()) / 100}
                  transition={{ ease: "linear" }}
                />
              </svg>

              {/* Digital Time display overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-mono font-extrabold text-white tracking-widest leading-none">
                  {formatTime(secondsLeft)}
                </div>
                <div className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest mt-2">
                  {timerActive ? "Focusing..." : "Paused"}
                </div>
              </div>
            </div>

            {/* Bottom Actions inside Timer */}
            <div className="flex gap-3 w-full max-w-sm z-10">
              <button
                onClick={handleToggleTimer}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition hover:scale-[1.02] ${
                  timerActive 
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                    : "bg-[#00F5FF] text-[#050816] glow-cyan"
                }`}
              >
                {timerActive ? <VolumeX className="h-4 w-4" /> : <Play className="h-4 w-4 fill-[#050816]" />}
                {timerActive ? "Pause Focus" : "Start Focus Session"}
              </button>
              <button
                onClick={handleResetTimer}
                className="bg-slate-800/40 border border-slate-700/30 text-blue-200 hover:bg-slate-800/60 px-4 py-2.5 rounded-xl text-xs font-bold border-white/10 hover:bg-white/5 transition flex items-center justify-center"
              >
                <RefreshCw className="h-4.5 w-4.5" />
              </button>
            </div>

          </GradientCard>
        </div>

        {/* Right Column: Audio Mixers & Online social study */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          
          {/* Soundscapes Control Box */}
          <GlassCard className="flex-1 bg-[#0b1530] border border-blue-500/20 p-6 flex flex-col justify-between text-white shadow-lg">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-display font-extrabold text-base text-white">Ambient Soundscapes</h3>
                {activeSound && (
                  <button 
                    onClick={() => { setActiveSound(null); showToast("Ambient soundscapes muted.", Volume2); }}
                    className="text-[9px] text-red-400 border border-red-500/20 rounded px-1.5 py-0.5 hover:bg-red-500/10 transition"
                  >
                    Mute
                  </button>
                )}
              </div>
              <p className="text-[11px] text-blue-200/60 mb-4">Layer ambient sounds to anchor your attention</p>
              
              <div className="grid grid-cols-2 gap-2">
                {SOUNDSCAPES.map((snd) => (
                  <button
                    key={snd.id}
                    onClick={() => { setActiveSound(snd.id); showToast(`Ambient sound layer set to ${snd.name}`, Volume2); }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left ${
                      activeSound === snd.id 
                        ? "bg-[#00f5ff]/10 border-[#00f5ff]/30 text-white font-bold"
                        : "bg-slate-800/40 border-slate-700/30 text-slate-400 hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="text-base">{snd.icon}</span>
                    <span className="text-xs">{snd.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Audio Wave Visualizer */}
            {activeSound && (
              <div className="mt-4 flex items-center justify-center gap-1.5 h-6 bg-[#050816]/60 rounded-lg border border-white/5 px-3">
                <span className="text-[9px] font-mono text-muted-foreground mr-1 uppercase">Playing:</span>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ height: [6, 16, 6] }}
                    transition={{ duration: 0.8 + i*0.1, repeat: Infinity, ease: "easeInOut" }}
                    className="w-0.5 bg-[#00F5FF] rounded-full"
                  />
                ))}
              </div>
            )}
          </GlassCard>

          {/* Social Study Partners */}
          <GlassCard className="bg-[#0b1530] border border-blue-500/20 p-6 text-white shadow-lg">
            <h3 className="font-display font-extrabold text-base text-white mb-1.5 flex items-center gap-1.5">
              <Users className="h-4.5 w-4.5 text-[#00f5ff]" /> Virtual Study Room
            </h3>
            <p className="text-[11px] text-blue-200/60 mb-3">Silent focus groups synced live on GyaanSetu</p>
            
            <div className="space-y-2.5">
              {STUDY_MATES.map((sm, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{sm.avatar}</span>
                    <div>
                      <div className="text-xs font-bold text-white leading-none">{sm.name}</div>
                      <div className="text-[9px] text-blue-200/60 mt-1 font-mono">{sm.status}</div>
                    </div>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${sm.status.includes("Focus") ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
                </div>
              ))}
            </div>
          </GlassCard>

        </div>

      </div>

      {/* Grid of 4 Interactive Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="glass p-4 rounded-2xl border border-white/5">
          <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Today's Focus</div>
          <div className="text-xl font-bold text-gradient mt-1 leading-none">
            {Math.floor(todayFocus / 60)}h {todayFocus % 60}m
          </div>
          <div className="text-[9px] text-slate-400 mt-2">Aggregated active minutes</div>
        </div>
        <button 
          onClick={() => { setActiveModal("sessions"); showToast("Opening focus sessions log...", Info); }}
          className="glass p-4 rounded-2xl border border-white/5 text-left hover:border-[#00F5FF]/30 transition hover:scale-[1.02]"
        >
          <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Sessions</div>
          <div className="text-xl font-bold text-white mt-1 leading-none">{sessionsCount}</div>
          <div className="text-[9px] text-[#00F5FF] mt-2 underline">Click to view log</div>
        </button>
        <div className="glass p-4 rounded-2xl border border-white/5">
          <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Avg Focus Score</div>
          <div className="text-xl font-bold text-gradient mt-1 leading-none">92</div>
          <div className="text-[9px] text-[#8B5CF6] mt-2">Attention stability rating</div>
        </div>
        <button 
          onClick={() => { setActiveModal("shield"); showToast("Opening distraction alert logs...", Info); }}
          className="glass p-4 rounded-2xl border border-white/5 text-left hover:border-red-500/30 transition hover:scale-[1.02]"
        >
          <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Distractions Blocked</div>
          <div className="text-xl font-bold text-red-400 mt-1 leading-none">{distractionsCount}</div>
          <div className="text-[9px] text-slate-400 mt-2 underline">Click to view alerts</div>
        </button>
      </div>

      {/* Grid of Features with interactive hooks */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { id: "timer", title: "Pomodoro Timer", desc: "Customizable work/break cycles with smooth circular progress and gentle audio cues.", tag: "Interactive" },
          { id: "ambient", title: "Ambient Soundscapes", desc: "Rain, café, forest, deep space — 24 layered ambient tracks for any mood.", tag: "Mixer Ready" },
          { id: "lofi", title: "LoFi Music", desc: "Curated chill beats library that adapts tempo to your typing rhythm." },
          { id: "analytics", title: "Focus Analytics", desc: "Heatmaps of your most productive hours and weekly attention trends." },
          { id: "shield", title: "Distraction Shield", desc: "Auto-mutes notifications and blocks distracting tabs during focus blocks." },
          { id: "social", title: "Virtual Study Room", desc: "Join silent rooms with friends — synchronized timers and presence indicators." }
        ].map((it, i) => (
          <motion.div
            key={it.title}
            whileHover={{ y: -3 }}
            onClick={() => {
              if (it.id === "ambient") {
                showToast("Toggle ambient soundscapes above to mix!", Info);
              } else {
                setActiveModal(it.id);
                showToast(`Opening ${it.title} control panel...`, Sparkles);
              }
            }}
            className="cursor-pointer"
          >
            <GlassCard className="h-full">
              <div className="flex items-start justify-between mb-3">
                <div className="h-8.5 w-8.5 rounded-xl bg-gradient-to-br from-[#00F5FF] to-[#8B5CF6] flex items-center justify-center text-[#050816] font-bold text-xs">
                  {String(i + 1).padStart(2, "0")}
                </div>
                {it.tag && (
                  <span className="text-[8px] font-mono bg-[#00F5FF]/10 px-2 py-0.5 rounded text-[#00F5FF]">{it.tag}</span>
                )}
              </div>
              <h3 className="font-display font-bold text-xs text-[#e9feff] mb-1">{it.title}</h3>
              <p className="text-[10.5px] text-slate-400 leading-normal">{it.desc}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
      </>
      ) : (
        <div className="w-full flex flex-col gap-6">
          <GlassCard className="bg-[#0b1530] border border-blue-500/20 text-white shadow-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5 mb-6 z-10 relative">
              <div>
                <h3 className="font-display font-extrabold text-lg text-[#00f5ff] flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#00f5ff]" />
                  DevInterview AI Companion
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  A local 3D VRM-driven coding interviewer bot, powered by DeepSeek-R1 (~82.6% HumanEval Accuracy) and local offline voice synthesis.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold bg-[#00f5ff]/10 text-[#00f5ff] border border-[#00f5ff]/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Target: http://localhost:{botPort}
                </span>
                <a
                  href={`http://localhost:${botPort}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white/10 hover:bg-white/15 border border-white/10 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  Open in New Tab
                  <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Iframing the Bot */}
            <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-[#050816] shadow-inner relative z-10">
              <iframe
                src={`http://localhost:${botPort}`}
                title="DevInterview Bot"
                className="w-full h-[680px] border-none"
                allow="microphone; camera; display-capture"
              />
            </div>

            {/* Launch Instructions Helper */}
            <div className="mt-6 p-4 rounded-xl bg-[#050816]/70 border border-white/5 space-y-2 z-10 relative">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Info className="h-4 w-4 text-[#00f5ff]" />
                How to start the DevInterview Bot locally?
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Since DevInterview.AI runs completely offline with 0 cloud dependencies, it connects to your GyaanSetu local backend. To run:
              </p>
              <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1 pl-1">
                <li>Open a terminal in the folder: <code className="bg-white/5 text-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px]">D:\Gyaansetu-AI\devinterviewbot</code></li>
                <li>Install dependencies (if not already done): <code className="bg-white/5 text-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px]">npm install</code></li>
                <li>Verify your local GyaanSetu backend is running on port <code className="bg-white/5 text-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px]">8000</code></li>
                <li>Run the development server: <code className="bg-white/5 text-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px]">npm run dev</code></li>
              </ol>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Pop-up Modals for interactive logs */}
      <AnimatePresence>
        
        {/* Sessions Log Modal */}
        {activeModal === "sessions" && (
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
                  <Award className="h-4.5 w-4.5 text-[#00f5ff]" />
                  Focus Sessions Completed Today
                </h4>
                <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {[
                  { time: "09:00 AM", duration: "25 min", status: "Focus Completed" },
                  { time: "10:15 AM", duration: "25 min", status: "Focus Completed" },
                  { time: "11:30 AM", duration: "25 min", status: "Focus Completed" },
                  { time: "01:00 PM", duration: "45 min", status: "Focus Completed" },
                  { time: "03:45 PM", duration: "25 min", status: "Focus Completed" },
                  { time: "05:00 PM", duration: "25 min", status: "Focus Completed" }
                ].map((s, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#050816] border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{s.time}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{s.duration} duration</div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full mt-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition"
              >
                Close Log
              </button>
            </motion.div>
          </div>
        )}

        {/* Shield Logs Modal */}
        {(activeModal === "shield" || activeModal === "analytics") && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0d1322] border border-[#00f5ff]/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl" />

              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <h4 className="font-display font-extrabold text-sm text-white flex items-center gap-1.5">
                  <ShieldAlert className="h-4.5 w-4.5 text-red-400" />
                  {activeModal === "shield" ? "Shield Alert: Distractions Blocked" : "Focus Analytics Heatmap"}
                </h4>
                <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {activeModal === "shield" ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 text-xs">
                    <span className="text-slate-300">Auto-Dim Distractions Shield:</span>
                    <button 
                      onClick={() => { setShieldActive(!shieldActive); showToast(`Distraction Shield toggled.`, ShieldAlert); }}
                      className={`px-3 py-1 rounded-lg font-mono text-[10px] font-bold transition ${
                        shieldActive ? "bg-[#00f5ff] text-[#050816]" : "bg-white/10 text-slate-400"
                      }`}
                    >
                      {shieldActive ? "ACTIVE" : "MUTED"}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {[
                      { source: "youtube.com (Tab block)", count: "12 times" },
                      { source: "facebook.com (Tab block)", count: "6 times" },
                      { source: "Slack desktop alerts", count: "29 notifications muted" }
                    ].map((d, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#050816] border border-white/5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">{d.source}</span>
                        <span className="text-[10px] font-mono text-red-400 font-bold">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 text-xs text-slate-300">
                  <p>Weekly attention consistency heatmap (Mon-Sun):</p>
                  <div className="grid grid-cols-7 gap-1.5 p-3 rounded-xl bg-[#050816] border border-white/5">
                    {[
                      { day: "M", v: 3 }, { day: "T", v: 4 }, { day: "W", v: 2 }, 
                      { day: "T", v: 5 }, { day: "F", v: 4 }, { day: "S", v: 5 }, { day: "S", v: 3 }
                    ].map((d, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold font-mono text-[10px] ${
                          d.v === 5 ? "bg-[#00f5ff] text-[#050816] shadow-[0_0_8px_#00f5ff]" :
                          d.v === 4 ? "bg-[#00f5ff]/60 text-white" :
                          d.v === 3 ? "bg-[#00f5ff]/30 text-slate-300" :
                          "bg-white/5 text-slate-500"
                        }`}>
                          {d.v * 20}%
                        </div>
                        <span className="text-[9px] text-muted-foreground mt-1 font-semibold">{d.day}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] leading-relaxed italic text-muted-foreground font-mono">
                    *Peak productivity registered on Thursday around 10:30 AM (92% focus stability).
                  </p>
                </div>
              )}

              <button
                onClick={() => setActiveModal(null)}
                className="w-full mt-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition"
              >
                Close Panel
              </button>
            </motion.div>
          </div>
        )}

        {/* Social room or LoFi details */}
        {(activeModal === "social" || activeModal === "lofi" || activeModal === "timer") && (
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
                  {activeModal === "social" && "Virtual Study Room Info"}
                  {activeModal === "lofi" && "LoFi Beats Mixer"}
                  {activeModal === "timer" && "Customizable Cycle Settings"}
                </h4>
                <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {activeModal === "social" && (
                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  <p>Study Rooms allow synchronized group timers. You are currently connected to <b>Asia-South Focus Cell</b>.</p>
                  <p>Study partners currently in the cell are listed on your sound card mixer. If you completed a Pomodoro interval, you will all earn +20 Group XP points.</p>
                </div>
              )}

              {activeModal === "lofi" && (
                <div className="space-y-3.5 text-xs text-slate-300">
                  <p>Curated Chill beats matching your keyboard typing speed:</p>
                  <div className="bg-[#050816] p-3 rounded-xl border border-white/5 space-y-2 font-mono text-[10px]">
                    <div className="flex justify-between"><span>Current Tempo:</span> <span className="text-[#00f5ff] font-bold">78 BPM</span></div>
                    <div className="flex justify-between"><span>Active Track:</span> <span className="text-white">Midnight Coffee Coding</span></div>
                  </div>
                  <button 
                    onClick={() => { setActiveModal(null); showToast("Playing Midnight Coffee Coding...", Volume2); }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] text-xs font-bold text-[#050816] transition hover:shadow-lg"
                  >
                    Play Chill Beats
                  </button>
                </div>
              )}

              {activeModal === "timer" && (
                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  <p>Configure custom work/break intervals:</p>
                  <div className="space-y-2.5 bg-[#050816] p-3 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span>Work Interval Duration:</span>
                      <span className="font-bold text-[#00F5FF]">{Math.floor(activeDuration / 60)} minutes</span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span>Rest Interval Duration:</span>
                      <span className="font-bold text-emerald-400">5 minutes</span>
                    </div>
                  </div>
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
