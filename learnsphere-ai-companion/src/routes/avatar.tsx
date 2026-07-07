import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { GlassCard, PageHeader, GradientCard } from "@/components/ui-kit/Card";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  User, Sparkles, ShieldAlert, Award, Compass, Cpu, Check, 
  Smile, Activity, Zap, RefreshCw, Eye, Star, Info, X
} from "lucide-react";

export const Route = createFileRoute("/avatar")({
  head: () => ({ meta: [{ title: "Your Avatar — GyaanSetu AI" }] }),
  component: AvatarDashboard,
});

// Customization options for the Avatar Studio
const OUTFITS = [
  { id: "cyberpunk", name: "Cyberpunk Techwear", emoji: "🕶️", color: "from-cyan-500 to-blue-600" },
  { id: "academic", name: "Academic Robes", emoji: "🎓", color: "from-purple-600 to-indigo-700" },
  { id: "casual", name: "Silicon Casual", emoji: "👕", color: "from-slate-600 to-slate-800" },
  { id: "zen", name: "Zen Monk", emoji: "🧘", color: "from-amber-500 to-orange-600" }
];

const AURAS = [
  { id: "cyan", name: "Cyan Glow", style: "rgba(0, 245, 255, 0.4)", tailwind: "shadow-[0_0_40px_rgba(0,245,255,0.5)] bg-[#00F5FF]/10 text-[#00F5FF]" },
  { id: "pink", name: "Soft Pink", style: "rgba(255, 175, 210, 0.4)", tailwind: "shadow-[0_0_40px_rgba(255,175,210,0.5)] bg-[#ffafd2]/10 text-[#ffafd2]" },
  { id: "gold", name: "Golden Spark", style: "rgba(245, 158, 11, 0.4)", tailwind: "shadow-[0_0_40px_rgba(245,158,11,0.5)] bg-[#F59E0B]/10 text-[#F59E0B]" },
  { id: "emerald", name: "Emerald Flame", style: "rgba(34, 197, 94, 0.4)", tailwind: "shadow-[0_0_40px_rgba(34,197,94,0.5)] bg-[#22C55E]/10 text-[#22C55E]" }
];

const BADGES = [
  { name: "Logic Overlord", desc: "Scored 95%+ in 5 consecutive logic/math quizzes", icon: Star, unlocked: true },
  { name: "Pomodoro Knight", desc: "Completed 10 hours of focused Pomodoro study sessions", icon: Award, unlocked: true },
  { name: "Offline Pioneer", desc: "Ran first offline Gemma-2B query via local client", icon: Cpu, unlocked: true },
  { name: "Multilingual Master", desc: "Completed study units in both English and Hindi", icon: Compass, unlocked: false }
];

