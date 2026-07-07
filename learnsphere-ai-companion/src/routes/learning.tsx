import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { GlassCard, PageHeader, GradientCard } from "@/components/ui-kit/Card";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { loadCourses, updateCourseProgress } from "@/lib/api/learning.functions";
import { 
  BookOpen, Sparkles, Play, Award, Bookmark, ArrowRight, 
  Check, RefreshCw, X, FileText, Download, Info, Zap,
  Mic, Paperclip, FileUp, ChevronRight
} from "lucide-react";

export const Route = createFileRoute("/learning")({
  head: () => ({ meta: [{ title: "Learning Path — GyaanSetu AI" }] }),
  component: LearningDashboard,
});

// Mock course database removed. Powered by SQLite backend.

function LearningDashboard() {
  const [userId, setUserId] = useState("");
  const [courses, setCourses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "in-progress" | "completed">("all");
  
  // Modal states
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [activeModalList, setActiveModalList] = useState<string | null>(null);

  // Resume states
  const [resuming, setResuming] = useState(false);

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

  // Sync session and load from DB
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

    loadCourses({ data: { userId: activeId } })
      .then((data) => {
        setCourses(data);
      })
      .catch((err) => {
        console.error("Failed to load courses from DB:", err);
      });
  }, []);

  const handleResumeCourse = async () => {
    setResuming(true);
    // Find first React course to resume (either "react" or "react-user_id")
    const reactCourse = courses.find(c => c.id.startsWith("react"));
    if (!reactCourse) {
      setResuming(false);
      return;
    }
    
    try {
      await updateCourseProgress({ data: { id: reactCourse.id, progress: 88, tag: "88% done", userId } });
      setCourses(prev => prev.map(c => {
        if (c.id === reactCourse.id) {
          return { ...c, progress: 88, tag: "88% done" };
        }
        return c;
      }));
      showToast("Advanced React Patterns progressed to 88%! +50 XP", Award);
    } catch (err) {
      console.error("Failed to update course progress in DB:", err);
    } finally {
      setResuming(false);
    }
  };

  const filteredCourses = courses.filter(c => {
    if (activeTab === "in-progress") return c.progress > 0 && c.progress < 100;
    if (activeTab === "completed") return c.progress === 100;
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
        title="Learning Path" 
        subtitle="Your Netflix-style learning hub — recommended, in-progress, and completed courses curated by AI." 
        icon={BookOpen} 
      />

      {/* AI Input Hub Panel */}
      <div className="mb-6 bg-[#0b1530] border border-blue-500/20 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-[#00f5ff]" />
              <span className="font-display font-bold text-sm text-white">AI Course Generator</span>
            </div>
            <span className="text-[9px] font-mono text-blue-300 uppercase tracking-wider">Upload Syllabus or Dictate Topics</span>
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
                <span className="text-xs font-semibold text-white">Voice Topic Input</span>
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
                hubMode === "upload" ? "bg-[#00f5ff]/10 border-[#00f5ff]/30 text-white" : "bg-slate-800/40 border-slate-700/30 text-slate-400 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-[#00f5ff]" />
                <span className="text-xs font-semibold text-white">Upload Syllabus PDF</span>
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
                hubMode === "text" ? "bg-[#00f5ff]/10 border-[#00f5ff]/30 text-white" : "bg-slate-800/40 border-slate-700/30 text-slate-400 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#00f5ff]" />
                <span className="text-xs font-semibold text-white">Paste Syllabus Outline</span>
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
                  <p className="text-xs text-muted-foreground italic">Click Start Recording to dictate your study topic...</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (recording) {
                        setRecording(false);
                        setVoiceText("Create an intensive curriculum for Quantum Superposition algorithms and quantum gates.");
                        showToast("Voice topic transcribed successfully!", Mic);
                      } else {
                        setRecording(true);
                        setVoiceText("");
                        setTimeout(() => {
                          setRecording(false);
                          setVoiceText("Create an intensive curriculum for Quantum Superposition algorithms and quantum gates.");
                          showToast("Voice topic transcribed successfully!", Mic);
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
                          const mockCourse = {
                            id: "quantum-custom",
                            title: "Quantum Algorithms",
                            desc: "Learn quantum gates, superposition math, and Shor's algorithms from scratch.",
                            tag: "Custom",
                            progress: 0,
                            hours: "18 hours total",
                            syllabus: ["Vector Spaces & qubits", "Hadamard & Pauli Gates", "Fourier transform math"]
                          };
                          setCourses(prev => [mockCourse, ...prev]);
                          showToast("Quantum Algorithms custom course generated!", Zap);
                        }, 1200);
                      }}
                      className="px-4 py-2 rounded-lg bg-[#00F5FF] text-[#050816] text-xs font-bold hover:scale-105 transition ml-auto"
                    >
                      {submittingHub ? "Generating..." : "Generate Course"}
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {hubMode === "upload" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-4 bg-[#050816] rounded-xl border border-white/5 space-y-4">
                <div className="border border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center hover:border-[#00f5ff]/40 transition cursor-pointer bg-slate-900/40"
                  onClick={() => {
                    setSelectedFile("syllabus_advanced_math.pdf");
                    showToast("Uploaded syllabus_advanced_math.pdf", FileUp);
                  }}
                >
                  <FileUp className="h-8 w-8 text-[#00f5ff] mb-2" />
                  {selectedFile ? (
                    <span className="text-xs text-white font-mono font-bold">{selectedFile}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground text-center">Drag and drop syllabus here, or click to upload PDF/Doc</span>
                  )}
                </div>
                {selectedFile && (
                  <button
                    onClick={() => {
                      setSubmittingHub(true);
                      setTimeout(() => {
                        setSubmittingHub(false);
                        setHubMode("none");
                        const mockCourse = {
                          id: "math-custom",
                          title: "Advanced Engineering Math",
                          desc: "Differential equations, Laplace transforms, and complex variable mapping.",
                          tag: "Custom",
                          progress: 0,
                          hours: "22 hours total",
                          syllabus: ["Fourier Series integrals", "Laplace transforms", "Complex differentiation residue theorem"]
                        };
                        setCourses(prev => [mockCourse, ...prev]);
                        showToast("AI custom math course generated from syllabus PDF!", Zap);
                      }, 1200);
                    }}
                    className="w-full py-2 rounded-lg bg-[#00F5FF] text-[#050816] text-xs font-bold hover:scale-[1.01] transition"
                  >
                    {submittingHub ? "Analyzing syllabus..." : "Generate Custom Course"}
                  </button>
                )}
              </motion.div>
            )}

            {hubMode === "text" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-3 bg-[#050816] rounded-xl border border-white/5 space-y-3">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste custom study notes or topics here..."
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
                        showToast("AI custom course generated from pasted text outline!", Zap);
                      }, 1200);
                    }}
                    disabled={!pastedText}
                    className="px-4 py-2 rounded-lg bg-[#00F5FF] text-[#050816] text-xs font-bold hover:scale-105 transition disabled:opacity-50"
                  >
                    {submittingHub ? "Analyzing text..." : "Generate Course"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main CTA Section */}
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
                Netflix-Style Learning Hub
              </h1>
              <p className="mt-2 text-blue-200/60 max-w-xl text-xs leading-relaxed">
                Resume where you left off or customize nodes using offline local model recommendations. Current active course: <span className="font-semibold text-white">Advanced React Patterns</span>.
              </p>
            </div>
            <div>
              <button 
                onClick={handleResumeCourse}
                disabled={resuming}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] px-5 py-3.5 text-xs font-bold text-[#050816] glow-cyan hover:scale-[1.02] transition disabled:opacity-50"
              >
                {resuming ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Loading Session...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-[#050816]" /> Resume Last Course
                  </>
                )}
              </button>
            </div>
          </div>
        </GradientCard>
      </motion.div>

      {/* 4 Interactive Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { id: "progress", label: "Courses In Progress", value: "3 courses", color: "text-[#00F5FF]" },
          { id: "completed", label: "Completed", value: "23 courses", color: "text-emerald-500" },
          { id: "certs", label: "Certificates", value: "11 credentials", color: "text-amber-500" },
          { id: "recommend", label: "AI Recommended", value: "18 paths", color: "text-[#8B5CF6]" }
        ].map((st) => (
          <button
            key={st.id}
            onClick={() => { setActiveModalList(st.id); showToast(`Opening logs for ${st.label}`, Info); }}
            className="bg-[#0b1530] border border-blue-500/20 p-5 rounded-3xl shadow-md text-left transition hover:scale-[1.02] group text-white hover:border-[#00F5FF]/30"
          >
            <div className="text-[10px] text-blue-300 uppercase font-mono tracking-wider font-semibold">{st.label}</div>
            <div className="text-xl font-extrabold text-white mt-1.5 leading-none">{st.value.split(" ")[0]}</div>
            <div className={`text-[9px] mt-2 underline ${st.color} font-semibold font-mono`}>
              Click to view {st.value.split(" ")[1]}
            </div>
          </button>
        ))}
      </div>

      {/* Grid Tabs Filter */}
      <div className="flex gap-2 mb-4">
        {["all", "in-progress", "completed"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition capitalize ${
              activeTab === tab 
                ? "bg-[#00f5ff]/10 text-[#00f5ff] border border-[#00f5ff]/30 font-semibold" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.replace("-", " ")}
          </button>
        ))}
      </div>

      {/* Grid of Courses */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCourses.map((c, i) => (
          <motion.div
            key={c.id}
            whileHover={{ y: -3 }}
            onClick={() => { setSelectedCourse(c); showToast(`Details loaded for ${c.title}`, Bookmark); }}
            className="cursor-pointer"
          >
            <div className="bg-[#0b1530] border border-blue-500/20 p-5 rounded-3xl shadow-md hover:shadow-xl transition-all h-full flex flex-col justify-between text-white">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="h-8.5 w-8.5 rounded-xl bg-gradient-to-br from-[#00F5FF] to-[#8B5CF6] flex items-center justify-center text-[#050816] font-bold text-xs font-mono">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  {c.tag && (
                    <span className="text-[9px] font-bold font-mono bg-[#00F5FF]/10 px-2 py-0.5 rounded text-[#00F5FF] border border-[#00F5FF]/20">
                      {c.tag}
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-sm text-white mb-1.5">{c.title}</h3>
                <p className="text-[11px] text-blue-200/60 leading-relaxed">{c.desc}</p>
              </div>

              {/* Progress visual inside card */}
              <div className="mt-4 pt-3 border-t border-white/5">
                <div className="flex justify-between items-center text-[10px] text-blue-300 font-mono mb-1">
                  <span>Current Progress</span>
                  <span className="font-bold text-white">{c.progress}%</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] rounded-full" style={{ width: `${c.progress}%` }} />
                </div>
              </div>

            </div>
          </motion.div>
        ))}
      </div>

      {/* Pop-up Modals for interactive logs */}
      <AnimatePresence>
        
        {/* Course Details Modal */}
        {selectedCourse && (
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
                  <BookOpen className="h-4.5 w-4.5 text-[#00f5ff]" />
                  Curriculum Details
                </h4>
                <button onClick={() => setSelectedCourse(null)} className="text-slate-400 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="text-[9px] text-blue-300 uppercase font-mono font-bold">Course Title</div>
                  <div className="text-sm font-extrabold text-white mt-0.5">{selectedCourse.title}</div>
                </div>

                <div>
                  <div className="text-[9px] text-blue-300 uppercase font-mono font-bold">Estimated Time</div>
                  <div className="font-semibold text-slate-300">{selectedCourse.hours}</div>
                </div>

                <div>
                  <div className="text-[9px] text-blue-300 uppercase font-mono font-bold mb-1.5">Syllabus Milestones</div>
                  <div className="space-y-1.5">
                    {selectedCourse.syllabus.map((syl: string, idx: number) => (
                      <div key={idx} className="flex gap-2 items-center text-[10.5px] text-slate-300 bg-slate-900/40 p-2 rounded-lg border border-white/5 font-mono">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        {syl}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedCourse.progress < 100 ? (
                  <button
                    onClick={() => {
                      setSelectedCourse(null);
                      handleResumeCourse();
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] text-[#050816] font-bold text-xs shadow-md glow-cyan"
                  >
                    Start Study Unit
                  </button>
                ) : (
                  <div className="text-center py-2.5 bg-emerald-500/10 text-[10px] text-emerald-400 font-bold rounded-xl border border-emerald-500/20">
                    Course Fully Completed!
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Stats Lists Modal */}
        {activeModalList && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0d1322] border border-[#00f5ff]/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden text-white"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#8b5cf6]/5 rounded-full blur-2xl" />

              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <h4 className="font-display font-extrabold text-sm text-white flex items-center gap-1.5">
                  <Award className="h-4.5 w-4.5 text-[#8b5cf6]" />
                  {activeModalList === "progress" && "Active Courses"}
                  {activeModalList === "completed" && "Completed Courses"}
                  {activeModalList === "certs" && "Your Certifications"}
                  {activeModalList === "recommend" && "AI Recommended Sprints"}
                </h4>
                <button onClick={() => setActiveModalList(null)} className="text-slate-400 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {activeModalList === "progress" && (
                  courses.filter(c => c.progress > 0 && c.progress < 100).map((c) => (
                    <div key={c.id} className="p-3 bg-slate-900/40 border border-white/5 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-white">{c.title}</div>
                        <div className="text-[10px] text-blue-200/60 mt-0.5">{c.hours} remaining</div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#00f5ff]">{c.progress}% done</span>
                    </div>
                  ))
                )}

                {activeModalList === "completed" && (
                  courses.filter(c => c.progress === 100).map((c) => (
                    <div key={c.id} className="p-3 bg-slate-900/40 border border-white/5 rounded-2xl flex justify-between items-center text-xs">
                      <span className="font-bold text-white">{c.title}</span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                        Completed
                      </span>
                    </div>
                  ))
                )}

                {activeModalList === "certs" && (
                  [
                    { name: "AWS Cloud Architect Cert", code: "AWS-SAP-892" },
                    { name: "Advanced React Patterns Diploma", code: "GYAANSETU-332" },
                    { name: "Financial Literacy 101 Badge", code: "GYAANSETU-008" }
                  ].map((crt, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/40 border border-white/5 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-white">{crt.name}</div>
                        <div className="text-[9px] text-blue-200/60 font-mono mt-0.5">ID: {crt.code}</div>
                      </div>
                      <button 
                        onClick={() => showToast(`Downloading ${crt.name} PDF...`, Download)}
                        className="p-2 bg-slate-800/40 border border-slate-700/30 rounded-xl hover:bg-slate-800/60 text-white transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}

                {activeModalList === "recommend" && (
                  [
                    { name: "Generative AI Agent orchestration", reason: "98% math match" },
                    { name: "High-Performance Rust Sockets", reason: "SysDesign follow-up" },
                    { name: "UI Design Micro-animations", reason: "Growth Edge support" }
                  ].map((rec, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/40 border border-white/5 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-white">{rec.name}</div>
                        <div className="text-[9px] text-[#8b5cf6] font-semibold mt-0.5">{rec.reason}</div>
                      </div>
                      <button 
                        onClick={() => {
                          setActiveModalList(null);
                          showToast("Added to study path!", Zap);
                        }}
                        className="p-1.5 bg-[#00f5ff] text-[#050816] rounded-lg hover:scale-105 transition font-bold"
                      >
                        + Add
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setActiveModalList(null)}
                className="w-full mt-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition"
              >
                Close List
              </button>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

    </AppLayout>
  );
}
