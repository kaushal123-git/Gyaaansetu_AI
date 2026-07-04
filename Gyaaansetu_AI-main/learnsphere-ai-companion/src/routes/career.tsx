import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { GlassCard, PageHeader, GradientCard } from "@/components/ui-kit/Card";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { 
  X, Compass, Sparkles, RefreshCw, Zap, Mic, ChevronRight, 
  Paperclip, FileText, Target, FileUp, Check, Lock, ArrowRight, 
  Laptop, Cpu, Shield, Landmark, BookOpen, Info, Award 
} from "lucide-react";
import { generateRoadmap, analyzeResume } from "@/lib/api/ai.service";
import { loadActiveRoadmap, saveActiveRoadmap } from "@/lib/api/career.functions";

const TRACK_STYLES = [
  { border: "border-blue-500/20", text: "text-blue-400", bg: "bg-blue-500/5", glow: "shadow-[0_0_15px_rgba(59,130,246,0.05)]" },
  { border: "border-cyan-500/20", text: "text-cyan-400", bg: "bg-cyan-500/5", glow: "shadow-[0_0_15px_rgba(6,182,212,0.05)]" },
  { border: "border-purple-500/20", text: "text-purple-400", bg: "bg-purple-500/5", glow: "shadow-[0_0_15px_rgba(168,85,247,0.05)]" },
  { border: "border-amber-500/20", text: "text-amber-400", bg: "bg-amber-500/5", glow: "shadow-[0_0_15px_rgba(245,158,11,0.05)]" },
  { border: "border-rose-500/20", text: "text-rose-400", bg: "bg-rose-500/5", glow: "shadow-[0_0_15px_rgba(244,63,94,0.05)]" }
];

const mapRoadmapData = (rawRoadmap: any) => {
  if (!Array.isArray(rawRoadmap)) return [];
  const isGrid = rawRoadmap.length > 0 && ('phase_num' in rawRoadmap[0] || 'phase_title' in rawRoadmap[0] || 'months' in rawRoadmap[0]);
  if (isGrid) {
    return rawRoadmap;
  }
  return rawRoadmap.map((r: any) => ({
    id: r.id || Math.random().toString(),
    title: r.title || "Milestone",
    status: r.status || "locked",
    desc: r.desc || "",
  }));
};

const isGridRoadmap = (roadmap: any) => {
  return Array.isArray(roadmap) && roadmap.length > 0 && ('phase_num' in roadmap[0] || 'phase_title' in roadmap[0] || 'months' in roadmap[0]);
};

const CAREER_OPTIONS = [
  { id: "ai-engineer", title: "AI Engineer", match: "94%" },
  { id: "full-stack", title: "Full-Stack Developer", match: "88%" },
  { id: "data-scientist", title: "Data Scientist", match: "85%" },
  { id: "cyber-specialist", title: "Cybersecurity Specialist", match: "78%" }
];

const SECTORS = [
  {
    title: "Software Engineering",
    desc: "Full-stack, mobile, and systems engineering pathways with FAANG-grade interview prep.",
    tag: "Hot",
    roles: ["Systems Engineer", "Mobile Lead", "Full-Stack Dev"],
    salaryUS: "$130k",
    salaryIN: "₹14 LPA"
  },
  {
    title: "AI & Machine Learning",
    desc: "From foundations to LLMs, MLOps, and research-track roles at frontier AI labs.",
    tag: "Trending",
    roles: ["NLP Researcher", "MLOps Engineer", "Robotics Dev"],
    salaryUS: "$175k",
    salaryIN: "₹22 LPA"
  },
  {
    title: "Cyber Security",
    desc: "Red team, blue team, cloud security, and certifications mapped to real job postings.",
    tag: "High Demand",
    roles: ["Pen Tester", "SecOps Architect", "Security Analyst"],
    salaryUS: "$145k",
    salaryIN: "₹18 LPA"
  },
  {
    title: "Data Science",
    desc: "Statistics, ML, and business analytics — with capstones built on real datasets.",
    tag: "Stable",
    roles: ["Analytics Manager", "Data Engineer", "Quant Analyst"],
    salaryUS: "$125k",
    salaryIN: "₹16 LPA"
  },
  {
    title: "Medical (NEET)",
    desc: "Structured prep, mock tests, and AI-powered weakness detection for medical entrance.",
    tag: "Competitive",
    roles: ["Surgeon", "Clinical Analyst", "Radiologist"],
    salaryUS: "$320k",
    salaryIN: "₹24 LPA"
  },
  {
    title: "UPSC & Govt Exams",
    desc: "Daily current affairs, prelims-mains tracks, and answer-writing feedback by AI.",
    tag: "Civil Service",
    roles: ["IAS Officer", "IPS Officer", "IFS Officer"],
    salaryUS: "N/A",
    salaryIN: "₹12 LPA"
  }
];

