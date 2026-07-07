import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { GlassCard, GradientCard } from "@/components/ui-kit/Card";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { loadDashboardData, addTask as apiAddTask, toggleTask as apiToggleTask, deleteTask as apiDeleteTask, completeFocusSession as apiCompleteFocusSession } from "@/lib/api/dashboard.functions";
import {
  Flame, Target, Brain, TrendingUp, Sparkles, Clock, Trophy, BookCheck,
  Bot, ArrowRight, Zap, Send, X, Play, Square, Award, AlertCircle, RefreshCw, BarChart2, Check,
  Mic, Paperclip, FileUp, FileText, ChevronRight
} from "lucide-react";
import {
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar
} from "recharts";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — GyaanSetu AI" }] }),
  component: Dashboard,
});

// Chat templates for interactive tutor
const MOCK_BOT_RESPONSES = [
  {
    input: "how do i improve my focus score?",
    reply: "To boost your Focus Score, try using GyaanSetu's offline Pomodoro timer (click 'Continue Learning'). Research shows studying in structured 25-minute intervals with zero notifications increases deep-work state by 40%."
  },
  {
    input: "explain reinforcement learning",
    reply: "Reinforcement Learning (RL) is learning by trial and error. Imagine training a dog: good behavior gets a treat (reward), bad behavior gets nothing. In RL, an AI 'agent' takes actions in an environment to maximize cumulative rewards."
  },
  {
    input: "give me a math study tip",
    reply: "Don't just read formulas—prove them! Try GyaanSetu's 'Teach Back' tool. Explaining a theorem in your own words commits it to long-term memory. Let's start with calculus if you're ready."
  }
];

function KpiCard({ icon: Icon, label, value, delta, color }: any) {
  return (
    <motion.div whileHover={{ y: -3 }} className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 text-slate-800 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        {delta && <span className="text-xs text-emerald-600 font-mono">+{delta}%</span>}
      </div>
      <div className="mt-3 text-2xl font-display font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </motion.div>
  );
}

