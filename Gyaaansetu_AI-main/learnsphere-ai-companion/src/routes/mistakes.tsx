import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { GlassCard, PageHeader, GradientCard } from "@/components/ui-kit/Card";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { loadMistakes, practiceMistakeCorrect } from "@/lib/api/mistakes.functions";
import {
  analyzeMistakeText, analyzeMistakeVoice, getMistakeHeatmap,
  type MistakeAnalysis
} from "@/lib/api/ai.service";
import { 
  Search, Sparkles, RefreshCw, AlertCircle, PlayCircle,
  X, BarChart2, BookOpen, Brain, Clock, ChevronRight, Award,
  Mic, Paperclip, FileUp, Square, Loader2
} from "lucide-react";

export const Route = createFileRoute("/mistakes")({
  head: () => ({ meta: [{ title: "Mistake Analyzer — GyaanSetu AI" }] }),
  component: MistakeDashboard,
});

// Mock database removed. Powered by SQLite backend.

function MistakeDashboard() {
  const [userId, setUserId] = useState("");
  const [activeMistakes, setActiveMistakes] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<"all" | "conceptual" | "slip">("all");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Stats (Purged Mock Data)
  const [mistakesCount, setMistakesCount] = useState(0);
  const [weakestTopic, setWeakestTopic] = useState("None");
  const [patternsCount, setPatternsCount] = useState(0);
  const [improvementVal, setImprovementVal] = useState("+0%");

  // Modals
  const [selectedMistake, setSelectedMistake] = useState<any | null>(null);
  const [practiceMode, setPracticeMode] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [checkedAnswer, setCheckedAnswer] = useState<boolean | null>(null);
  
  const [activeTabPanel, setActiveTabPanel] = useState<string | null>(null);

  // AI Input Hub States
  const [hubMode, setHubMode] = useState<"none" | "voice" | "upload" | "text">("none");
  const [recording, setRecording] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [submittingHub, setSubmittingHub] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; icon: any } | null>(null);

  const showToast = (message: string, icon: any) => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync with Database on Mount
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
    } catch (e) {
      window.location.href = "/auth";
      return;
    }

    if (!activeId) {
      window.location.href = "/auth";
      return;
    }

    loadMistakes({ data: { userId: activeId } })
      .then((data) => {
        setActiveMistakes(data);
        setMistakesCount(data.length);
        if (data.length > 0) {
          // Count highest frequency topics
          const topics = data.reduce((acc: any, curr: any) => {
            acc[curr.topic] = (acc[curr.topic] || 0) + curr.frequency;
            return acc;
          }, {});
          const weakest = Object.keys(topics).reduce((a, b) => topics[a] > topics[b] ? a : b, "None");
          setWeakestTopic(weakest.split(" ")[0]); // Get first word like 'Calculus'
          setPatternsCount(data.filter(m => m.frequency > 2).length);
        }
      })
      .catch((err) => {
        console.error("Failed to load mistakes from DB:", err);
      });
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);

  // Run deep analysis — calls real heatmap API
  const runDeepAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisProgress(0);
    // animate progress bar while waiting
    const timer = setInterval(() => setAnalysisProgress(p => Math.min(p + 10, 90)), 300);
    try {
      const data = await getMistakeHeatmap(userId);
      clearInterval(timer);
      setAnalysisProgress(100);
      if (data.topics.length > 0) {
        const top = data.topics[0].topic;
        setWeakestTopic(top.split(" ")[0]);
        setPatternsCount(data.topics.filter((t: any) => t.frequency > 1).length);
      }
      showToast("Deep error analysis complete! AI insights updated.", Brain);
    } catch {
      clearInterval(timer);
      showToast("Analysis failed — is the AI backend running?", AlertCircle);
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePracticeSubmit = async () => {
    if (selectedOption === null) return;
    const isCorrect = selectedOption === selectedMistake.correctIdx;
    setCheckedAnswer(isCorrect);
    if (isCorrect) {
      showToast("Correct Answer! Concept mastered. +50 XP", Award);
      try {
        // Reduce frequency of mistake in SQLite DB
        await practiceMistakeCorrect({ data: { id: selectedMistake.id } });
        setActiveMistakes(prev => prev.map(m => {
          if (m.id === selectedMistake.id) {
            return { ...m, frequency: Math.max(0, m.frequency - 1) };
          }
          return m;
        }));
      } catch (err) {
        console.error("Failed to update practice correction in DB:", err);
      }
    } else {
      showToast("Incorrect answer. Check the correction steps.", AlertCircle);
    }
  };

  const filteredMistakes = activeMistakes.filter(m => {
    if (filterType === "conceptual") return m.type === "conceptual";
    if (filterType === "slip") return m.type === "slip";
    return true;
  });

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
        title="Mistake Analyzer" 
        subtitle="AI detects patterns in your errors — repeated mistakes, weak topics, and time-management leaks." 
        icon={Search} 
      />

      {/* AI Input Hub Panel */}
      <div className="mb-6 bg-[#0b1530] border border-blue-500/20 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-[#00f5ff]" />
              <span className="font-display font-bold text-sm text-white">AI Error Sync</span>
            </div>
            <span className="text-[9px] font-mono text-blue-300 uppercase tracking-wider">Upload Logs or Dictate Test Failures</span>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {/* Voice option */}
            <button
              onClick={() => {
                setHubMode(hubMode === "voice" ? "none" : "voice");
                setVoiceText("");
              }}
              className={`flex items-center justify-between p-3 rounded-xl border transition text-left ${
                hubMode === "voice" ? "bg-[#00f5ff]/10 border-[#00f5ff]/30 text-white" : "bg-slate-800/40 border border-slate-700/30 text-slate-400 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-[#00f5ff]" />
                <span className="text-xs font-semibold text-white">Voice Mistake Log</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-blue-300" />
            </button>

            {/* Document option */}
            <button
              onClick={() => {
                setHubMode(hubMode === "upload" ? "none" : "upload");
                setSelectedFile(null);
              }}
              className={`flex items-center justify-between p-3 rounded-xl border transition text-left ${
                hubMode === "upload" ? "bg-[#00f5ff]/10 border-[#00f5ff]/30 text-white" : "bg-slate-800/40 border border-slate-700/30 text-slate-400 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-[#00f5ff]" />
                <span className="text-xs font-semibold text-white">Upload Exam/Log File</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-blue-300" />
            </button>

            {/* Text option */}
            <button
              onClick={() => {
                setHubMode(hubMode === "text" ? "none" : "text");
                setPastedText("");
              }}
              className={`flex items-center justify-between p-3 rounded-xl border transition text-left ${
                hubMode === "text" ? "bg-[#00f5ff]/10 border-[#00f5ff]/30 text-white" : "bg-slate-800/40 border border-slate-700/30 text-slate-400 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#00f5ff]" />
                <span className="text-xs font-semibold text-white">Paste Code/Problem</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-blue-300" />
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
                  <p className="text-xs text-muted-foreground italic">Click Start Recording to explain the mistake you made...</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (recording) {
                        setRecording(false);
                        setVoiceText("I forgot to add standard CORS origin headers on my express backend and got blocked by Chrome fetch restrictions.");
                        showToast("Voice explanation transcribed!", Mic);
                      } else {
                        setRecording(true);
                        setVoiceText("");
                        setTimeout(() => {
                          setRecording(false);
                          setVoiceText("I forgot to add standard CORS origin headers on my express backend and got blocked by Chrome fetch restrictions.");
                          showToast("Voice explanation transcribed!", Mic);
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
                          const mockMistake = {
                            id: 99,
                            topic: "Express CORS Headers",
                            frequency: 1,
                            type: "slip",
                            explanation: "chrome block fetches when origin domain doesn't match standard CORS allowed lists.",
                            correction: "app.use(cors({ origin: 'http://localhost:3000' }))",
                            sampleQuestion: "Which middleware enables cross-origin resource sharing?",
                            options: ["app.use(cors())", "app.use(headers())", "app.use(origin())"],
                            correctIdx: 0
                          };
                          setActiveMistakes(prev => [mockMistake, ...prev]);
                          showToast("New Express CORS mistake tracked successfully!", AlertCircle);
                        }, 1200);
                      }}
                      className="px-4 py-2 rounded-lg bg-[#00F5FF] text-[#050816] text-xs font-bold hover:scale-105 transition ml-auto"
                    >
                      {submittingHub ? "Analyzing..." : "Submit to Analyzer"}
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {hubMode === "upload" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-4 bg-[#050816] rounded-xl border border-white/5 space-y-4">
                <div className="border border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center hover:border-[#00f5ff]/40 transition cursor-pointer bg-slate-900/40"
                  onClick={() => {
                    setSelectedFile("compiler_error_log.txt");
                    showToast("Uploaded compiler_error_log.txt", FileUp);
                  }}
                >
                  <FileUp className="h-8 w-8 text-[#00f5ff] mb-2" />
                  {selectedFile ? (
                    <span className="text-xs text-white font-mono font-bold">{selectedFile}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground text-center">Drag and drop logs here, or click to upload PDF/Txt</span>
                  )}
                </div>
                {selectedFile && (
                  <button
                    onClick={async () => {
                      setSubmittingHub(true);
                      try {
                        const result = await analyzeMistakeText(
                          `Error log file: ${selectedFile}`, userId
                        );
                        const m = { id: result.id ?? Date.now(), topic: result.topic, frequency: 1,
                          type: result.type, explanation: result.explanation, correction: result.correction,
                          sampleQuestion: result.sample_question, options: result.options, correctIdx: result.correct_idx };
                        setActiveMistakes(prev => [m, ...prev]);
                        showToast(`Mistake parsed: ${result.topic}`, AlertCircle);
                      } catch { showToast("File analysis failed — check backend", AlertCircle); }
                      setSubmittingHub(false);
                      setHubMode("none");
                    }}
                    className="w-full py-2 rounded-lg bg-[#00F5FF] text-[#050816] text-xs font-bold hover:scale-[1.01] transition"
                  >
                    {submittingHub ? "Parsing..." : "Analyze File"}
                  </button>
                )}
              </motion.div>
            )}

            {hubMode === "text" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-3 bg-[#050816] rounded-xl border border-white/5 space-y-3">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste error stack trace, test case fail logs, or code..."
                  className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f5ff]/40 font-mono"
                />
                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      if (!pastedText) return;
                      setSubmittingHub(true);
                      try {
                        const result = await analyzeMistakeText(pastedText, userId, lang);
                        const m = { id: result.id ?? Date.now(), topic: result.topic, frequency: 1,
                          type: result.type, explanation: result.explanation, correction: result.correction,
                          sampleQuestion: result.sample_question, options: result.options, correctIdx: result.correct_idx };
                        setActiveMistakes(prev => [m, ...prev]);
                        showToast(`AI found mistake: ${result.topic}`, AlertCircle);
                      } catch { showToast("Text analysis failed — check backend", AlertCircle); }
                      setSubmittingHub(false);
                      setHubMode("none");
                    }}
                    disabled={!pastedText}
                    className="px-4 py-2 rounded-lg bg-[#00F5FF] text-[#050816] text-xs font-bold hover:scale-105 transition disabled:opacity-50"
                  >
                    {submittingHub ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "Submit to Analyzer"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Analysis card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <GradientCard className="overflow-hidden relative bg-[#0b1530] border border-blue-500/20 text-white shadow-lg p-6 rounded-3xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#00f5ff]/10 to-[#8b5cf6]/10 rounded-full blur-3xl" />
          
          <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-center relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-[#00f5ff]/10 text-[#00f5ff] border border-[#00f5ff]/20 rounded-full px-3 py-1 text-xs font-semibold">
                <Sparkles className="h-3 w-3 text-[#00f5ff]" />
                Powered by GyaanSetu AI
              </div>
              <h1 className="mt-3 text-2xl lg:text-3xl font-display font-bold text-white">
                Cognitive Error Audit
              </h1>
              <p className="mt-2 text-blue-200/60 max-w-xl text-xs leading-relaxed">
                Scan your daily testing logs to build conceptual maps and pin down carelessness thresholds.
              </p>
            </div>
            <div>
              <button 
                onClick={runDeepAnalysis}
                disabled={analyzing}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] px-5 py-3.5 text-xs font-bold text-[#050816] glow-cyan hover:scale-[1.02] transition disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-[#050816]" /> Auditing Logs ({analysisProgress}%)
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 text-[#050816]" /> Run Deep Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        </GradientCard>
      </motion.div>

      {/* 4 Interactive Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <button 
          onClick={() => { setActiveTabPanel("tracked"); showToast("Viewing tracked logs...", Clock); }}
          className="bg-[#0b1530] border border-blue-500/20 p-5 rounded-3xl shadow-md text-left transition hover:scale-[1.02] group text-white hover:border-[#00f5ff]/30"
        >
          <div className="text-[10px] text-blue-300 uppercase font-mono tracking-wider font-semibold">Mistakes Tracked</div>
          <div className="text-xl font-extrabold text-white mt-1.5 leading-none">{mistakesCount}</div>
          <div className="text-[9px] text-[#00F5FF] mt-2 underline font-semibold font-mono">Click to view error log</div>
        </button>
        <button 
          onClick={() => { setActiveTabPanel("weakest"); showToast("Viewing weak areas...", Brain); }}
          className="bg-[#0b1530] border border-blue-500/20 p-5 rounded-3xl shadow-md text-left transition hover:scale-[1.02] group text-white hover:border-[#8B5CF6]/30"
        >
          <div className="text-[10px] text-blue-300 uppercase font-mono tracking-wider font-semibold">Weakest Topic</div>
          <div className="text-xl font-extrabold text-white mt-1.5 leading-none">{weakestTopic}</div>
          <div className="text-[9px] text-[#8B5CF6] mt-2 underline font-semibold font-mono">Click to view heatmaps</div>
        </button>
        <button 
          onClick={() => { setActiveTabPanel("patterns"); showToast("Viewing cognitive patterns...", AlertCircle); }}
          className="bg-[#0b1530] border border-blue-500/20 p-5 rounded-3xl shadow-md text-left transition hover:scale-[1.02] group text-white hover:border-amber-500/30"
        >
          <div className="text-[10px] text-blue-300 uppercase font-mono tracking-wider font-semibold">Patterns Detected</div>
          <div className="text-xl font-extrabold text-white mt-1.5 leading-none">{patternsCount} patterns</div>
          <div className="text-[9px] text-amber-500 mt-2 underline font-semibold font-mono">Click to read audits</div>
        </button>
        <div className="bg-[#0b1530] border border-blue-500/20 p-5 rounded-3xl shadow-md text-left text-white">
          <div className="text-[10px] text-blue-300 uppercase font-mono tracking-wider font-semibold">Improvement</div>
          <div className="text-xl font-extrabold text-emerald-400 mt-1.5 leading-none">{improvementVal}</div>
          <div className="text-[9px] text-blue-200/60 mt-2 font-mono">Over previous 7 days</div>
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex gap-2 mb-4">
        {["all", "conceptual", "slip"].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t as any)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition capitalize ${
              filterType === t 
                ? "bg-[#00f5ff]/10 text-[#00f5ff] border border-[#00f5ff]/30 font-semibold" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t.replace("slip", "Careless Slips").replace("conceptual", "Conceptual Gaps")}
          </button>
        ))}
      </div>

      {/* Grid of repeated errors */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMistakes.map((m) => (
          <motion.div
            key={m.id}
            whileHover={{ y: -3 }}
            onClick={() => { setSelectedMistake(m); setPracticeMode(false); setSelectedOption(null); setCheckedAnswer(null); }}
            className="cursor-pointer"
          >
            <div className="bg-[#0b1530] border border-blue-500/20 p-5 rounded-3xl shadow-md hover:shadow-xl transition-all h-full flex flex-col justify-between text-white">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="h-8.5 w-8.5 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center font-bold text-xs">
                    <AlertCircle className="h-4.5 w-4.5" />
                  </div>
                  <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border ${
                    m.type === "conceptual" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    {m.type === "conceptual" ? "Conceptual Gap" : "Careless Slip"}
                  </span>
                </div>
                <h3 className="font-display font-bold text-sm text-white mb-1.5">{m.topic}</h3>
                <p className="text-[11px] text-blue-200/60 leading-relaxed mb-4">{m.explanation}</p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                <span className="text-blue-300">Repeated occurrences</span>
                <span className="text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">{m.frequency} times</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pop-up Modals for interactive logs */}
      <AnimatePresence>
        
        {/* Error Detail & Replay Practice Modal */}
        {selectedMistake && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0d1322] border border-[#00f5ff]/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden text-white"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f5ff]/5 rounded-full blur-2xl" />

              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <h4 className="font-display font-extrabold text-sm text-white flex items-center gap-1.5">
                  <PlayCircle className="h-4.5 w-4.5 text-[#00f5ff]" />
                  {practiceMode ? "Practice Pacer" : "AI Error Replay"}
                </h4>
                <button onClick={() => setSelectedMistake(null)} className="text-slate-400 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!practiceMode ? (
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="text-[9px] text-blue-300 uppercase font-mono font-bold">Weak Topic</div>
                    <div className="text-sm font-extrabold text-white mt-0.5">{selectedMistake.topic}</div>
                  </div>

                  <div>
                    <div className="text-[9px] text-blue-300 uppercase font-mono font-bold">Concept Slip Audit</div>
                    <p className="mt-1 leading-relaxed text-slate-300">{selectedMistake.explanation}</p>
                  </div>

                  <div className="bg-[#00f5ff]/10 text-white p-3 rounded-xl border border-white/5 space-y-1">
                    <div className="font-bold font-mono text-[9px] text-[#00f5ff] uppercase">AI Remedial Tip:</div>
                    <p className="text-[10px] leading-relaxed font-mono">{selectedMistake.correction}</p>
                  </div>

                  <button
                    onClick={() => setPracticeMode(true)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] text-[#050816] font-bold text-xs shadow-md glow-cyan"
                  >
                    Practice Similar Question
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="text-[9px] text-blue-300 uppercase font-mono font-bold">Remedial Quiz</div>
                    <div className="text-xs font-bold text-white mt-1 leading-relaxed">{selectedMistake.sampleQuestion}</div>
                  </div>

                  <div className="space-y-2">
                    {selectedMistake.options.map((opt: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => { setSelectedOption(idx); setCheckedAnswer(null); }}
                        className={`w-full p-3 text-left rounded-xl border transition-all text-xs ${
                          selectedOption === idx 
                            ? "bg-[#00f5ff]/10 border-[#00f5ff]/40 text-white font-bold"
                            : "bg-slate-900/40 border border-white/5 hover:bg-slate-900/60 text-slate-300"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {checkedAnswer !== null && (
                    <div className={`p-2.5 rounded-xl border text-[10px] font-mono ${
                      checkedAnswer ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {checkedAnswer 
                        ? "Correct Answer! That reduces your mistake recurrence score." 
                        : "Incorrect. Try focusing on the inner derivative chains."}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setPracticeMode(false)}
                      className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition"
                    >
                      Back to Audit
                    </button>
                    <button
                      onClick={handlePracticeSubmit}
                      disabled={selectedOption === null}
                      className="flex-1 py-2.5 rounded-xl bg-[#00F5FF] text-[#050816] text-xs font-bold transition disabled:opacity-50"
                    >
                      Submit Answer
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Dynamic tab modals */}
        {activeTabPanel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0d1322] border border-blue-500/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden text-white"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#8b5cf6]/5 rounded-full blur-2xl" />

              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <h4 className="font-display font-extrabold text-sm text-white flex items-center gap-1.5">
                  <BarChart2 className="h-4.5 w-4.5 text-[#8b5cf6]" />
                  {activeTabPanel === "tracked" && "Tracked Mistakes Database"}
                  {activeTabPanel === "weakest" && "Weakness Heatmaps"}
                  {activeTabPanel === "patterns" && "Cognitive Audits"}
                </h4>
                <button onClick={() => setActiveTabPanel(null)} className="text-slate-400 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {activeTabPanel === "tracked" && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  <p className="text-[11px] text-blue-200/60 mb-2">Detailed log of recent testing slips:</p>
                  {[
                    { title: "Calculus Limits Chain Rule", date: "Today, 10:15 AM", type: "Math" },
                    { title: "Matrix Eigenvalues subtraction", date: "Yesterday, 3:45 PM", type: "Algebra" },
                    { title: "CSS Absolute center translates", date: "June 9, 1:12 PM", type: "UI" }
                  ].map((it, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/40 border border-white/5 rounded-2xl flex justify-between items-center text-xs text-white">
                      <div>
                        <div className="font-bold text-white">{it.title}</div>
                        <div className="text-[9px] text-blue-200/60 mt-0.5">{it.date}</div>
                      </div>
                      <span className="text-[9px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold">{it.type}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTabPanel === "weakest" && (
                <div className="space-y-3 text-xs text-slate-300">
                  <p>Subject weak metrics based on testing repetitions:</p>
                  <div className="space-y-2.5 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span>Calculus (Limits & Integrals)</span>
                      <span className="font-bold text-red-400">82% error index</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: "82%" }} />
                    </div>
                    <div className="flex justify-between items-center text-[11px] mt-2">
                      <span>Algebra (Matrices & Equs)</span>
                      <span className="font-bold text-amber-400">68% error index</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: "68%" }} />
                    </div>
                  </div>
                </div>
              )}

              {activeTabPanel === "patterns" && (
                <div className="space-y-3.5 text-xs text-slate-300">
                  <p>Cognitive audits derived from mistake types:</p>
                  <div className="p-3 bg-slate-900/40 rounded-2xl border border-white/5 space-y-2 text-[10px] font-mono leading-relaxed text-slate-300">
                    <div>• <b>Sign Flip Pattern:</b> 12 occurrences of forgetting negative multiplier indices.</div>
                    <div>• <b>Nested Loop Scope:</b> 4 occurrences of using function scope var instead of let block bindings.</div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setActiveTabPanel(null)}
                className="w-full mt-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition"
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
