import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { GlassCard, PageHeader, GradientCard } from "@/components/ui-kit/Card";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { 
  Smile, Heart, Activity, Brain, Sparkles, MessageSquare, 
  Send, RefreshCw, Play, Square, Award, Droplet, Info, 
  Check, User, Wind, Zap, ShieldAlert, ChevronRight
} from "lucide-react";
import { 
  syncHealthMetrics, getHealthIndex, logBreathingSession, 
  analyzeMoodFeeling, chatCompanion 
} from "@/lib/api/ai.service";

export const Route = createFileRoute("/mood")({
  head: () => ({ meta: [{ title: "Mood Assistant — GyaanSetu AI" }] }),
  component: MoodAssistantPage,
});

// Breathing configurations
const BREATHING_TECHNIQUES = [
  {
    name: "Box Breathing (4-4-4-4)",
    desc: "Navy SEAL method for instant calm and nervous system regulation.",
    phases: [
      { name: "Inhale", duration: 4, action: "breathe-in" },
      { name: "Hold", duration: 4, action: "hold" },
      { name: "Exhale", duration: 4, action: "breathe-out" },
      { name: "Hold", duration: 4, action: "hold" }
    ]
  },
  {
    name: "4-7-8 Relaxing Breath",
    desc: "Natural tranquilizer for the nervous system to ease anxiety.",
    phases: [
      { name: "Inhale", duration: 4, action: "breathe-in" },
      { name: "Hold", duration: 7, action: "hold" },
      { name: "Exhale", duration: 8, action: "breathe-out" }
    ]
  }
];