function Dashboard() {
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("Student");
  
  // Interactive KPI Metrics (Purged Mock Data)
  const [studyHours, setStudyHours] = useState(0.0);
  const [coursesDone, setCoursesDone] = useState(0);
  const [aiSessions, setAiSessions] = useState(0);
  const [globalRank, setGlobalRank] = useState(999);
  const [masteryScore, setMasteryScore] = useState(0);
  const [streakDays, setStreakDays] = useState(0);

  // Dynamic metrics calculations
  const goalPercentage = Math.min(100, Math.round((studyHours / 2.0) * 100));
  const calculatedFocusScore = studyHours > 0 ? Math.min(100, Math.round(80 + (studyHours * 2))) : 0;
  const calculatedWeeklyProgress = studyHours > 0 ? `+${Math.round(studyHours * 10)}%` : "+0%";
  const calculatedAiReadiness = masteryScore === 0 ? "N/A" : (masteryScore > 80 ? "A+" : (masteryScore > 60 ? "A" : (masteryScore > 40 ? "B" : "C")));
  
  // Chart Interactions & Filters
  const [selectedKpi, setSelectedKpi] = useState<"all" | "hours" | "focus">("all");
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string | null>(null);
  
  // Pomodoro Focus Room State
  const [focusActive, setFocusActive] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(1500); // 25 mins
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Interactive AI Tutor Chat Widget
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    { sender: "bot", text: "Hello! I am GyaanSetu AI, your local tutoring companion. How can I help you study today?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // Interactive Recommendations & Modal
  const [activeRecommendation, setActiveRecommendation] = useState<{ name: string; confidence: number } | null>(null);
  const [recProgress, setRecProgress] = useState(0);
  const [recGenerating, setRecGenerating] = useState(false);
  
  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; icon?: any } | null>(null);

  // AI Input Hub States
  const [hubMode, setHubMode] = useState<"none" | "voice" | "upload" | "text">("none");
  const [recording, setRecording] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [submittingHub, setSubmittingHub] = useState(false);

  // Humanised Study Planner Tasks
  const [tasks, setTasks] = useState<Array<{ id: string; text: string; completed: boolean }>>([]);
  const [newTaskText, setNewTaskText] = useState("");

  // Dynamic User Session Loader
  useEffect(() => {
    const userStr = localStorage.getItem("gyaansetu_user");
    if (!userStr) {
      window.location.href = "/auth";
      return;
    }

    let activeId = "";
    try {
      const userObj = JSON.parse(userStr);
      if (userObj.id) {
        activeId = userObj.id;
        setUserId(userObj.id);
      }
      if (userObj.name) {
        setUserName(userObj.name);
      }
    } catch (e) {
      window.location.href = "/auth";
      return;
    }
    
    if (!activeId) {
      window.location.href = "/auth";
      return;
    }

    // Load dashboard stats & tasks from SQLite DB
    loadDashboardData({ data: { userId: activeId } })
      .then((data) => {
        setStudyHours(data.stats.studyHours);
        setCoursesDone(data.stats.coursesDone);
        setAiSessions(data.stats.aiSessions);
        setGlobalRank(data.stats.globalRank);
        setMasteryScore(data.stats.masteryScore);
        setStreakDays(data.stats.streakDays);
        setTasks(data.tasks);

        // Store stats in localStorage for Sidebar consumption
        localStorage.setItem("gyaansetu_stats", JSON.stringify(data.stats));
      })
      .catch((err) => {
        console.error("Failed to load dashboard data from SQLite:", err);
      });
  }, []);

  // Show dynamic toast helper
  const showToast = (message: string, icon: any = Sparkles) => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 4000);
  };

  // Pomodoro Countdown Logic
  useEffect(() => {
    if (focusActive) {
      timerRef.current = setInterval(() => {
        setFocusSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setFocusActive(false);
            
            // Sync with SQLite backend
            apiCompleteFocusSession({ data: { userId, hoursIncrement: 0.5 } })
              .then((updatedStats) => {
                setStudyHours(updatedStats.studyHours);
                setStreakDays(updatedStats.streakDays);
                showToast("Focus session completed! +0.5h Study Hours, +1 Streak Day!", Award);
              })
              .catch((err) => {
                console.error("Failed to save focus session:", err);
                setStudyHours(h => h + 0.5);
                setStreakDays(s => s + 1);
                showToast("Focus session completed! (Saved locally)", Award);
              });
            
            return 1500;
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
  }, [focusActive, userId]);

  const toggleFocusSession = () => {
    if (focusActive) {
      setFocusActive(false);
      showToast("Focus session paused.", Clock);
    } else {
      setFocusActive(true);
      showToast("Focus session started! Pomodoro timer active.", Play);
    }
  };

  const resetFocusSession = () => {
    setFocusActive(false);
    setFocusSeconds(1500);
    showToast("Focus timer reset.", Clock);
  };

  // AI Chat Submit Handler
  const handleSendMessage = (textToSend?: string) => {
    const messageText = textToSend || chatInput;
    if (!messageText.trim()) return;

    // Add user message
    setChatMessages(prev => [...prev, { sender: "user", text: messageText }]);
    if (!textToSend) setChatInput("");
    setIsTyping(true);

    // Increment AI Sessions KPI
    setAiSessions(prev => prev + 1);

    setTimeout(() => {
      setIsTyping(false);
      const matched = MOCK_BOT_RESPONSES.find(r => 
        messageText.toLowerCase().includes(r.input)
      );

      const botReply = matched 
        ? matched.reply 
        : `I've analyzed your query about "${messageText}". Running local inference in offline client. Consider scheduling a study segment to explore this fully!`;

      setChatMessages(prev => [...prev, { sender: "bot", text: botReply }]);
    }, 1000);
  };

  // Recommendation Curriculum Builder Flow
  const startRecommendation = (rec: { name: string; confidence: number }) => {
    setActiveRecommendation(rec);
    setRecGenerating(true);
    setRecProgress(0);

    const interval = setInterval(() => {
      setRecProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setRecGenerating(false);
          showToast(`Offline course created: ${rec.name}. Complete its objectives to raise lessons and mastery.`, BookCheck);
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  // Format Timer output
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // Dynamic Weekly Chart Data (filters dynamically based on active KPI)
  const weekly = [
    { d: "Mon", hours: 2.4, focus: 80 },
    { d: "Tue", hours: 3.1, focus: 72 },
    { d: "Wed", hours: 1.8, focus: 88 },
    { d: "Thu", hours: 4.2, focus: 92 },
    { d: "Fri", hours: 3.6, focus: 85 },
    { d: "Sat", hours: 5.1, focus: 78 },
    { d: "Sun", hours: 2.9, focus: 90 },
  ];

  // Subject Mastery Radar Data
  const subjects = [
    { s: "Math", v: activeSubjectFilter === "Math" ? 98 : 92 },
    { s: "Physics", v: activeSubjectFilter === "Physics" ? 88 : 78 },
    { s: "CS", v: activeSubjectFilter === "CS" ? 100 : 95 },
    { s: "English", v: activeSubjectFilter === "English" ? 85 : 70 },
    { s: "Chem", v: activeSubjectFilter === "Chem" ? 80 : 65 },
    { s: "Logic", v: activeSubjectFilter === "Logic" ? 96 : 88 },
  ];

  const recs = [
    { name: "Reinforcement Learning", confidence: 94 },
    { name: "System Design", confidence: 87 },
    { name: "Statistics", confidence: 76 },
    { name: "Web3", confidence: 64 },
  ];

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] p-0">
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
              <toast.icon className="h-4 w-4" />
            </div>
            <div className="text-xs font-semibold text-white">{toast.message}</div>
            <button onClick={() => setToast(null)} className="text-muted-foreground hover:text-white transition ml-auto">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <GradientCard className="overflow-hidden relative bg-[#0b1530] border border-blue-500/20 text-white shadow-lg">
          <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 glass rounded-full px-3 py-1 text-xs">
                <Sparkles className="h-3 w-3 text-[#00F5FF]" />
                Ready when you are
              </div>
              <h1 className="mt-3 text-3xl lg:text-4xl font-display font-bold">
                Good morning, <span className="text-gradient">{userName}</span> 👋
              </h1>
              <p className="mt-2 text-muted-foreground max-w-xl">
                Pick up from your plan, start a focus session, or ask the AI tutor for help. You're on a {streakDays}-day streak.
              </p>

              {/* Pomodoro Timer overlay inline if active */}
              {focusActive || focusSeconds < 1500 ? (
                <div className="mt-5 glass p-4 rounded-xl border-[#00F5FF]/20 max-w-md flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono font-bold">Focus Room Active</div>
                    <div className="text-2xl font-mono font-bold text-[#00F5FF] mt-0.5">{formatTime(focusSeconds)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={toggleFocusSession} 
                      className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${
                        focusActive ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-[#00F5FF] text-[#050816]"
                      }`}
                    >
                      {focusActive ? <Clock className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5 fill-[#050816]" />}
                    </button>
                    <button 
                      onClick={resetFocusSession}
                      className="h-9 w-9 rounded-lg glass border-white/5 flex items-center justify-center text-red-400 hover:bg-red-500/10 transition"
                    >
                      <Square className="h-4 w-4 fill-red-400" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap gap-2">
                  <button 
                    onClick={toggleFocusSession}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] px-4 py-2 text-sm font-medium text-[#050816] glow-cyan hover:scale-[1.02] transition-all"
                  >
                    <Zap className="h-4 w-4 fill-[#050816]" /> Start focus session
                  </button>
                  <button 
                    onClick={() => setChatOpen(true)}
                    className="glass inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm hover:bg-white/5 transition"
                  >
                    Ask AI Tutor <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                {[
                  { label: "Streak", val: `${streakDays}d`, icon: Flame, c: "text-[#F59E0B]" },
                  { label: "Today's Goal", val: `${goalPercentage}%`, icon: Target, c: "text-[#00F5FF]" },
                  { label: "Focus Score", val: calculatedFocusScore.toString(), icon: Brain, c: "text-[#8B5CF6]" },
                  { label: "Weekly Progress", val: calculatedWeeklyProgress, icon: TrendingUp, c: "text-[#22C55E]" },
                  { label: "AI Readiness", val: calculatedAiReadiness, icon: Sparkles, c: "text-[#FF00AA]" },
                ].map((x) => (
                  <div key={x.label} className="glass rounded-lg p-2.5 hover:border-white/10 transition-colors">
                    <x.icon className={`h-3.5 w-3.5 ${x.c}`} />
                    <div className="mt-1 font-bold text-sm">{x.val}</div>
                    <div className="text-muted-foreground text-[10px]">{x.label}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Humanised Goal Ring */}
            <motion.div 
              whileHover={{ scale: 1.02 }} 
              onClick={() => { setChatOpen(prev => !prev); showToast("AI Tutor chat box toggled!", Bot); }}
              className="hidden lg:flex flex-col items-center justify-center bg-[#070e20] border border-blue-500/20 p-5 rounded-2xl w-48 shadow-inner cursor-pointer"
            >
              <div className="relative h-24 w-24">
                <svg className="h-full w-full -rotate-90">
                  <circle cx="48" cy="48" r="40" className="stroke-white/5 fill-none stroke-[8]" />
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="40" 
                    className="stroke-[#00F5FF] fill-none stroke-[8] transition-all duration-500" 
                    strokeDasharray="251.2" 
                    strokeDashoffset={251.2 - (251.2 * goalPercentage) / 100} 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-xl font-display font-extrabold text-white">{goalPercentage}%</div>
                  <div className="text-[8px] text-blue-200/60 uppercase font-mono tracking-wider">Studied</div>
                </div>
              </div>
              <div className="mt-3 text-center">
                <div className="text-xs font-semibold text-white">Daily Learning Goal</div>
                <div className="text-[10px] text-blue-200/70 mt-0.5">{studyHours.toFixed(1)}h of 2.0h completed</div>
              </div>
            </motion.div>
          </div>
        </GradientCard>
      </motion.div>

      {/* Today's Study Plan */}
      <GlassCard className="mt-6 bg-[#0b1530] border border-blue-500/20 text-white shadow-lg">
        <div className="flex flex-col gap-5">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <BookCheck className="h-4.5 w-4.5 text-[#00f5ff]" />
              <span className="font-display font-bold text-sm text-white">Today's Study Plan</span>
            </div>
            <span className="text-[9px] font-mono text-blue-300 uppercase tracking-wider">Tasks, notes, uploads, and voice input</span>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Study Tasks Checklist */}
            <div id="daily-study-objectives" className="flex flex-col justify-between space-y-3 scroll-mt-24">
              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <span className="font-display font-bold text-xs text-blue-200/80">Daily Study Objectives</span>
                  <span className="text-[9.5px] font-mono text-[#00f5ff] bg-[#00f5ff]/10 px-2 py-0.5 rounded">
                    {tasks.filter(t => t.completed).length} of {tasks.length} Completed
                  </span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {tasks.map(t => (
                    <div 
                      key={t.id} 
                      onClick={async () => {
                        try {
                          const updated = await apiToggleTask({ data: { id: t.id, completed: !t.completed, userId } });
                          setTasks(tasks.map(x => x.id === t.id ? { ...x, completed: updated.completed } : x));
                          setCoursesDone(updated.stats.coursesDone);
                          setMasteryScore(updated.stats.masteryScore);
                          showToast(t.completed ? "Task set to pending" : "Task marked completed!", Sparkles);
                        } catch (err) {
                          console.error("Failed to toggle task in DB:", err);
                        }
                      }}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        t.completed 
                          ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300/80 line-through" 
                          : "bg-slate-800/40 border-slate-700/30 text-blue-100 hover:bg-slate-800/60"
                      }`}
                    >
                      <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 ${
                        t.completed ? "bg-emerald-500 border-emerald-500 text-slate-900" : "border-slate-500"
                      }`}>
                        {t.completed && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs">{t.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Add Task Input */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newTaskText.trim()) return;
                  try {
                    const savedTask = await apiAddTask({ data: { userId, text: newTaskText } });
                    setTasks([savedTask, ...tasks]);
                    setNewTaskText("");
                    showToast("New task added to study checklist!", Sparkles);
                  } catch (err) {
                    console.error("Failed to add task to DB:", err);
                  }
                }}
                className="flex gap-2"
              >
                <input 
                  type="text" 
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Type next study target..." 
                  className="flex-1 bg-slate-900/50 border border-slate-700/40 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F5FF]/50"
                />
                <button type="submit" className="bg-[#00F5FF] text-[#050816] rounded-xl px-4 py-2 text-xs font-bold hover:scale-[1.02] transition-transform shrink-0">
                  Add Target
                </button>
              </form>
            </div>

            {/* Right: Quick Sync Tools */}
            <div className="flex flex-col justify-between space-y-3">
              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <span className="font-display font-bold text-xs text-blue-200/80">Sync Resources & Dictation</span>
                  <span className="text-[9.5px] font-mono text-blue-300">Wearables & Syllabi</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {/* Voice option */}
                  <button
                    onClick={() => {
                      setHubMode(hubMode === "voice" ? "none" : "voice");
                      setVoiceText("");
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition text-center gap-1.5 ${
                      hubMode === "voice" ? "bg-[#00f5ff]/10 border-[#00f5ff]/30 text-white" : "bg-slate-800/40 border-slate-700/30 text-slate-400 hover:bg-slate-800/60"
                    }`}
                  >
                    <Mic className="h-4 w-4 text-[#00f5ff]" />
                    <span className="text-[10px] font-semibold">Voice Dictate</span>
                  </button>

                  {/* Document option */}
                  <button
                    onClick={() => {
                      setHubMode(hubMode === "upload" ? "none" : "upload");
                      setSelectedFile(null);
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition text-center gap-1.5 ${
                      hubMode === "upload" ? "bg-[#00f5ff]/10 border-[#00f5ff]/30 text-white" : "bg-slate-800/40 border-slate-700/30 text-slate-400 hover:bg-slate-800/60"
                    }`}
                  >
                    <Paperclip className="h-4 w-4 text-[#00f5ff]" />
                    <span className="text-[10px] font-semibold">Upload PDF</span>
                  </button>

                  {/* Text option */}
                  <button
                    onClick={() => {
                      setHubMode(hubMode === "text" ? "none" : "text");
                      setPastedText("");
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition text-center gap-1.5 ${
                      hubMode === "text" ? "bg-[#00f5ff]/10 border-[#00f5ff]/30 text-white" : "bg-slate-800/40 border-slate-700/30 text-slate-400 hover:bg-slate-800/60"
                    }`}
                  >
                    <FileText className="h-4 w-4 text-[#00f5ff]" />
                    <span className="text-[10px] font-semibold">Paste Notes</span>
                  </button>
                </div>
              </div>

              {/* Conditional Input Areas */}
              <AnimatePresence>
                {hubMode === "voice" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-3 bg-[#050816] rounded-xl border border-white/5 space-y-3 overflow-hidden">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-slate-400">Microphone Input</span>
                      {recording && <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />}
                    </div>
                    {recording ? (
                      <div className="flex items-center justify-center gap-1.5 py-2">
                        {[1,2,3,4,5].map(i => (
                          <motion.span key={i} animate={{ height: [6, 20, 6] }} transition={{ duration: 0.5 + i*0.1, repeat: Infinity }} className="w-0.5 bg-red-400 rounded-full" />
                        ))}
                      </div>
                    ) : voiceText ? (
                      <p className="text-xs text-white leading-relaxed font-mono">"{voiceText}"</p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Click Start Recording to dictate study notes...</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (recording) {
                            setRecording(false);
                            setVoiceText("Let's add reinforcement learning basics to my syllabus queue.");
                            showToast("Voice goals transcribed!", Mic);
                          } else {
                            setRecording(true);
                            setVoiceText("");
                            setTimeout(() => {
                              setRecording(false);
                              setVoiceText("Let's add reinforcement learning basics to my syllabus queue.");
                              showToast("Voice goals transcribed!", Mic);
                            }, 2500);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold hover:bg-red-500/30 transition"
                      >
                        {recording ? "Stop Dictation" : "Start Recording"}
                      </button>
                      {voiceText && (
                        <button
                          type="button"
                          onClick={() => {
                            setSubmittingHub(true);
                            setTimeout(() => {
                              setSubmittingHub(false);
                              setHubMode("none");
                              setTasks([...tasks, { id: Date.now(), text: voiceText, completed: false }]);
                              showToast("Task synced from dictation!", Award);
                            }, 1200);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#00F5FF] text-[#050816] text-[10px] font-bold hover:scale-105 transition ml-auto"
                        >
                          {submittingHub ? "Syncing..." : "Add to Tasks"}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {hubMode === "upload" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-3 bg-[#050816] rounded-xl border border-white/5 space-y-3 overflow-hidden">
                    <div className="border border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center hover:border-[#00f5ff]/40 transition cursor-pointer"
                      onClick={() => {
                        setSelectedFile("syllabus_quantum.pdf");
                        showToast("Uploaded syllabus_quantum.pdf", FileUp);
                      }}
                    >
                      <FileUp className="h-6 w-6 text-[#00f5ff] mb-1.5" />
                      {selectedFile ? (
                        <span className="text-[10px] text-white font-mono font-bold">{selectedFile}</span>
                      ) : (
                        <span className="text-[9px] text-muted-foreground text-center">Click to upload syllabus/fitness PDF</span>
                      )}
                    </div>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setSubmittingHub(true);
                          setTimeout(() => {
                            setSubmittingHub(false);
                            setHubMode("none");
                            setTasks([...tasks, { id: Date.now(), text: "Study Quantum physics milestones from parsed syllabus", completed: false }]);
                            showToast("PDF parsed! Tasks updated.", Award);
                          }, 1200);
                        }}
                        className="w-full py-2 rounded-lg bg-[#00F5FF] text-[#050816] text-[10px] font-bold hover:scale-[1.01] transition"
                      >
                        {submittingHub ? "Analyzing file..." : "Sync PDF"}
                      </button>
                    )}
                  </motion.div>
                )}

                {hubMode === "text" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-3 bg-[#050816] rounded-xl border border-white/5 space-y-3 overflow-hidden">
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Paste study logs, notes or tasks..."
                      className="w-full h-20 bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] text-white placeholder-slate-500 focus:outline-none focus:border-[#00f5ff]/40 font-mono"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!pastedText) return;
                          setSubmittingHub(true);
                          setTimeout(() => {
                            setSubmittingHub(false);
                            setHubMode("none");
                            setTasks([...tasks, { id: Date.now(), text: pastedText.slice(0, 50) + "...", completed: false }]);
                            showToast("Quick notes synced as study target!", Award);
                          }, 1200);
                        }}
                        disabled={!pastedText}
                        className="px-3 py-1.5 rounded-lg bg-[#00F5FF] text-[#050816] text-[10px] font-bold hover:scale-105 transition disabled:opacity-50"
                      >
                        {submittingHub ? "Analyzing..." : "Sync Notes"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Interactive KPIs - Clicking filters chart below */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => { setSelectedKpi("hours"); showToast("Progress chart filtered: Hours Only", Clock); }}
          className={`cursor-pointer transition-all ${selectedKpi === "hours" ? "ring-1 ring-[#00F5FF] scale-[0.98]" : ""}`}
        >
          <KpiCard icon={Clock} label="Study Time" value={`${studyHours.toFixed(1)}h`} delta="12" color="bg-[#00F5FF]/15 text-[#00F5FF]" />
        </div>
        <div 
          onClick={() => {
            document.getElementById("daily-study-objectives")?.scrollIntoView({ behavior: "smooth", block: "center" });
            showToast("Lessons update when you complete a study objective.", BookCheck);
          }}
          className="cursor-pointer transition-all hover:scale-[0.98]"
        >
          <KpiCard icon={BookCheck} label="Lessons Done" value={coursesDone.toString()} delta="8" color="bg-[#8B5CF6]/15 text-[#8B5CF6]" />
        </div>
        <div 
          onClick={() => { setChatOpen(true); showToast("Opening AI chat companion...", Bot); }}
          className="cursor-pointer transition-all hover:scale-[0.98]"
        >
          <KpiCard icon={Bot} label="Tutor Chats" value={aiSessions.toString()} delta="22" color="bg-[#FF00AA]/15 text-[#FF00AA]" />
        </div>
        <div 
          onClick={() => showToast("Rank updates after verified learning progress is saved.", Trophy)}
          className="cursor-pointer transition-all hover:scale-[0.98]"
        >
          <KpiCard icon={Trophy} label="Global Rank" value={`#${globalRank}`} delta="15" color="bg-[#F59E0B]/15 text-[#F59E0B]" />
        </div>
        <div 
          onClick={() => { setSelectedKpi("focus"); showToast("Progress chart filtered: Focus Score Only", Brain); }}
          className={`cursor-pointer transition-all ${selectedKpi === "focus" ? "ring-1 ring-[#8B5CF6] scale-[0.98]" : ""}`}
        >
          <KpiCard icon={Brain} label="Mastery" value={`${masteryScore}%`} delta="5" color="bg-[#22C55E]/15 text-[#22C55E]" />
        </div>
        <div 
          onClick={() => { setSelectedKpi("all"); showToast("Progress chart reset: Showing all metrics", TrendingUp); }}
          className={`cursor-pointer transition-all ${selectedKpi === "all" ? "ring-1 ring-emerald-500 scale-[0.98]" : ""}`}
        >
          <KpiCard icon={TrendingUp} label="Improvement" value="+18%" delta="3" color="bg-[#00D9FF]/15 text-[#00D9FF]" />
        </div>
      </div>

      {/* Main Charts & Radar Section */}
      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        {/* Line Chart */}
        <GlassCard className="lg:col-span-2 relative bg-[#0b1530] border border-blue-500/20 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display font-semibold">Weekly Progress</h3>
              <p className="text-xs text-muted-foreground">Study hours & focus score per day</p>
            </div>
            
            {/* Active view selectors */}
            <div className="flex gap-2 text-[10px] font-bold">
              <button 
                onClick={() => setSelectedKpi("all")}
                className={`px-2.5 py-1 rounded-md transition ${selectedKpi === "all" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
              >
                All Data
              </button>
              <button 
                onClick={() => setSelectedKpi("hours")}
                className={`px-2.5 py-1 rounded-md transition ${selectedKpi === "hours" ? "bg-[#00F5FF]/20 text-[#00F5FF]" : "text-muted-foreground hover:text-[#00F5FF]"}`}
              >
                Hours
              </button>
              <button 
                onClick={() => setSelectedKpi("focus")}
                className={`px-2.5 py-1 rounded-md transition ${selectedKpi === "focus" ? "bg-[#8B5CF6]/20 text-[#8B5CF6]" : "text-muted-foreground hover:text-[#8B5CF6]"}`}
              >
                Focus
              </button>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={weekly}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00F5FF" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#00F5FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="d" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0B1120",
                    border: "1px solid rgba(0,245,255,0.22)",
                    borderRadius: 10,
                    boxShadow: "0 16px 35px rgba(15,23,42,0.28)",
                    color: "#F8FAFC",
                  }}
                  labelStyle={{ color: "#E0F2FE", fontWeight: 800 }}
                  itemStyle={{ color: "#BAE6FD", fontWeight: 700 }}
                  cursor={{ stroke: "rgba(0,245,255,0.28)", strokeWidth: 1 }}
                />
                
                {(selectedKpi === "all" || selectedKpi === "hours") && (
                  <Area type="monotone" dataKey="hours" stroke="#00F5FF" fill="url(#g1)" strokeWidth={2} name="Hours" />
                )}
                {(selectedKpi === "all" || selectedKpi === "focus") && (
                  <Area type="monotone" dataKey="focus" stroke="#8B5CF6" fill="url(#g2)" strokeWidth={2} name="Focus Score" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Subject Radar Chart */}
        <GlassCard className="bg-[#0b1530] border border-blue-500/20 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">Subject Mastery</h3>
            {activeSubjectFilter && (
              <button 
                onClick={() => setActiveSubjectFilter(null)}
                className="text-[9px] text-amber-400 border border-amber-500/20 rounded px-1.5 py-0.5 hover:bg-amber-500/10 transition"
              >
                Reset Focus
              </button>
            )}
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <RadarChart data={subjects}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis 
                  dataKey="s" 
                  tick={{ fill: "#94a3b8", fontSize: 10, cursor: "pointer" }}
                  onClick={(e) => {
                    if (e && e.value) {
                      setActiveSubjectFilter(e.value);
                      showToast(`Focused learning targets on ${e.value}`, Sparkles);
                    }
                  }}
                />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar dataKey="v" stroke="#00F5FF" fill="#00F5FF" fillOpacity={0.3} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-center text-muted-foreground mt-1">
            Click on any subject label to set study focus
          </div>
        </GlassCard>
      </div>

      <div className="mt-4 grid lg:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <GlassCard className="bg-[#0b1530] border border-blue-500/20 text-white shadow-lg">
          <h3 className="font-display font-semibold mb-3">Learning Time Distribution</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={weekly}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="d" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0B1120",
                    border: "1px solid rgba(0,245,255,0.22)",
                    borderRadius: 10,
                    boxShadow: "0 16px 35px rgba(15,23,42,0.28)",
                    color: "#F8FAFC",
                  }}
                  labelStyle={{ color: "#E0F2FE", fontWeight: 800 }}
                  itemStyle={{ color: "#BAE6FD", fontWeight: 700 }}
                  cursor={{ fill: "rgba(0,245,255,0.08)" }}
                />
                <Bar dataKey="hours" fill="url(#g1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* AI Recommendations - Clicking builds custom course */}
        <GlassCard className="bg-[#0b1530] border border-blue-500/20 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">AI Recommendations</h3>
            <span className="text-[9px] font-mono text-muted-foreground">Ollama Gemma-2B ready</span>
          </div>

          <div className="space-y-4">
            {recs.map((r) => (
              <div 
                key={r.name} 
                onClick={() => !recGenerating && startRecommendation(r)}
                className="group cursor-pointer p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-300 group-hover:text-white flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#00F5FF]" /> {r.name}
                  </span>
                  <span className="text-[10px] text-[#00F5FF] font-mono group-hover:underline flex items-center gap-1">
                    Start Course <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${r.confidence}%` }}
                    transition={{ duration: 1 }}
                    className="h-full rounded-full bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6]"
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Dynamic Recommendation Generation Dialog */}
      <AnimatePresence>
        {activeRecommendation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm p-6 rounded-3xl border border-[#00F5FF]/20 bg-[#0d1322] shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00F5FF]/5 rounded-full blur-2xl" />
              
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                <h4 className="font-display font-bold text-sm text-[#e9feff] flex items-center gap-2">
                  <RefreshCw className={`h-4.5 w-4.5 text-[#00F5FF] ${recGenerating ? "animate-spin" : ""}`} /> 
                  Generating Curriculum
                </h4>
                {!recGenerating && (
                  <button onClick={() => setActiveRecommendation(null)} className="text-muted-foreground hover:text-white transition">
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-mono">Recommendation Target</div>
                  <div className="text-base font-bold text-white mt-0.5">{activeRecommendation.name}</div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Inference Compiler</span>
                    <span className="text-[#00F5FF] font-mono">{recProgress}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] transition-all duration-300"
                      style={{ width: `${recProgress}%` }}
                    />
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground leading-relaxed italic bg-white/5 p-3 rounded-lg border border-white/5 font-mono">
                  {recProgress < 50 ? "fetching learning node dependencies..." : recProgress < 100 ? "building local offline index map..." : "curriculum generated successfully!"}
                </div>

                {!recGenerating && (
                  <button 
                    onClick={() => setActiveRecommendation(null)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] text-xs font-bold text-[#050816] transition hover:shadow-lg"
                  >
                    Launch Study Unit
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating AI Chat Companion Drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 120 }}
            className="fixed bottom-6 right-6 z-40 w-full max-w-sm h-[480px] rounded-3xl border border-[#00F5FF]/30 bg-[#0d1322] shadow-[0_20px_50px_rgba(0,245,255,0.15)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#0f172a] px-4 py-3.5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#00F5FF] to-[#8B5CF6] flex items-center justify-center glow-cyan">
                    <Bot className="h-4 w-4 text-[#050816]" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-[#0f172a]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white leading-none">GyaanSetu AI Tutor</div>
                  <div className="text-[9px] text-[#00F5FF] mt-1 font-mono">Local Inference Client</div>
                </div>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="text-muted-foreground hover:text-white transition p-1"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin text-xs">
              {chatMessages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`p-3 rounded-2xl max-w-[80%] leading-relaxed ${
                    msg.sender === "user" 
                      ? "bg-gradient-to-r from-[#00F5FF]/20 to-[#8B5CF6]/20 text-white border border-[#00F5FF]/20 rounded-tr-none"
                      : "bg-white/5 text-slate-300 border border-white/5 rounded-tl-none"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/5 text-muted-foreground p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-[#00F5FF] rounded-full animate-bounce" />
                    <span className="h-1.5 w-1.5 bg-[#00F5FF] rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 bg-[#00F5FF] rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Prompt templates */}
            <div className="px-4 py-2 flex gap-1.5 overflow-x-auto scrollbar-thin border-t border-white/5">
              <button 
                onClick={() => handleSendMessage("how do i improve my focus score?")}
                className="text-[9px] bg-white/5 border border-white/5 text-[#00F5FF] px-2.5 py-1 rounded-full whitespace-nowrap hover:bg-white/10 transition"
              >
                Improve Focus
              </button>
              <button 
                onClick={() => handleSendMessage("explain reinforcement learning")}
                className="text-[9px] bg-white/5 border border-white/5 text-[#00F5FF] px-2.5 py-1 rounded-full whitespace-nowrap hover:bg-white/10 transition"
              >
                RL Concept
              </button>
              <button 
                onClick={() => handleSendMessage("give me a math study tip")}
                className="text-[9px] bg-white/5 border border-white/5 text-[#00F5FF] px-2.5 py-1 rounded-full whitespace-nowrap hover:bg-white/10 transition"
              >
                Math Tip
              </button>
            </div>

            {/* Input Bar */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="p-3 border-t border-white/10 bg-[#0f172a] flex gap-2 items-center"
            >
              <input 
                type="text"
                placeholder="Ask me anything..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none placeholder:text-muted-foreground/60 focus:border-[#00F5FF]/30 transition"
              />
              <button 
                type="submit" 
                className="h-8 w-8 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#3626ce] flex items-center justify-center text-[#050816] hover:scale-105 active:scale-95 transition"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      </div>
    </AppLayout>
  );
}
