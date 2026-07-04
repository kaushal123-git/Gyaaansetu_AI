import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { GlassCard, PageHeader, GradientCard } from "@/components/ui-kit/Card";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  X, FolderKanban, Sparkles, RefreshCw, Zap, BookOpen, 
  FileText, Check, Trash2, ArrowRight, Laptop, Cpu, Shield, 
  Code2, Users, Play, Info, Award, HelpCircle, FileDown 
} from "lucide-react";
import { generateProject } from "@/lib/api/ai.service";
import { loadProjects, deleteProject, saveProject } from "@/lib/api/projects.functions";

const PROJECT_CATEGORIES = [
  { 
    id: "hackathon",
    title: "Hackathon Projects", 
    desc: "Idea + tech stack + 24-hour build plan tailored to a theme and team size.", 
    tag: "Popular",
    icon: Zap,
    inputs: ["team_size", "tech_stack"]
  },
  { 
    id: "research",
    title: "Research Projects", 
    desc: "Literature review, methodology, and result framework for academic papers.",
    tag: "Academic",
    icon: BookOpen,
    inputs: ["target_audience"]
  },
  { 
    id: "final-year",
    title: "Final-Year Projects", 
    desc: "End-to-end project blueprints with milestones, mentor questions, and reports.",
    tag: "Capstone",
    icon: Cpu,
    inputs: ["tech_stack"]
  },
  { 
    id: "ppt",
    title: "PPT Presentations", 
    desc: "Generate stunning decks with charts, speaker notes, and presenter tips.",
    tag: "Pitch Deck",
    icon: Laptop,
    inputs: ["target_audience"]
  },
  { 
    id: "docs",
    title: "Documentation", 
    desc: "README, API docs, and user guides written in your project's voice.",
    tag: "MD Format",
    icon: FileText,
    inputs: ["tech_stack"]
  },
  { 
    id: "architecture",
    title: "Architecture Diagrams", 
    desc: "Auto-generated system diagrams from a short prompt — with Mermaid.js code.", 
    tag: "AI Diagram",
    icon: Shield,
    inputs: ["tech_stack"]
  },
  { 
    id: "github",
    title: "GitHub Templates", 
    desc: "Bootstrap repos with CI, linting, tests, and best-practice structure.",
    tag: "DevOps",
    icon: Code2,
    inputs: ["tech_stack"]
  },
  { 
    id: "review",
    title: "Code Review", 
    desc: "AI reviewer that suggests performance, security, and dry improvements.",
    tag: "Reviewer",
    icon: Info,
    inputs: ["tech_stack"]
  },
  { 
    id: "script",
    title: "Demo Video Script", 
    desc: "Polished script + storyboard for your 2-minute product demo video.",
    tag: "Video",
    icon: Play,
    inputs: ["target_audience"]
  }
];