const MOODS = [
  { emoji: "😊", label: "Joyful", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { emoji: "😐", label: "Neutral", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { emoji: "😔", label: "Sad", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { emoji: "😠", label: "Stressed", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  { emoji: "😴", label: "Exhausted", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" }
];

function MoodAssistantPage() {
  const [userId, setUserId] = useState("");
  const [focusIndex, setFocusIndex] = useState(85);
  const [stressLevel, setStressLevel] = useState("Low");
  const [streak, setStreak] = useState(14);
  const [moodToday, setMoodToday] = useState("🙂 Calm");
  const [loading, setLoading] = useState(false);

  // Mood Analyzer states
  const [selectedEmoji, setSelectedEmoji] = useState("😊");
  const [feelingText, setFeelingText] = useState("");
  const [moodResult, setMoodResult] = useState<string | null>(null);

  // Companion Chat states
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: "Hi! I'm Asha, your wellness companion. How is your energy and focus today? Feel free to vent or ask for a quick relaxation exercise!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Breathing Visualizer states
  const [breathingActive, setBreathingActive] = useState(false);
  const [activeTechniqueIdx, setActiveTechniqueIdx] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [breathCycleCount, setBreathCycleCount] = useState(0);
  const breathingTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync parameters
  const [screenHours, setScreenHours] = useState(5.5);
  const [waterCups, setWaterCups] = useState(6);
  const [sleepHours, setSleepHours] = useState(7.5);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const userStr = localStorage.getItem("gyaansetu_user");
    if (!userStr) {
      window.location.href = "/auth";
      return;
    }
    const user = JSON.parse(userStr);
    setUserId(user.id);
    loadMetrics(user.id);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadMetrics = async (uId: string) => {
    try {
      const idx = await getHealthIndex(uId);
      if (idx && idx.focus_index !== undefined) {
        setFocusIndex(idx.focus_index);
        setStressLevel(idx.stress_level || "Low");
        if (idx.date) {
          setMoodToday(idx.stress_level === "Calm" ? "🙂 Calm" : `😐 ${idx.stress_level}`);
        }
      }
    } catch (err) {
      console.error("Failed to load health index:", err);
    }
  };

  const handleSyncHealth = async () => {
    setLoading(true);
    try {
      const res = await syncHealthMetrics({
        screen_hours: screenHours,
        water_cups: waterCups,
        sleep_hours: sleepHours,
        stress_level: stressLevel
      }, userId);
      setFocusIndex(res.focus_index);
      showToast(`Health synced! Focus Health Index is ${res.focus_index}%`, 'success');
      loadMetrics(userId);
    } catch (err) {
      showToast("Failed to sync health metrics", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleMoodSubmit = async () => {
    if (!feelingText.trim()) return;
    setLoading(true);
    setMoodResult(null);
    try {
      const result = await analyzeMoodFeeling(selectedEmoji, feelingText, userId);
      setMoodResult(result.analysis);
      setStressLevel(result.suggested_stress);
      setMoodToday(`${selectedEmoji} ${selectedEmoji === '😊' ? 'Good' : selectedEmoji === '😠' ? 'Stressed' : 'Neutral'}`);
      
      // Sync database stress levels based on suggestion
      await syncHealthMetrics({
        screen_hours: screenHours,
        water_cups: waterCups,
        sleep_hours: sleepHours,
        stress_level: result.suggested_stress
      }, userId);
      
      showToast("Llama 3.1 completed mood analysis & wellness recommendations", "success");
      loadMetrics(userId);
    } catch (err) {
      showToast("Error executing Llama mood checks", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChatSend = async (messageText?: string) => {
    const textToSend = messageText || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    if (!messageText) setChatInput("");
    const updatedMessages = [...chatMessages, { role: 'user', content: textToSend } as const];
    setChatMessages(updatedMessages);
    setChatLoading(true);

    try {
      const result = await chatCompanion(textToSend, updatedMessages, userId);
      setChatMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Sorry, I ran into a connection glitch. Let's try again!" }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Breathing loop control
  const startBreathing = () => {
    if (breathingActive) return;
    setBreathingActive(true);
    setBreathCycleCount(1);
    setPhaseIdx(0);
    const technique = BREATHING_TECHNIQUES[activeTechniqueIdx];
    const initialDuration = technique.phases[0].duration;
    setSecondsRemaining(initialDuration);
  };

  const stopBreathing = () => {
    setBreathingActive(false);
    if (breathingTimer.current) {
      clearInterval(breathingTimer.current);
    }
  };

  // Breathing phase manager timer
  useEffect(() => {
    if (!breathingActive) return;

    const technique = BREATHING_TECHNIQUES[activeTechniqueIdx];
    breathingTimer.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Progress to next phase
          const nextIdx = (phaseIdx + 1) % technique.phases.length;
          setPhaseIdx(nextIdx);
          
          if (nextIdx === 0) {
            // Completed one full cycle
            setBreathCycleCount((prevCount) => {
              const newCount = prevCount + 1;
              if (newCount > 3) {
                // Complete session after 3 cycles (about 1 minute)
                stopBreathing();
                completeBreathingSession();
                return 0;
              }
              return newCount;
            });
          }
          return technique.phases[nextIdx].duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (breathingTimer.current) clearInterval(breathingTimer.current);
    };
  }, [breathingActive, phaseIdx, activeTechniqueIdx]);

  const completeBreathingSession = async () => {
    try {
      const res = await logBreathingSession(userId, 60);
      setFocusIndex(res.focus_index);
      setStressLevel("Calm");
      setMoodToday("🙂 Calm");
      showToast("Breathing session completed! focus health boosted! +5 Focus Index.", "success");
      loadMetrics(userId);
    } catch (err) {
      showToast("Breathing logged locally. Take a deep breath!", "success");
    }
  };

  const activeTechnique = BREATHING_TECHNIQUES[activeTechniqueIdx];
  const activePhase = activeTechnique.phases[phaseIdx];

  // Circle scaling animation based on breathing action
  const getScaleClass = () => {
    if (!breathingActive) return "scale-90 bg-blue-500/10 border-blue-500/30";
    if (activePhase.action === "breathe-in") return "scale-125 bg-[#00F5FF]/20 border-[#00F5FF]/50 shadow-[0_0_40px_rgba(0,245,255,0.4)]";
    if (activePhase.action === "breathe-out") return "scale-75 bg-purple-500/20 border-purple-500/50 shadow-[0_0_30px_rgba(139,92,246,0.3)]";
    return "scale-100 bg-amber-500/20 border-amber-500/50 shadow-[0_0_35px_rgba(245,158,11,0.35)]"; // hold
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-none space-y-6">
        
        {/* Toast Notifications */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border flex items-center gap-2.5 shadow-2xl backdrop-blur-md text-xs font-mono font-semibold ${
                toast.type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/25' :
                toast.type === 'error' ? 'bg-rose-950/80 text-rose-400 border-rose-500/25' :
                'bg-[#0b1530]/85 text-[#00F5FF] border-[#00F5FF]/25'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current animate-ping" />
              <span>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <GradientCard className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#00F5FF]/10 px-3 py-1 text-[10px] font-mono font-bold text-[#00F5FF] border border-[#00F5FF]/20">
                  <Sparkles className="h-3 w-3 text-[#00F5FF]" />
                  Empathetic Wellness Engine Active
                </div>
                <h1 className="mt-3 text-xl lg:text-2xl font-display font-bold text-white">Mood Assistant & AI Wellness</h1>
                <p className="mt-2 text-slate-300 max-w-xl text-xs leading-relaxed">
                  Analyze your emotional focus logs, practice interactive bio-adaptive breathing guides, and consult your mental health assistant Asha.
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleChatSend("Asha, give me a quick 1-minute positive affirmation.")}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition"
                >
                  Affirmation <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={startBreathing}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] px-4.5 py-2.5 text-xs font-bold text-[#050816] glow-cyan hover:scale-[1.02] transition-all"
                >
                  <Wind className="h-4 w-4" /> Start Breathing
                </button>
              </div>
            </div>
          </GradientCard>
        </motion.div>

        {/* Top Metrics Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0b1530] border border-blue-500/20 text-white shadow-md p-4.5 rounded-2xl flex flex-col justify-between">
            <div className="text-[10px] text-blue-200/70 uppercase font-mono tracking-wider">Mood Today</div>
            <div className="text-lg font-bold text-white mt-1.5 leading-none flex items-center gap-1.5">
              <span className="text-xl shrink-0">{moodToday.split(" ")[0]}</span>
              <span className="truncate">{moodToday.split(" ").slice(1).join(" ") || "Calm"}</span>
            </div>
            <div className="text-[9px] text-blue-200/60 mt-2">Current focus feeling</div>
          </div>
          
          <div className="bg-[#0b1530] border border-blue-500/20 text-white shadow-md p-4.5 rounded-2xl flex flex-col justify-between">
            <div className="text-[10px] text-blue-200/70 uppercase font-mono tracking-wider">Stress Index</div>
            <div className={`text-lg font-bold mt-1.5 leading-none ${
              stressLevel === "High" ? "text-rose-400" :
              stressLevel === "Moderate" ? "text-amber-400" :
              stressLevel === "Calm" ? "text-emerald-400 animate-pulse" :
              "text-[#00F5FF]"
            }`}>{stressLevel}</div>
            <div className="text-[9px] text-blue-200/60 mt-2">Autonomic nervous state</div>
          </div>
          
          <div className="bg-[#0b1530] border border-blue-500/20 text-white shadow-md p-4.5 rounded-2xl flex flex-col justify-between">
            <div className="text-[10px] text-blue-200/70 uppercase font-mono tracking-wider">Focus Health Index</div>
            <div className="text-lg font-bold text-white mt-1.5 leading-none flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-[#00F5FF]">{focusIndex}</span>
              <span className="text-[10px] text-slate-400">/100</span>
            </div>
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-2">
              <div 
                className="h-full bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] transition-all duration-500" 
                style={{ width: `${focusIndex}%` }} 
              />
            </div>
          </div>
          
          <div className="bg-[#0b1530] border border-blue-500/20 text-white shadow-md p-4.5 rounded-2xl flex flex-col justify-between">
            <div className="text-[10px] text-blue-200/70 uppercase font-mono tracking-wider">Weekly Streak</div>
            <div className="text-lg font-bold text-[#8B5CF6] mt-1.5 leading-none flex items-center gap-1.5">
              <Zap className="h-4.5 w-4.5 fill-[#8B5CF6] text-transparent" />
              <span>{streak} Days</span>
            </div>
            <div className="text-[9px] text-blue-200/60 mt-2">Consistent wellness syncing</div>
          </div>
        </div>

        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: Interactive Check-in & Breathing Exercise */}
          <div className="lg:col-span-7 space-y-6 flex flex-col">
            
            {/* Daily Mood Check-In Card */}
            <GlassCard className="p-6 bg-[#0b1530] border border-blue-500/20 text-white shadow-lg space-y-4">
              <div>
                <h3 className="font-display font-extrabold text-base text-white flex items-center gap-2">
                  <Smile className="h-5 w-5 text-[#00F5FF]" /> Daily Mood Check-in
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">How is your mental wellness and learning productivity today?</p>
              </div>

              {/* Emoji Selector */}
              <div className="flex justify-between gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.emoji}
                    onClick={() => setSelectedEmoji(m.emoji)}
                    className={`flex-1 py-3 px-1 rounded-xl border transition flex flex-col items-center gap-1 hover:scale-[1.03] ${
                      selectedEmoji === m.emoji 
                        ? `${m.color} border-current ring-1 ring-offset-2 ring-offset-[#0b1530] ring-current`
                        : "border-slate-800 bg-slate-900/30 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="text-xl">{m.emoji}</span>
                    <span className="text-[9px] font-mono tracking-wide">{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Description Text Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-mono">DESCRIBE HOW YOU FEEL</label>
                <textarea
                  value={feelingText}
                  onChange={(e) => setFeelingText(e.target.value)}
                  placeholder="E.g. Feeling a bit tired and anxious about my React coding exam tomorrow..."
                  className="w-full h-20 p-3 rounded-xl bg-black/35 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00F5FF]/50 transition resize-none"
                />
              </div>

              {/* Action Button */}
              <button
                onClick={handleMoodSubmit}
                disabled={loading || !feelingText.trim()}
                className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-[#00F5FF] hover:bg-slate-700/60 font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-40"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                Analyze focus mood with Llama 3.1
              </button>

              {/* Analysis Result */}
              {moodResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-[#00F5FF]/5 border border-[#00F5FF]/10 text-xs text-slate-200 leading-relaxed font-sans space-y-2"
                >
                  <div className="font-mono text-[9px] text-[#00F5FF] font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Llama 3.1 Wellness Recommendation:
                  </div>
                  <p>{moodResult}</p>
                </motion.div>
              )}
            </GlassCard>

            {/* Interactive Breathing Visualizer */}
            <GlassCard className="p-6 bg-[#0b1530] border border-blue-500/20 text-white shadow-lg space-y-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-extrabold text-base text-white flex items-center gap-2">
                  <Wind className="h-5 w-5 text-[#8B5CF6]" /> Bio-Adaptive Breathing visualizer
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Control focus and lower stress with guided respiratory timing sessions.</p>
              </div>

              {/* Guide Settings */}
              <div className="flex gap-2">
                {BREATHING_TECHNIQUES.map((tech, idx) => (
                  <button
                    key={tech.name}
                    onClick={() => {
                      if (!breathingActive) setActiveTechniqueIdx(idx);
                    }}
                    disabled={breathingActive}
                    className={`flex-1 p-2.5 rounded-xl border text-left transition ${
                      activeTechniqueIdx === idx
                        ? "bg-[#8B5CF6]/10 border-[#8B5CF6]/30 text-white"
                        : "bg-slate-900/30 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="text-[10px] font-bold">{tech.name}</div>
                    <div className="text-[8px] mt-1 text-slate-400 leading-relaxed truncate">{tech.desc}</div>
                  </button>
                ))}
              </div>

              {/* Breathing Circle Visualizer Area */}
              <div className="flex-1 flex flex-col items-center justify-center py-6 min-h-[220px]">
                <div 
                  className={`h-32 w-32 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-[4000ms] ease-in-out ${getScaleClass()}`}
                >
                  {breathingActive ? (
                    <div className="text-center space-y-1">
                      <div className="text-xs uppercase font-mono font-extrabold tracking-widest text-white animate-pulse">
                        {activePhase.name}
                      </div>
                      <div className="text-2xl font-mono font-bold leading-none">
                        {secondsRemaining}s
                      </div>
                    </div>
                  ) : (
                    <Wind className="h-10 w-10 text-slate-500" />
                  )}
                </div>
                {breathingActive && (
                  <div className="mt-4 text-[10px] text-slate-400 font-mono">
                    Cycle {breathCycleCount}/3 • Relax your shoulders and follow the rhythm
                  </div>
                )}
              </div>

              {/* Start / Stop Controls */}
              <div className="flex gap-2">
                {breathingActive ? (
                  <button
                    onClick={stopBreathing}
                    className="w-full py-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-400 hover:bg-rose-950/40 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" /> Stop Breathing Session
                  </button>
                ) : (
                  <button
                    onClick={startBreathing}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] text-[#050816] font-extrabold text-xs flex items-center justify-center gap-1.5 transition hover:shadow-[0_0_15px_rgba(0,245,255,0.3)]"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> Start Breathing Guide (1 Min)
                  </button>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Right Column: Asha AI Companion Chat & Sync Panel */}
          <div className="lg:col-span-5 space-y-6 flex flex-col">
            
            {/* Asha AI Companion Chat Panel */}
            <GlassCard className="p-6 bg-[#0b1530] border border-blue-500/20 text-white shadow-lg flex-1 flex flex-col justify-between min-h-[350px]">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#00F5FF] to-[#8B5CF6] flex items-center justify-center shadow-md">
                      <Sparkles className="h-4 w-4 text-[#050816]" />
                    </div>
                    <div>
                      <h3 className="font-display font-extrabold text-xs leading-none">Asha</h3>
                      <span className="text-[8px] font-mono text-[#00F5FF]">empthatic companion</span>
                    </div>
                  </div>
                  <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Llama 3.1 Live</span>
                </div>

                {/* Messages Body */}
                <div className="h-[210px] overflow-y-auto pr-1 space-y-3.5 my-3">
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex gap-2 text-[11px] leading-relaxed max-w-[85%] ${
                        msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                      }`}
                    >
                      <div className={`h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-[9px] ${
                        msg.role === 'user' 
                          ? 'bg-slate-700 text-white' 
                          : 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30'
                      }`}>
                        {msg.role === 'user' ? <User className="h-3 w-3" /> : 'A'}
                      </div>
                      <div className={`p-2.5 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#e9feff] rounded-tr-none'
                          : 'bg-slate-800/40 border border-slate-700/30 text-slate-200 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-2 text-[11px] mr-auto">
                      <div className="h-6 w-6 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] flex items-center justify-center text-[9px]">
                        A
                      </div>
                      <div className="p-2.5 rounded-2xl bg-slate-800/40 border border-slate-700/30 text-slate-400 rounded-tl-none flex items-center gap-1.5">
                        <RefreshCw className="h-3 w-3 animate-spin text-[#8B5CF6]" />
                        thinking...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Preset prompts & Input Controls */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button 
                    onClick={() => handleChatSend("I'm feeling very stressed and burnt out today.")}
                    className="shrink-0 px-2 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[8px] transition"
                  >
                    😫 Feeling stressed
                  </button>
                  <button 
                    onClick={() => handleChatSend("What are some quick focus tips for study sessions?")}
                    className="shrink-0 px-2 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[8px] transition"
                  >
                    🧠 Focus tips
                  </button>
                  <button 
                    onClick={() => handleChatSend("Help me calm down before my exam starts.")}
                    className="shrink-0 px-2 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[8px] transition"
                  >
                    🍀 Pre-exam panic
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleChatSend(); }}
                    placeholder="Chat with Asha..."
                    className="flex-1 px-3 py-2 rounded-xl bg-black/35 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/50 transition"
                  />
                  <button
                    onClick={() => handleChatSend()}
                    disabled={chatLoading || !chatInput.trim()}
                    className="p-2 rounded-xl bg-[#8B5CF6] text-[#050816] hover:bg-[#8B5CF6]/85 transition disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </GlassCard>

            {/* Sync daily wellness metrics manually */}
            <GlassCard className="p-6 bg-[#0b1530] border border-blue-500/20 text-white shadow-lg space-y-4">
              <div>
                <h3 className="font-display font-extrabold text-base text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[#00F5FF]" /> Wellness Metrics Sync
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Input your daily tracking numbers to calculate the index.</p>
              </div>

              <div className="space-y-3">
                {/* Screen Time Hours */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>SCREEN TIME HOURS</span>
                    <span className="text-white font-bold">{screenHours}h</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="16" 
                    step="0.5" 
                    value={screenHours}
                    onChange={(e) => setScreenHours(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00F5FF]" 
                  />
                </div>

                {/* Water cups */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>WATER CUPS DRUNK</span>
                    <span className="text-white font-bold flex items-center gap-0.5">
                      <Droplet className="h-3.5 w-3.5 text-blue-400 fill-blue-400/20" />
                      {waterCups}/8 cups
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="12" 
                    step="1" 
                    value={waterCups}
                    onChange={(e) => setWaterCups(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-400" 
                  />
                </div>

                {/* Sleep hours */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>SLEEP DURATION</span>
                    <span className="text-white font-bold">{sleepHours}h</span>
                  </div>
                  <input 
                    type="range" 
                    min="3" 
                    max="12" 
                    step="0.5" 
                    value={sleepHours}
                    onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#8B5CF6]" 
                  />
                </div>
              </div>

              {/* Sync Trigger button */}
              <button
                onClick={handleSyncHealth}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#00F5FF]/10 border border-[#00F5FF]/20 text-[#00F5FF] hover:bg-[#00F5FF]/20 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
                Sync Daily Wellness Metrics
              </button>
            </GlassCard>
            
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