function AvatarDashboard() {
  // Customization States
  const [activeOutfit, setActiveOutfit] = useState(OUTFITS[0]);
  const [activeAura, setActiveAura] = useState(AURAS[0]);
  const [customizing, setCustomizing] = useState(false);
  
  // Interactive Scanning States
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  
  // Stats Popup State
  const [selectedStat, setSelectedStat] = useState<{ label: string; value: string; desc: string } | null>(null);
  
  // Modal overlay states for grid items
  const [activeGridModal, setActiveGridModal] = useState<string | null>(null);
  
  // XP Rewards counter
  const [xp, setXp] = useState(8420);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; icon: any } | null>(null);

  const showToast = (message: string, icon: any) => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 4000);
  };

  const runNeuralScan = () => {
    setScanning(true);
    setScanResult(null);
    setTimeout(() => {
      setScanning(false);
      setScanResult("Neural DNA Synced: Cognitive logic path optimal. +150 XP awarded!");
      setXp(prev => prev + 150);
    }, 2000);
  };

  const handleStatClick = (label: string, value: string) => {
    let desc = "";
    if (label === "Learning Style") {
      desc = "Your primary input channel is visual. You absorb complex systems 40% faster through flowchart node mapping and interactive radar analytics.";
    } else if (label === "Personality") {
      desc = "INTJ-A (Strategic Architect). You prefer logical deduction, structured timetables, and self-directed study units rather than collaborative peer groups.";
    } else if (label === "Top Strength") {
      desc = "Logic formulation. You are in the top 98th percentile of all local students. Your optimal learning path includes deep-work algorithmic theory.";
    } else {
      desc = "Growth edge in public speaking and audio description. Regular use of GyaanSetu 'Teach Back' tool is recommended to improve verbal syntax.";
    }
    setSelectedStat({ label, value, desc });
  };

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
        title="Your Learning Avatar" 
        subtitle="A high-fidelity representation of your learning DNA — style, strengths, and growth trajectory." 
        icon={User} 
      />

      <div className="grid lg:grid-cols-12 gap-6 items-stretch mb-6">
        
        {/* Left Column: Holographic Avatar Visualizer */}
        <div className="lg:col-span-5 flex flex-col">
          <GradientCard className="flex-1 flex flex-col justify-between relative overflow-hidden bg-[#0b1530] border border-blue-500/20 text-white shadow-lg p-6 min-h-[400px]">
            
            {/* Background elements */}
            <div className="absolute inset-0 bg-[#00f5ff]/5 blur-[80px] pointer-events-none" />
            
            {/* Top Info overlay */}
            <div className="flex justify-between items-start z-10">
              <div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase">Hologram Interface</div>
                <div className="text-sm font-bold text-white mt-0.5">DNA Aura Sync</div>
              </div>
              <div className="glass px-2.5 py-1 rounded-lg text-[10px] font-mono text-[#00f5ff]">
                XP: {xp}
              </div>
            </div>

            {/* Core Avatar Sphere Visualizer */}
            <div className="my-8 flex justify-center items-center relative flex-1">
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className={`relative h-44 w-44 rounded-full flex flex-col items-center justify-center transition-all duration-500 bg-[#0c1122]/60 border border-white/10 ${activeAura.tailwind}`}
              >
                {/* 3D Holographic Inner Core */}
                <div className="text-7xl mb-2 relative z-10">
                  {activeOutfit.emoji}
                </div>
                
                {/* Dynamic Stats text */}
                <div className="text-[9px] font-mono text-white/80 z-10 uppercase tracking-widest leading-none mt-1">
                  {activeOutfit.name.split(" ")[0]}
                </div>
                <div className="text-[7px] font-mono text-muted-foreground z-10 mt-1 uppercase tracking-wider">
                  Sync Mode: 100%
                </div>

                {/* Rotating scanner rings */}
                <div className="absolute inset-0 rounded-full border border-dashed border-[#00f5ff]/20 animate-spin [animation-duration:15s]" />
                <div className="absolute -inset-3 rounded-full border border-dashed border-[#8b5cf6]/10 animate-spin [animation-duration:25s] [animation-direction:reverse]" />
              </motion.div>

              {/* Scanning visual overlay */}
              <AnimatePresence>
                {scanning && (
                  <motion.div 
                    initial={{ top: "10%", opacity: 0 }}
                    animate={{ top: "90%", opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-x-8 h-0.5 bg-gradient-to-r from-transparent via-[#00f5ff] to-transparent shadow-[0_0_8px_#00f5ff]"
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Interactive Scanner controls */}
            <div className="space-y-3 z-10">
              {scanResult && (
                <div className="bg-[#00f5ff]/5 border border-[#00f5ff]/20 rounded-xl p-3 text-[11px] text-[#00f5ff] font-mono">
                  {scanResult}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={runNeuralScan}
                  disabled={scanning}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] py-2.5 text-xs font-bold text-[#050816] transition hover:shadow-lg disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} /> 
                  {scanning ? "Syncing DNA..." : "Neural Scan Sync"}
                </button>
                <button
                  onClick={() => setCustomizing(prev => !prev)}
                  className="glass px-4 py-2.5 rounded-xl text-xs font-bold border-white/10 hover:bg-white/5 transition"
                >
                  {customizing ? "Close Studio" : "Customize Outfit"}
                </button>
              </div>
            </div>

          </GradientCard>
        </div>

        {/* Right Column: Customization Studio / Stat Details */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          
          {/* Customization studio Panel */}
          <AnimatePresence mode="wait">
            {customizing ? (
              <motion.div 
                key="customizing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 bg-[#0b1530] border border-blue-500/20 text-white shadow-lg p-6 rounded-[28px] flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="font-display font-extrabold text-base text-white">Avatar Studio</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Customize your clothing outfits and learning DNA glow aura.</p>
                  </div>

                  {/* Outfit Selection */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-muted-foreground font-mono uppercase tracking-wider">Select Outfit Skin</label>
                    <div className="grid grid-cols-2 gap-2">
                      {OUTFITS.map((outfit) => (
                        <button
                          key={outfit.id}
                          onClick={() => { setActiveOutfit(outfit); showToast(`Outfit changed to ${outfit.name}`, Zap); }}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
                            activeOutfit.id === outfit.id
                              ? "bg-white/5 border-[#00f5ff]/40 text-white"
                              : "glass hover:bg-white/5 border-white/5 text-muted-foreground"
                          }`}
                        >
                          <span className="text-xl">{outfit.emoji}</span>
                          <span className="text-xs font-bold">{outfit.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Aura Selection */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-muted-foreground font-mono uppercase tracking-wider">Select Aura color</label>
                    <div className="grid grid-cols-2 gap-2">
                      {AURAS.map((aura) => (
                        <button
                          key={aura.id}
                          onClick={() => { setActiveAura(aura); showToast(`Aura changed to ${aura.name}`, Zap); }}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
                            activeAura.id === aura.id
                              ? "bg-white/5 border-[#00f5ff]/40 text-white"
                              : "glass border-white/5 text-muted-foreground hover:bg-white/5"
                          }`}
                        >
                          <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center ${aura.tailwind}`}>
                            <Check className="h-3 w-3" />
                          </span>
                          <span className="text-xs font-bold">{aura.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setCustomizing(false)}
                  className="w-full mt-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition"
                >
                  Save Changes
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="stat-details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 bg-[#0b1530] border border-blue-500/20 text-white shadow-lg p-6 rounded-[28px] flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="font-display font-extrabold text-base text-white">Cognitive Profile Breakdown</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Select any card below to view detailed neural analysis and recommended study adjustments.</p>
                  </div>

                  {/* Dynamic detail panel */}
                  <AnimatePresence mode="wait">
                    {selectedStat ? (
                      <motion.div
                        key={selectedStat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-[#00f5ff]/5 p-4 rounded-2xl border border-[#00f5ff]/20 space-y-2"
                      >
                        <div className="text-xs font-bold text-[#00f5ff] flex items-center gap-1.5">
                          <Info className="h-4 w-4" /> {selectedStat.label}: {selectedStat.value}
                        </div>
                        <p className="text-xs text-blue-100/80 leading-relaxed font-sans mt-1">
                          {selectedStat.desc}
                        </p>
                      </motion.div>
                    ) : (
                      <div className="bg-slate-900/60 p-5 rounded-2xl border border-dashed border-blue-500/20 text-xs text-blue-200/50 italic flex flex-col items-center justify-center h-28 text-center">
                        <Activity className="h-6 w-6 text-blue-300/30 mb-1" />
                        Click on any metric card below to review metrics.
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Subtitle / branding info */}
                <div className="mt-4 text-[10px] text-muted-foreground flex items-center gap-1.5 border-t border-white/5 pt-3">
                  <Sparkles className="h-3.5 w-3.5 text-[#00f5ff]" /> 
                  Cognitive profiling syncs automatically on local Gemma model-sets.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Grid of 4 Interactive Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Learning Style", value: "Visual", hint: "Diagrams & videos" },
              { label: "Personality", value: "INTJ-A", hint: "Strategic thinker" },
              { label: "Top Strength", value: "Logic", hint: "98th percentile" },
              { label: "Growth Edge", value: "Speaking", hint: "Practice daily" },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => handleStatClick(s.label, s.value)}
                className={`p-3.5 rounded-2xl border text-left transition-all hover:scale-[1.02] ${
                  selectedStat?.label === s.label
                    ? "border-[#00f5ff]/60 bg-[#00f5ff]/10 shadow-[0_0_20px_rgba(0,245,255,0.1)]"
                    : "border-blue-500/20 bg-[#0b1530] hover:border-blue-400/30"
                } text-white shadow-md`}
              >
                <div className="text-[10px] text-blue-300/80 font-mono uppercase tracking-wide font-semibold">{s.label}</div>
                <div className={`text-base font-bold mt-1 leading-none ${
                  selectedStat?.label === s.label ? "text-[#00f5ff]" : "text-white"
                }`}>{s.value}</div>
                <div className="text-[9px] text-blue-200/50 mt-1.5 leading-none font-mono">{s.hint}</div>
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Grid of Features with interactive modals */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { 
            id: "dna",
            title: "Learning DNA", 
            desc: "An AI-mapped profile of how you absorb, retain and apply knowledge across domains.", 
            tag: "Updated",
            accent: "from-[#00F5FF] to-[#06b6d4]"
          },
          { 
            id: "radar",
            title: "Skill Radar", 
            desc: "Real-time radar of six core competencies — visualized as a glowing aura around your avatar.", 
            tag: "Interactive",
            accent: "from-[#8B5CF6] to-[#6d28d9]"
          },
          { 
            id: "badges",
            title: "Achievement Badges", 
            desc: "Unlock collectible badges by hitting study streaks, quiz milestones, and skill mastery.",
            accent: "from-[#F59E0B] to-[#d97706]"
          },
          { 
            id: "personality",
            title: "Personality Lens", 
            desc: "Discover how your personality type shapes the way you should study and collaborate.",
            accent: "from-[#EC4899] to-[#be185d]"
          },
          { 
            id: "strength",
            title: "Strength Map", 
            desc: "An evolving map of every concept you've mastered, color-coded by recency and depth.",
            accent: "from-[#22C55E] to-[#16a34a]"
          },
          { 
            id: "studio",
            title: "Avatar Studio", 
            desc: "Customize your 3D look — pick outfits, auras, and animated emotes earned through XP.",
            accent: "from-[#00F5FF] to-[#8B5CF6]"
          },
        ].map((it, i) => (
          <motion.div
            key={it.title}
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={() => {
              if (it.id === "studio") {
                setCustomizing(true);
                showToast("Opening Avatar Studio customization...", Sparkles);
              } else {
                setActiveGridModal(it.id);
                showToast(`Viewing ${it.title} details...`, Sparkles);
              }
            }}
            className="cursor-pointer"
          >
            <div className="h-full bg-[#0b1530] border border-blue-500/20 hover:border-blue-400/40 text-white shadow-md hover:shadow-xl transition-all p-5 rounded-3xl flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${it.accent} flex items-center justify-center text-white font-bold text-xs shadow-md`}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                {it.tag && (
                  <span className="text-[9px] bg-[#00F5FF]/10 border border-[#00F5FF]/20 text-[#00F5FF] rounded-full px-2 py-0.5 font-mono font-bold uppercase tracking-wide">{it.tag}</span>
                )}
              </div>
              <h3 className="font-display font-bold text-sm text-white mb-1.5">{it.title}</h3>
              <p className="text-[11px] text-blue-200/60 leading-relaxed flex-1">{it.desc}</p>
              <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-[#00f5ff] font-mono font-semibold flex items-center gap-1">
                View Details →
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pop-up Modals for interactive items */}
      <AnimatePresence>
        {activeGridModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#0b1530] border border-blue-500/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden text-white"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#8b5cf6]/5 rounded-full blur-2xl" />

              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <h4 className="font-display font-extrabold text-base text-white flex items-center gap-1.5">
                  <Award className="h-5 w-5 text-[#00f5ff]" />
                  {activeGridModal === "dna" && "Learning DNA Profile"}
                  {activeGridModal === "radar" && "Six Competencies Radar"}
                  {activeGridModal === "badges" && "Badge Collection"}
                  {activeGridModal === "personality" && "Architect Studying Profile"}
                  {activeGridModal === "strength" && "Strength Map Nodes"}
                </h4>
                <button onClick={() => setActiveGridModal(null)} className="text-muted-foreground hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* DNA Profile content */}
              {activeGridModal === "dna" && (
                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  <p>Your dynamic neural profile registers the following metrics:</p>
                  <div className="space-y-2 bg-[#050816] p-3.5 rounded-xl border border-white/5 font-mono text-[10px]">
                    <div className="flex justify-between"><span>Retention Rate:</span> <span className="text-[#00f5ff]">92.4%</span></div>
                    <div className="flex justify-between"><span>Speed Index:</span> <span className="text-[#ffafd2]">1.2s/inf</span></div>
                    <div className="flex justify-between"><span>Cognitive Load Limit:</span> <span className="text-[#00f5ff]">450 FLOPS</span></div>
                  </div>
                  <p>GyaanSetu AI recommends studying Visual graphics for maximum recall.</p>
                </div>
              )}

              {/* Radar content */}
              {activeGridModal === "radar" && (
                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  <p>Six competencies mapped dynamically on GyaanSetu:</p>
                  <div className="space-y-2 bg-[#050816] p-3.5 rounded-xl border border-white/5 font-mono text-[10px]">
                    <div className="flex justify-between"><span>Critical Logic:</span> <span className="text-[#00f5ff]">96%</span></div>
                    <div className="flex justify-between"><span>Calculus:</span> <span className="text-[#00f5ff]">92%</span></div>
                    <div className="flex justify-between"><span>Vision OCR Processing:</span> <span className="text-emerald-400">80%</span></div>
                    <div className="flex justify-between"><span>Multilingual Vocabulary:</span> <span className="text-slate-400">70%</span></div>
                  </div>
                </div>
              )}

              {/* Badges content */}
              {activeGridModal === "badges" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300 mb-2">Your unlocked achievement badges:</p>
                  <div className="space-y-2.5">
                    {BADGES.map((b, idx) => {
                      const Icon = b.icon;
                      return (
                        <div key={idx} className={`p-3 rounded-xl border flex items-center gap-3 ${
                          b.unlocked ? "bg-[#050816] border-[#00f5ff]/20 text-white" : "bg-white/5 border-white/5 opacity-50 text-slate-400"
                        }`}>
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${b.unlocked ? "bg-[#00f5ff]/10 text-[#00f5ff]" : "bg-white/5 text-slate-500"}`}>
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold">{b.name} {b.unlocked ? "🏆" : "🔒"}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{b.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Personality content */}
              {activeGridModal === "personality" && (
                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  <div className="bg-[#00F5FF]/10 text-[#00F5FF] p-3 rounded-xl text-[11px] font-semibold">
                    INTJ Study Guideline: Focus on self-paced system architectures.
                  </div>
                  <p>As a Strategic Thinker, you learn best when constructing model connections. Avoid plain memorization templates; utilize GyaanSetu Planners for high recall.</p>
                </div>
              )}

              {/* Strength Map content */}
              {activeGridModal === "strength" && (
                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  <p>Your master concept nodes mapped by local Gemma-2B:</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-[#050816] p-2.5 rounded-lg border border-white/5">
                      <div className="text-muted-foreground">Quantum superposition</div>
                      <div className="text-[#00f5ff] font-bold mt-1">94% Mastery</div>
                    </div>
                    <div className="bg-[#050816] p-2.5 rounded-lg border border-white/5">
                      <div className="text-muted-foreground">DC Circuit Analysis</div>
                      <div className="text-[#00f5ff] font-bold mt-1">88% Mastery</div>
                    </div>
                    <div className="bg-[#050816] p-2.5 rounded-lg border border-white/5">
                      <div className="text-muted-foreground">Gradient Descent</div>
                      <div className="text-[#00f5ff] font-bold mt-1">95% Mastery</div>
                    </div>
                    <div className="bg-[#050816] p-2.5 rounded-lg border border-white/5">
                      <div className="text-muted-foreground">RC Charge Time</div>
                      <div className="text-amber-500 font-bold mt-1">68% Mastery</div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setActiveGridModal(null)}
                className="w-full mt-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition"
              >
                Close Panel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
    </AppLayout>
  );
}