function CareerDashboard() {
  const [userId, setUserId] = useState("");
  const [selectedCareer, setSelectedCareer] = useState<any>(null);
  const [selectedRoleOption, setSelectedRoleOption] = useState("AI Engineer");
  const [generating, setGenerating] = useState(false);
  const [roadmapProgress, setRoadmapProgress] = useState(0);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [activeNodeDetail, setActiveNodeDetail] = useState<any>(null);
  const [viewingSkillGap, setViewingSkillGap] = useState(false);
  const [selectedSector, setSelectedSector] = useState<any>(null);
  const [hubMode, setHubMode] = useState("none");
  const [recording, setRecording] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [realFile, setRealFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [submittingHub, setSubmittingHub] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string; icon: any } | null>(null);

  const showLocalToast = (message: string, icon: any) => {
    setToast({ message, icon });
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
    loadActiveRoadmap({
      data: { userId: user.id }
    }).then((active: any) => {
      if (active) {
        setSelectedCareer({
          id: active.id,
          title: active.title,
          match: `${active.match_score}%`,
          salary: active.salary_range || "₹18-35 LPA",
          trend: active.demand_trend || "+30% YoY",
          gap: `${active.skills ? active.skills.length : 0} skills`,
          skills: (active.skills || []).map((s: any) => ({
            name: s.name,
            status: s.status || "Missing"
          })),
          roadmap: mapRoadmapData(active.roadmap),
          paceGuide: active.pace_guide || ""
        });
        setShowRoadmap(true);
      }
    }).catch((err) => console.error("Failed to load active career roadmap:", err));
  }, []);

  const handleGenerateRoadmap = async () => {
    if (!selectedRoleOption) return;
    setGenerating(true);
    setRoadmapProgress(20);
    setShowRoadmap(false);
    try {
      const result = await generateRoadmap(selectedRoleOption, [], userId);
      setRoadmapProgress(65);
      await saveActiveRoadmap({
        data: {
          userId,
          title: result.title || selectedRoleOption,
          matchScore: result.match_score || 85,
          roadmapJson: JSON.stringify(result.roadmap || []),
          skillsJson: JSON.stringify(result.skill_gaps || [])
        }
      });
      setRoadmapProgress(100);
      const mapped = {
        id: "generated-path",
        title: result.title || selectedRoleOption,
        match: `${result.match_score || 85}%`,
        salary: result.salary_range || "₹18-35 LPA",
        trend: result.demand_trend || "+30% YoY",
        gap: `${(result.skill_gaps || []).length} skills`,
        skills: (result.skill_gaps || []).map((s: any) => ({
          name: s.name,
          status: s.status || "Missing"
        })),
        roadmap: mapRoadmapData(result.roadmap),
        paceGuide: result.pace_guide || ""
      };
      setSelectedCareer(mapped);
      setGenerating(false);
      setShowRoadmap(true);
      showLocalToast(`AI Custom Roadmap generated for ${mapped.title}!`, Award);
    } catch (err) {
      console.error("Failed to generate career roadmap:", err);
      setGenerating(false);
      showLocalToast("Failed to generate roadmap. Is Ollama running?", X);
    }
  };

  const handleCareerChange = (title: string) => {
    setSelectedRoleOption(title);
    showLocalToast(`Target Career set to: ${title}`, Target);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRealFile(file);
      setSelectedFile(file.name);
      showLocalToast(`Selected resume: ${file.name}`, FileUp);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] p-0">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx,.txt" />
        
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

        <PageHeader title="Career Path" subtitle="AI-driven career guidance — discover roles, salaries, skill gaps, and personalized roadmaps." icon={Compass} />
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GradientCard className="overflow-hidden relative mb-6 bg-[#0b1530] border border-blue-500/20 text-white shadow-lg p-6">
            <div className="flex flex-col gap-6">
              <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-center">
                <div>
                  <div className="inline-flex items-center gap-1.5 glass rounded-full px-3 py-1 text-xs">
                    <Sparkles className="h-3 w-3 text-[#00F5FF]" />
                    Powered by GyaanSetu AI
                  </div>
                  <h1 className="mt-3 text-xl lg:text-2xl font-display font-bold">Design Your Next Career Leap</h1>
                  <p className="mt-2 text-slate-300 max-w-xl text-xs leading-relaxed">
                    Audited daily against hiring indices. Current target path:{" "}
                    <span className="text-[#00F5FF] font-semibold">{selectedCareer ? selectedCareer.title : selectedRoleOption}</span>.
                  </p>
                </div>
                <div>
                  <button onClick={handleGenerateRoadmap} disabled={generating} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] px-5 py-3 text-xs font-bold text-[#050816] glow-cyan hover:scale-[1.02] transition-all disabled:opacity-50">
                    {generating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Compiling Roadmap...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 fill-[#050816]" /> Generate Custom Roadmap
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-[#00f5ff]" />
                    <span className="font-display font-bold text-xs text-white">AI Target Customizer (Optional)</span>
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">Upload Resume or Dictate Goals</span>
                </div>
                
                <div className="grid md:grid-cols-3 gap-3">
                  <button 
                    onClick={() => { setHubMode(hubMode === "voice" ? "none" : "voice"); setVoiceText(""); }} 
                    className={`flex items-center justify-between p-3 rounded-xl border transition text-left ${hubMode === "voice" ? "bg-[#00f5ff]/10 border-[#00f5ff]/30 text-white" : "bg-slate-800/40 border-slate-700/30 text-slate-400 hover:bg-slate-800/60"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-[#00f5ff]" />
                      <span className="text-xs font-semibold">Voice Goal Input</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  
                  <button 
                    onClick={() => { setHubMode(hubMode === "upload" ? "none" : "upload"); setSelectedFile(null); setRealFile(null); }} 
                    className={`flex items-center justify-between p-3 rounded-xl border transition text-left ${hubMode === "upload" ? "bg-[#00f5ff]/10 border-[#00f5ff]/30 text-white" : "bg-slate-800/40 border-slate-700/30 text-slate-400 hover:bg-slate-800/60"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-[#00f5ff]" />
                      <span className="text-xs font-semibold">Upload Resume / PDF</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  
                  <button 
                    onClick={() => { setHubMode(hubMode === "text" ? "none" : "text"); setPastedText(""); }} 
                    className={`flex items-center justify-between p-3 rounded-xl border transition text-left ${hubMode === "text" ? "bg-[#00f5ff]/10 border-[#00f5ff]/30 text-white" : "bg-slate-800/40 border-slate-700/30 text-slate-400 hover:bg-slate-800/60"}`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#00f5ff]" />
                      <span className="text-xs font-semibold">Paste Job Description</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {hubMode !== "none" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2">
                    {hubMode === "voice" && (
                      <div className="p-3 bg-[#050816] rounded-xl border border-white/5 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-slate-400">Microphone Input</span>
                          {recording && <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />}
                        </div>
                        {recording ? (
                          <div className="flex items-center justify-center gap-1.5 py-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <motion.span key={i} animate={{ height: [6, 20, 6] }} transition={{ duration: 0.5 + i * 0.1, repeat: Infinity }} className="w-0.5 bg-red-400 rounded-full" />
                            ))}
                          </div>
                        ) : voiceText ? (
                          <p className="text-xs text-white leading-relaxed font-mono">"{voiceText}"</p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Click Start Recording to dictate your career ambitions...</p>
                        )}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              if (recording) {
                                setRecording(false);
                                setVoiceText("Optimize my roadmap for full-stack engineering with an emphasis on local Ollama integration.");
                                showLocalToast("Voice input transcribed successfully!", Mic);
                              } else {
                                setRecording(true);
                                setVoiceText("");
                                setTimeout(() => {
                                  setRecording(false);
                                  setVoiceText("Optimize my roadmap for full-stack engineering with an emphasis on local Ollama integration.");
                                  showLocalToast("Voice input transcribed successfully!", Mic);
                                }, 2500);
                              }
                            }} 
                            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold hover:bg-red-500/30 transition"
                          >
                            {recording ? "Stop Dictation" : "Start Recording"}
                          </button>
                          
                          {voiceText && (
                            <button 
                              onClick={async () => {
                                setSubmittingHub(true);
                                try {
                                  const result = await generateRoadmap(voiceText, [], userId);
                                  await saveActiveRoadmap({
                                    data: {
                                      userId,
                                      title: result.title || voiceText,
                                      matchScore: result.match_score || 85,
                                      roadmapJson: JSON.stringify(result.roadmap || []),
                                      skillsJson: JSON.stringify(result.skill_gaps || [])
                                    }
                                  });
                                  const mapped = {
                                    id: "custom-path-voice",
                                    title: result.title || voiceText,
                                    match: `${result.match_score || 85}%`,
                                    salary: result.salary_range || "₹18-35 LPA",
                                    trend: result.demand_trend || "+30% YoY",
                                    gap: `${(result.skill_gaps || []).length} skills`,
                                    skills: (result.skill_gaps || []).map((s: any) => ({
                                      name: s.name,
                                      status: s.status || "Missing"
                                    })),
                                    roadmap: mapRoadmapData(result.roadmap),
                                    paceGuide: result.pace_guide || ""
                                  };
                                  setSelectedCareer(mapped);
                                  setShowRoadmap(true);
                                  setHubMode("none");
                                  showLocalToast("AI customized roadmap synced from voice goals!", Target);
                                } catch (err) {
                                  showLocalToast("Failed to generate voice roadmap", X);
                                } finally {
                                  setSubmittingHub(false);
                                }
                              }} 
                              className="px-4 py-2 rounded-lg bg-[#00F5FF] text-[#050816] text-xs font-bold hover:scale-105 transition ml-auto"
                            >
                              {submittingHub ? "Customizing..." : "Submit to AI"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {hubMode === "upload" && (
                      <div className="p-4 bg-[#050816] rounded-xl border border-white/5 space-y-4">
                        <div 
                          className="border border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center hover:border-[#00f5ff]/40 transition cursor-pointer" 
                          onClick={triggerFileSelect}
                        >
                          <FileUp className="h-8 w-8 text-[#00f5ff] mb-2" />
                          {selectedFile ? (
                            <span className="text-xs text-white font-mono font-bold">{selectedFile}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground text-center">Drag and drop resume here, or click to upload PDF/Doc</span>
                          )}
                        </div>
                        
                        {selectedFile && (
                          <button 
                            onClick={async () => {
                              if (!realFile) return;
                              setSubmittingHub(true);
                              try {
                                const result = await analyzeResume(realFile, selectedRoleOption, userId);
                                await saveActiveRoadmap({
                                  data: {
                                    userId,
                                    title: result.title || selectedRoleOption,
                                    matchScore: result.match_score || 85,
                                    roadmapJson: JSON.stringify(result.roadmap || []),
                                    skillsJson: JSON.stringify(result.skill_gaps || [])
                                  }
                                });
                                const mapped = {
                                  id: "custom-path-pdf",
                                  title: result.title || selectedRoleOption,
                                  match: `${result.match_score || 85}%`,
                                  salary: result.salary_range || "₹18-35 LPA",
                                  trend: result.demand_trend || "+30% YoY",
                                  gap: `${(result.skill_gaps || []).length} skills`,
                                  skills: (result.skill_gaps || []).map((s: any) => ({
                                    name: s.name,
                                    status: s.status || "Missing"
                                  })),
                                  roadmap: mapRoadmapData(result.roadmap),
                                  paceGuide: result.pace_guide || ""
                                };
                                setSelectedCareer(mapped);
                                setShowRoadmap(true);
                                setHubMode("none");
                                showLocalToast("AI customized roadmap synced from resume PDF!", Target);
                              } catch (err) {
                                showLocalToast("Failed to analyze resume", X);
                              } finally {
                                setSubmittingHub(false);
                              }
                            }} 
                            className="w-full py-2 rounded-lg bg-[#00F5FF] text-[#050816] text-xs font-bold hover:scale-[1.01] transition"
                          >
                            {submittingHub ? "Analyzing Resume..." : "Submit Resume to AI"}
                          </button>
                        )}
                      </div>
                    )}

                    {hubMode === "text" && (
                      <div className="p-3 bg-[#050816] rounded-xl border border-white/5 space-y-3">
                        <textarea 
                          value={pastedText} 
                          onChange={(e) => setPastedText(e.target.value)} 
                          placeholder="Paste job description or custom goals here..." 
                          className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f5ff]/40 font-mono" 
                        />
                        <div className="flex justify-end">
                          <button 
                            onClick={async () => {
                              if (!pastedText) return;
                              setSubmittingHub(true);
                              try {
                                const result = await generateRoadmap(pastedText, [], userId);
                                await saveActiveRoadmap({
                                  data: {
                                    userId,
                                    title: result.title || pastedText.slice(0, 20),
                                    matchScore: result.match_score || 85,
                                    roadmapJson: JSON.stringify(result.roadmap || []),
                                    skillsJson: JSON.stringify(result.skill_gaps || [])
                                  }
                                });
                                const mapped = {
                                  id: "custom-path-text",
                                  title: result.title || pastedText.slice(0, 20),
                                  match: `${result.match_score || 85}%`,
                                  salary: result.salary_range || "₹18-35 LPA",
                                  trend: result.demand_trend || "+30% YoY",
                                  gap: `${(result.skill_gaps || []).length} skills`,
                                  skills: (result.skill_gaps || []).map((s: any) => ({
                                    name: s.name,
                                    status: s.status || "Missing"
                                  })),
                                  roadmap: mapRoadmapData(result.roadmap),
                                  paceGuide: result.pace_guide || ""
                                };
                                setSelectedCareer(mapped);
                                setShowRoadmap(true);
                                setHubMode("none");
                                showLocalToast("AI targets customized based on pasted requirements!", Target);
                              } catch (err) {
                                showLocalToast("Failed to generate custom roadmap", X);
                              } finally {
                                setSubmittingHub(false);
                              }
                            }} 
                            disabled={!pastedText} 
                            className="px-4 py-2 rounded-lg bg-[#00F5FF] text-[#050816] text-xs font-bold hover:scale-105 transition disabled:opacity-50"
                          >
                            {submittingHub ? "Analyzing text..." : "Submit to AI"}
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </GradientCard>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#0b1530] border border-blue-500/20 text-white shadow-md p-4 rounded-2xl">
            <div className="text-[10px] text-blue-200/70 uppercase font-mono tracking-wider">Target Match</div>
            <div className="text-xl font-bold text-[#00F5FF] mt-1 leading-none">{selectedCareer ? selectedCareer.match : "0%"}</div>
            <div className="text-[9px] text-blue-200/60 mt-2">Personal fit score</div>
          </div>
          
          <div className="bg-[#0b1530] border border-blue-500/20 text-white shadow-md p-4 rounded-2xl">
            <div className="text-[10px] text-blue-200/70 uppercase font-mono tracking-wider">Avg Salary</div>
            <div className="text-xl font-bold text-white mt-1 leading-none">{selectedCareer ? selectedCareer.salary : "₹0 LPA"}</div>
            <div className="text-[9px] text-[#00F5FF] mt-2 font-semibold font-mono">India junior-to-senior</div>
          </div>
          
          <button 
            onClick={() => {
              if (selectedCareer) {
                setViewingSkillGap(true);
                showLocalToast("Opening Skill Gap checklist...", Info);
              } else {
                showLocalToast("Please generate a roadmap first", Info);
              }
            }} 
            className="bg-[#0b1530] border border-blue-500/20 text-white shadow-md p-4 rounded-2xl text-left hover:border-[#00F5FF]/30 transition hover:scale-[1.02]"
          >
            <div className="text-[10px] text-blue-200/70 uppercase font-mono tracking-wider">Skill Gap</div>
            <div className="text-xl font-bold text-amber-400 mt-1 leading-none">{selectedCareer ? selectedCareer.gap : "0 skills"}</div>
            <div className="text-[9px] text-[#8B5CF6] mt-2 underline font-semibold">Click to analyze gap</div>
          </button>
          
          <div className="bg-[#0b1530] border border-blue-500/20 text-white shadow-md p-4 rounded-2xl">
            <div className="text-[10px] text-blue-200/70 uppercase font-mono tracking-wider">Demand Trend</div>
            <div className="text-xl font-bold text-[#22C55E] mt-1 leading-none">{selectedCareer ? selectedCareer.trend : "+0%"}</div>
            <div className="text-[9px] text-blue-200/60 mt-2">YoY hiring growth</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-6">
          <div className="lg:col-span-8 flex flex-col">
            <GlassCard className="flex-1 flex flex-col justify-between bg-[#0b1530] border border-blue-500/20 text-white shadow-lg p-6 min-h-[350px]">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                <div>
                  <h3 className="font-display font-extrabold text-base text-white">Visual Learning Road</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Sprint roadmap for {selectedCareer ? selectedCareer.title : selectedRoleOption}
                  </p>
                </div>
                <span className="text-[9px] font-mono text-[#00F5FF] bg-[#00F5FF]/10 px-2 py-0.5 rounded">Ollama Compiler Ready</span>
              </div>

              {generating ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-8">
                  <RefreshCw className="h-8 w-8 text-[#00F5FF] animate-spin" />
                  <div className="text-xs text-muted-foreground font-mono text-center max-w-xs leading-relaxed">
                    {roadmapProgress < 40 ? "analyzing cognitive profile match..." : roadmapProgress < 80 ? "synthesizing skill node milestones..." : "compiling personalized edge modules..."}
                  </div>
                  <div className="w-48 bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] transition-all duration-300" style={{ width: `${roadmapProgress}%` }} />
                  </div>
                </div>
              ) : showRoadmap && selectedCareer ? (
                isGridRoadmap(selectedCareer.roadmap) ? (
                  <div className="space-y-8 py-2">
                    {selectedCareer.roadmap.map((phase: any) => (
                      <div key={phase.phase_num} className="bg-slate-955/35 rounded-2xl p-4.5 border border-white/5 shadow-inner">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-4 border-b border-white/5 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] text-black font-extrabold text-[9px] tracking-wider uppercase font-mono shadow-md">
                              Phase {phase.phase_num}
                            </span>
                            <h4 className="font-display font-extrabold text-xs text-[#e9feff]">{phase.phase_title}</h4>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-[#00F5FF] bg-[#00F5FF]/10 px-2 py-0.5 rounded border border-[#00F5FF]/20 shadow-sm shrink-0 self-start sm:self-auto">
                            {phase.duration_months}
                          </span>
                        </div>

                        <div className="space-y-5">
                          {phase.months.map((month: any) => (
                            <div key={month.month_num} className="space-y-3">
                              <div className="text-[11px] font-bold text-slate-300 font-mono tracking-wide flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#00F5FF]" />
                                Month {month.month_num}: {month.month_title}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                                {month.tracks.map((track: any, idx: number) => {
                                  const style = TRACK_STYLES[idx % TRACK_STYLES.length];
                                  return (
                                    <div key={idx} className={`rounded-xl border ${style.border} ${style.bg} ${style.glow} p-3 flex flex-col justify-between hover:border-[#00F5FF]/30 transition-all duration-300`}>
                                      <div>
                                        <div className={`text-[10px] font-extrabold ${style.text} tracking-wide border-b border-white/5 pb-1 mb-2`}>
                                          {track.track_title}
                                        </div>
                                        <ul className="space-y-1">
                                          {track.topics.map((topic: string, tidx: number) => (
                                            <li key={tidx} className="text-[9px] text-slate-400 flex items-start gap-1 leading-snug">
                                              <span className={`h-1 w-1 rounded-full ${style.text.replace('text-', 'bg-')} mt-1 shrink-0`} />
                                              <span>{topic}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {month.milestones && month.milestones.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                                  {month.milestones.map((ms: string, msidx: number) => (
                                    <span key={msidx} className="text-[8px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                                      <Check className="h-2.5 w-2.5 shrink-0" /> {ms}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {selectedCareer.paceGuide && (
                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex gap-3 items-start mt-4">
                        <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <div className="text-[10px] font-bold text-amber-300 font-mono uppercase tracking-wider">Pace Guide & Advisor</div>
                          <div className="text-[10px] text-slate-400 mt-1 leading-relaxed font-sans">{selectedCareer.paceGuide}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-around py-4 relative">
                    <div className="absolute left-6 inset-y-10 w-0.5 bg-gradient-to-b from-[#00F5FF]/40 via-[#8B5CF6]/40 to-transparent pointer-events-none" />

                    {selectedCareer.roadmap.map((node: any, i: number) => (
                      <div 
                        key={node.id}
                        onClick={() => { setActiveNodeDetail(node); showLocalToast(`Syllabus loaded for node: ${node.title}`, BookOpen); }}
                        className="flex gap-4 items-start relative z-10 cursor-pointer group p-2 rounded-xl hover:bg-white/5 transition"
                      >
                        <div className={`h-8.5 w-8.5 rounded-full border flex items-center justify-center shrink-0 transition ${
                          node.status === "completed" ? "bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]" :
                          node.status === "in-progress" ? "bg-[#00F5FF]/15 border-[#00F5FF]/40 text-[#00F5FF]" :
                          "bg-white/5 border-white/5 text-slate-500"
                        }`}>
                          {node.status === "completed" ? <Check className="h-4.5 w-4.5" /> : 
                           node.status === "in-progress" ? <Sparkles className="h-4.5 w-4.5 animate-pulse" /> :
                           <Lock className="h-4 w-4" />}
                        </div>

                        <div>
                          <div className="text-xs font-bold text-[#e9feff] group-hover:text-[#00F5FF] transition flex items-center gap-2">
                            {node.title} 
                            <span className="text-[8px] font-mono uppercase text-muted-foreground">Milestone {i + 1}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 max-w-xl leading-relaxed">{node.desc}</div>
                        </div>

                        <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition" />
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center italic text-xs text-muted-foreground py-12 border border-dashed border-white/5 rounded-2xl">
                  No target roadmap active. Choose a career target or upload your resume/goals to build your path using the local LLM!
                </div>
              )}
            </GlassCard>
          </div>

          <div className="lg:col-span-4 flex flex-col">
            <GlassCard className="flex-1 bg-[#0b1530] border border-blue-500/20 text-white shadow-lg p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="font-display font-extrabold text-base text-white">Target Selection</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Toggle target careers to update path parameters</p>
                </div>
                <div className="space-y-2.5">
                  {CAREER_OPTIONS.map((c) => (
                    <button 
                      key={c.id} 
                      onClick={() => handleCareerChange(c.title)} 
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${selectedRoleOption === c.title ? "bg-[#00F5FF]/10 border-[#00F5FF]/30 text-white font-bold" : "bg-slate-800/40 border-slate-700/30 text-blue-200/70 hover:bg-slate-800/60"}`}
                    >
                      <span className="text-xs font-semibold">{c.title}</span>
                      <span className="text-[10px] font-mono text-[#00F5FF]">{c.match} fit</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 bg-[#8B5CF6]/5 border border-[#8B5CF6]/20 p-3 rounded-xl text-[10px] text-[#8B5CF6] leading-relaxed font-mono">
                Projections updated based on recent India hiring audits.
              </div>
            </GlassCard>
          </div>
        </div>

        <h3 className="font-display font-extrabold text-base text-[#0b1530] mb-4">Explore Industry Sectors</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTORS.map((s, idx) => (
            <motion.div 
              key={s.title} 
              whileHover={{ y: -3 }} 
              onClick={() => { setSelectedSector(s); showLocalToast(`Loaded salary metrics for ${s.title}`, Info); }} 
              className="cursor-pointer"
            >
              <GlassCard className="h-full bg-[#0b1530] border border-blue-500/20 text-white shadow-lg hover:border-[#00F5FF]/20 transition-all">
                <div className="flex items-start justify-between mb-2.5">
                  <div className="h-8.5 w-8.5 rounded-lg bg-[#00F5FF]/10 text-[#00F5FF] flex items-center justify-center">
                    {idx === 0 && <Laptop className="h-4.5 w-4.5" />}
                    {idx === 1 && <Cpu className="h-4.5 w-4.5" />}
                    {idx === 2 && <Shield className="h-4.5 w-4.5" />}
                    {idx > 2 && <Landmark className="h-4.5 w-4.5" />}
                  </div>
                  <span className="text-[8px] font-mono uppercase bg-white/5 border border-white/5 px-2 py-0.5 rounded text-slate-400">{s.tag}</span>
                </div>
                <h3 className="font-display font-bold text-xs text-[#e9feff] mb-1">{s.title}</h3>
                <p className="text-[10.5px] text-slate-400 leading-normal">{s.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {activeNodeDetail && (
            <div onClick={() => setActiveNodeDetail(null)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div 
                onClick={(e) => e.stopPropagation()} 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }} 
                className="w-full max-w-sm bg-[#0b1530] border border-blue-500/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden text-white font-sans text-xs"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f5ff]/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                  <h4 className="font-display font-extrabold text-sm text-white flex items-center gap-1.5">
                    <BookOpen className="h-4.5 w-4.5 text-[#00f5ff]" />
                    Milestone Syllabus
                  </h4>
                  <button onClick={() => setActiveNodeDetail(null)} className="text-muted-foreground hover:text-white transition">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4 text-xs text-slate-300">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase font-mono">Module Title</div>
                    <div className="text-sm font-bold text-white mt-0.5">{activeNodeDetail.title}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase font-mono">Detailed Focus</div>
                    <p className="mt-1 leading-relaxed">{activeNodeDetail.desc}</p>
                  </div>
                  <div className="bg-[#050816] p-3 rounded-xl border border-white/5 space-y-1.5 font-mono text-[9px]">
                    <div className="text-[#00F5FF] uppercase font-bold">Suggested Study Resources:</div>
                    <div>• MIT 6.S191 deep reinforcement lecture maps</div>
                    <div>• PyTorch distributed inference manuals</div>
                  </div>
                  {activeNodeDetail.status !== "locked" ? (
                    <button 
                      onClick={() => { setActiveNodeDetail(null); showLocalToast("Module Study Session Initiated! +50 XP", Zap); }} 
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] text-xs font-bold text-[#050816] transition hover:shadow-lg"
                    >
                      Start Study Unit
                    </button>
                  ) : (
                    <div className="text-center py-2.5 rounded-xl bg-white/5 text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" /> Unlock by completing previous milestone
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {viewingSkillGap && selectedCareer && (
            <div onClick={() => setViewingSkillGap(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div 
                onClick={(e) => e.stopPropagation()} 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }} 
                className="w-full max-w-sm bg-[#0b1530] border border-blue-500/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden text-white font-sans text-xs"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#8b5cf6]/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                  <h4 className="font-display font-extrabold text-sm text-white flex items-center gap-1.5">
                    <Info className="h-4.5 w-4.5 text-amber-400" />
                    Target Skill Gap Analysis
                  </h4>
                  <button onClick={() => setViewingSkillGap(false)} className="text-muted-foreground hover:text-white transition">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-3.5 text-xs text-slate-300">
                  <p>To reach Senior status as an <span className="text-white font-semibold">{selectedCareer.title}</span>, you need to acquire the following skill milestones:</p>
                  <div className="space-y-2">
                    {selectedCareer.skills.map((sk: any, index: number) => (
                      <div key={index} className="p-3 rounded-xl bg-[#050816] border border-white/5 flex items-center justify-between">
                        <span className="font-semibold text-white">{sk.name}</span>
                        <span className={`text-[10px] font-mono ${sk.status.includes("Missing") ? "text-amber-500" : "text-emerald-400"}`}>{sk.status}</span>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => { setViewingSkillGap(false); showLocalToast("Skill gap targets added to study roadmap!", Target); }} 
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] text-xs font-bold text-[#050816] transition hover:shadow-lg"
                  >
                    Add Skills to Study Path
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {selectedSector && (
            <div onClick={() => setSelectedSector(null)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div 
                onClick={(e) => e.stopPropagation()} 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }} 
                className="w-full max-w-sm bg-[#0b1530] border border-blue-500/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden text-white font-sans text-xs"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f5ff]/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                  <h4 className="font-display font-extrabold text-sm text-white">{selectedSector.title} Metrics</h4>
                  <button onClick={() => setSelectedSector(null)} className="text-muted-foreground hover:text-white transition">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4 text-xs text-slate-300">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase font-mono">Trending Positions</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedSector.roles.map((r: string) => (
                        <span key={r} className="glass px-2.5 py-0.5 rounded text-[10px] text-white font-mono">{r}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 bg-[#050816] p-3.5 rounded-xl border border-white/5">
                    <div>
                      <div className="text-[9px] text-slate-400 uppercase font-mono">Avg Salary US</div>
                      <div className="text-sm font-bold text-[#00f5ff] mt-0.5">{selectedSector.salaryUS}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400 uppercase font-mono">Avg Salary India</div>
                      <div className="text-sm font-bold text-[#00f5ff] mt-0.5">{selectedSector.salaryIN}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedSector(null); handleCareerChange(selectedSector.title); }} 
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] text-xs font-bold text-[#050816] transition hover:shadow-lg"
                  >
                    Set Target Career in Sector
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}

export const Route = createFileRoute("/career")({
  head: () => ({ meta: [{ title: "Career Path — LearnSphere AI" }] }),
  component: CareerDashboard
});