function ProjectsDashboard() {
  const [userId, setUserId] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<any>(null);
  
  // Form states
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [techStack, setTechStack] = useState("");
  const [teamSize, setTeamSize] = useState(1);
  const [targetAudience, setTargetAudience] = useState("");
  
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentOutput, setCurrentOutput] = useState<any>(null);
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
    refreshHistory(user.id);
  }, []);

  const refreshHistory = async (uId: string) => {
    try {
      const pastProjects = await loadProjects({ data: { userId: uId } });
      setHistory(pastProjects || []);
      setSavedIds(new Set((pastProjects || []).map((p: any) => p.id)));
    } catch (err) {
      console.error("Failed to load project history:", err);
    }
  };

  const handleSave = async (item: any) => {
    if (!item || !userId) return;
    try {
      await saveProject({
        data: {
          id: item.id,
          userId: userId,
          title: item.title,
          category: item.category,
          tag: item.tag || "",
          outputMarkdown: item.outputMarkdown || item.output_markdown || ""
        }
      });
      showLocalToast("Blueprint saved to Quick History!", Check);
      refreshHistory(userId);
    } catch (err) {
      showLocalToast("Failed to save blueprint.", X);
    }
  };

  const handleGenerate = async () => {
    if (!projectTitle.trim() || !activeCategory) return;
    setGenerating(true);
    setProgress(15);
    setCurrentOutput(null);

    // Simulate progressive status
    const timer = setInterval(() => {
      setProgress((prev) => (prev < 85 ? prev + 8 : prev));
    }, 1200);

    try {
      const result = await generateProject({
        title: projectTitle,
        category: activeCategory.title,
        user_id: userId,
        tag: activeCategory.tag,
        description: projectDesc,
        team_size: teamSize,
        tech_stack: techStack,
        target_audience: targetAudience
      });
      clearInterval(timer);
      setProgress(100);
      
      const mapped = {
        id: result.id,
        title: result.title,
        category: result.category,
        tag: result.tag || activeCategory.tag,
        outputMarkdown: result.output_markdown,
        createdAt: result.created_at
      };
      
      setCurrentOutput(mapped);
      setGenerating(false);
      showLocalToast(`Project helper generated: ${result.title}!`, Award);
      refreshHistory(userId);
      
      // Reset form
      setProjectTitle("");
      setProjectDesc("");
      setTechStack("");
      setTeamSize(1);
      setTargetAudience("");
      setActiveCategory(null);
    } catch (err) {
      clearInterval(timer);
      setGenerating(false);
      showLocalToast("Failed to generate project helper output. Check Ollama server.", X);
    }
  };

  const handleDelete = async (pId: string) => {
    try {
      await deleteProject({ data: { projectId: pId } });
      showLocalToast("Blueprint deleted successfully.", Trash2);
      if (currentOutput?.id === pId) {
        setCurrentOutput(null);
      }
      refreshHistory(userId);
    } catch (err) {
      showLocalToast("Failed to delete project blueprint.", X);
    }
  };

  const handleDownloadMarkdown = (item: any) => {
    const blob = new Blob([item.outputMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${item.title.toLowerCase().replace(/\s+/g, "_")}_blueprint.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showLocalToast("Markdown blueprint downloaded!", FileDown);
  };

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] p-0">
        
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

        <PageHeader title="Project Helper" subtitle="AI generates project ideas, documentation, slides, and architecture diagrams in seconds." icon={FolderKanban} />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GradientCard className="overflow-hidden relative mb-6 bg-[#0b1530] border border-blue-500/20 text-white shadow-lg p-6">
            <div className="flex flex-col gap-6">
              <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-center">
                <div>
                  <div className="inline-flex items-center gap-1.5 glass rounded-full px-3 py-1 text-xs">
                    <Sparkles className="h-3 w-3 text-[#00F5FF]" />
                    Powered by DeepSeek-R1 AI
                  </div>
                  <h1 className="mt-3 text-xl lg:text-2xl font-display font-bold">Build Industry-Grade Blueprints & Code</h1>
                  <p className="mt-2 text-slate-300 max-w-xl text-xs leading-relaxed">
                    Select a project helper category below, supply your requirements, and generate high-yield blueprints, storyboard scripts, or architecture Mermaid diagrams.
                  </p>
                </div>
                <div>
                  <a href="#explore-modes" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] px-5 py-3 text-xs font-bold text-[#050816] glow-cyan hover:scale-[1.02] transition-all">
                    <Zap className="h-4 w-4 fill-[#050816]" /> Explore Generator Templates
                  </a>
                </div>
              </div>
            </div>
          </GradientCard>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#0b1530] border border-blue-500/20 text-white shadow-md p-4 rounded-2xl">
            <div className="text-[10px] text-blue-200/70 uppercase font-mono tracking-wider">Templates Run</div>
            <div className="text-xl font-bold text-[#00F5FF] mt-1 leading-none">{history.length}</div>
            <div className="text-[9px] text-blue-200/60 mt-2">Personal blueprints compiled</div>
          </div>
          
          <div className="bg-[#0b1530] border border-blue-500/20 text-white shadow-md p-4 rounded-2xl">
            <div className="text-[10px] text-blue-200/70 uppercase font-mono tracking-wider">Primary Model</div>
            <div className="text-xl font-bold text-white mt-1 leading-none">DeepSeek-R1</div>
            <div className="text-[9px] text-[#00F5FF] mt-2 font-semibold font-mono">Local 8B Reasoning Model</div>
          </div>
          
          <div className="bg-[#0b1530] border border-blue-500/20 text-white shadow-md p-4 rounded-2xl">
            <div className="text-[10px] text-blue-200/70 uppercase font-mono tracking-wider">Output Type</div>
            <div className="text-xl font-bold text-amber-400 mt-1 leading-none">Markdown / SVG</div>
            <div className="text-[9px] text-[#8B5CF6] mt-2 font-semibold">Copyable templates & Mermaid code</div>
          </div>
          
          <div className="bg-[#0b1530] border border-blue-500/20 text-white shadow-md p-4 rounded-2xl">
            <div className="text-[10px] text-blue-200/70 uppercase font-mono tracking-wider">Status</div>
            <div className="text-xl font-bold text-[#22C55E] mt-1 leading-none">Ready</div>
            <div className="text-[9px] text-blue-200/60 mt-2">Offline database active</div>
          </div>
        </div>

        {/* Dynamic Generator Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-6">
          <div className="lg:col-span-8 flex flex-col">
            <GlassCard className="flex-1 flex flex-col justify-between bg-[#0b1530] border border-blue-500/20 text-white shadow-lg p-6 min-h-[400px]">
              
              {generating ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12">
                  <RefreshCw className="h-10 w-10 text-[#00F5FF] animate-spin" />
                  <div className="text-xs text-muted-foreground font-mono text-center max-w-xs leading-relaxed">
                    {progress < 40 ? "thinking via deep reasoning traces..." : progress < 80 ? "synthesizing technical code modules..." : "writing polished markdown output..."}
                  </div>
                  <div className="w-48 bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : currentOutput ? (
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-[#00F5FF] bg-[#00F5FF]/10 px-2.5 py-0.5 rounded border border-[#00F5FF]/20 shadow-sm mr-2 uppercase">
                        {currentOutput.tag || currentOutput.category}
                      </span>
                      <h4 className="font-display font-extrabold text-sm text-[#e9feff] inline-block">{currentOutput.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {savedIds.has(currentOutput.id) ? (
                        <span className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1 text-[10px] font-semibold">
                          <Check className="h-3 w-3" /> Saved
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleSave(currentOutput)} 
                          className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#00F5FF]/10 to-[#8B5CF6]/10 border border-[#00F5FF]/30 text-[#00F5FF] hover:bg-[#00F5FF]/20 transition flex items-center gap-1 text-[10px] font-semibold"
                          title="Save to Quick History"
                        >
                          <FolderKanban className="h-3 w-3" /> Save to History
                        </button>
                      )}
                      <button 
                        onClick={() => handleDownloadMarkdown(currentOutput)} 
                        className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
                        title="Download Markdown Blueprint"
                      >
                        <FileDown className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setCurrentOutput(null)} 
                        className="text-muted-foreground hover:text-white transition"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 max-h-[500px] overflow-y-auto bg-black/30 p-4.5 rounded-2xl border border-white/5 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {currentOutput.outputMarkdown}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                    <div>
                      <h3 className="font-display font-extrabold text-base text-white">AI Blueprint Canvas</h3>
                      <p className="text-[11px] text-muted-foreground">Select a category on the right or explore modes below to construct blueprints.</p>
                    </div>
                    <span className="text-[9px] font-mono text-[#00F5FF] bg-[#00F5FF]/10 px-2 py-0.5 rounded">DeepSeek-R1 Ready</span>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center text-center italic text-xs text-muted-foreground py-16 border border-dashed border-white/5 rounded-2xl">
                    <FolderKanban className="h-8 w-8 text-slate-600 mb-2" />
                    No active blueprint generation. Choose a helper template to build your plan.
                  </div>
                </div>
              )}

            </GlassCard>
          </div>

          <div className="lg:col-span-4 flex flex-col">
            <GlassCard className="flex-1 bg-[#0b1530] border border-blue-500/20 text-white shadow-lg p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="font-display font-extrabold text-base text-white">Quick History</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Access your past compiled project guides</p>
                </div>
                
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {history.length > 0 ? (
                    history.map((item) => (
                      <div 
                        key={item.id}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-700/30 bg-slate-800/40 hover:bg-slate-800/60 transition group cursor-pointer"
                        onClick={() => setCurrentOutput(item)}
                      >
                        <div className="truncate mr-2">
                          <div className="text-xs font-semibold text-white truncate">{item.title}</div>
                          <span className="text-[8px] font-mono text-[#00F5FF] uppercase tracking-wider bg-[#00F5FF]/5 border border-[#00F5FF]/10 px-1.5 py-0.5 rounded">{item.tag || item.category}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDownloadMarkdown(item); }}
                            className="p-1 rounded bg-slate-700 text-slate-400 hover:text-white transition"
                            title="Download"
                          >
                            <FileDown className="h-3 w-3" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                            className="p-1 rounded bg-red-950/20 text-red-400 border border-red-500/10 hover:bg-red-950/40 transition opacity-0 group-hover:opacity-100"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center italic text-[10px] text-slate-500 py-12">No past blueprints saved.</div>
                  )}
                </div>
              </div>
              <div className="mt-4 bg-[#8B5CF6]/5 border border-[#8B5CF6]/20 p-3 rounded-xl text-[10px] text-[#8B5CF6] leading-relaxed font-mono">
                Project logs are saved in user context partitions.
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Explore Categories Grid */}
        <h3 id="explore-modes" className="font-display font-extrabold text-base text-[#0b1530] mb-4">Explore Generator Templates</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {PROJECT_CATEGORIES.map((cat, idx) => (
            <motion.div 
              key={cat.id} 
              whileHover={{ y: -3 }} 
              onClick={() => {
                setActiveCategory(cat);
                setProjectTitle("");
                setProjectDesc("");
                setTechStack("");
                setTeamSize(1);
                setTargetAudience("");
                showLocalToast(`Selected Mode: ${cat.title}`, cat.icon);
              }} 
              className="cursor-pointer"
            >
              <GlassCard className="h-full bg-[#0b1530] border border-blue-500/20 text-white shadow-lg hover:border-[#00F5FF]/20 transition-all">
                <div className="flex items-start justify-between mb-2.5">
                  <div className="h-8.5 w-8.5 rounded-lg bg-[#00F5FF]/10 text-[#00F5FF] flex items-center justify-center">
                    <cat.icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[8px] font-mono uppercase bg-white/5 border border-white/5 px-2 py-0.5 rounded text-slate-400">{cat.tag}</span>
                </div>
                <h3 className="font-display font-bold text-xs text-[#e9feff] mb-1">{cat.title}</h3>
                <p className="text-[10.5px] text-slate-400 leading-normal">{cat.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Modal/Overlay for input form */}
        <AnimatePresence>
          {activeCategory && (
            <div onClick={() => setActiveCategory(null)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div 
                onClick={(e) => e.stopPropagation()} 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }} 
                className="w-full max-w-md bg-[#0b1530] border border-blue-500/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden text-white font-sans text-xs"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f5ff]/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                  <h4 className="font-display font-extrabold text-sm text-white flex items-center gap-1.5">
                    <Sparkles className="h-4.5 w-4.5 text-[#00f5ff]" />
                    {activeCategory.title} Generator
                  </h4>
                  <button onClick={() => setActiveCategory(null)} className="text-muted-foreground hover:text-white transition">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">Project Title / Theme</label>
                    <input 
                      type="text" 
                      value={projectTitle} 
                      onChange={(e) => setProjectTitle(e.target.value)} 
                      placeholder="e.g. Offline Learning App, Health Tracker" 
                      className="w-full bg-[#050816] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f5ff]/40" 
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">Description / Requirements</label>
                    <textarea 
                      value={projectDesc} 
                      onChange={(e) => setProjectDesc(e.target.value)} 
                      placeholder="Specify your specific project features, prompts, or problems..." 
                      className="w-full h-20 bg-[#050816] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f5ff]/40" 
                    />
                  </div>

                  {activeCategory.inputs.includes("tech_stack") && (
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">Technology Stack (Optional)</label>
                      <input 
                        type="text" 
                        value={techStack} 
                        onChange={(e) => setTechStack(e.target.value)} 
                        placeholder="e.g. React, Fastify, PostgreSQL" 
                        className="w-full bg-[#050816] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f5ff]/40" 
                      />
                    </div>
                  )}

                  {activeCategory.inputs.includes("team_size") && (
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">Team Size</label>
                      <input 
                        type="number" 
                        value={teamSize} 
                        onChange={(e) => setTeamSize(parseInt(e.target.value) || 1)} 
                        min={1} 
                        className="w-full bg-[#050816] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f5ff]/40" 
                      />
                    </div>
                  )}

                  {activeCategory.inputs.includes("target_audience") && (
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">Target Audience / Core Domain</label>
                      <input 
                        type="text" 
                        value={targetAudience} 
                        onChange={(e) => setTargetAudience(e.target.value)} 
                        placeholder="e.g. College students, senior managers, technical examiners" 
                        className="w-full bg-[#050816] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f5ff]/40" 
                      />
                    </div>
                  )}

                  <button 
                    onClick={handleGenerate}
                    disabled={!projectTitle.trim()}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] text-xs font-bold text-[#050816] transition hover:shadow-lg hover:scale-[1.01] disabled:opacity-50"
                  >
                    Generate Blueprint with DeepSeek-R1
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

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Project Helper — LearnSphere AI" }] }),
  component: ProjectsDashboard
});
