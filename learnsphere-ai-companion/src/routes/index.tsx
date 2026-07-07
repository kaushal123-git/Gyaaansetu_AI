import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileQuestion,
  Flame,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  Mic,
  Play,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GyaanSetu AI | Personal AI Study Companion" },
      { name: "description", content: "A focused AI learning cockpit for planning, tutoring, quizzes, progress, and career growth." },
    ],
  }),
  component: LandingPage,
});

const focusCards = [
  { label: "Current streak", value: "12 days", icon: Flame, accent: "text-amber-500", bg: "bg-amber-500/10" },
  { label: "Today focus", value: "2.5 hrs", icon: Clock3, accent: "text-sky-500", bg: "bg-sky-500/10" },
  { label: "Mastery gain", value: "+18%", icon: LineChart, accent: "text-emerald-500", bg: "bg-emerald-500/10" },
  { label: "Skill rank", value: "#247", icon: Trophy, accent: "text-violet-500", bg: "bg-violet-500/10" },
];

const workspaceTools = [
  { title: "AI Tutor", desc: "Ask doubts and get step-by-step explanations.", icon: Bot, to: "/tutor" },
  { title: "Learning Plan", desc: "Follow adaptive daily tasks and revision loops.", icon: BookOpen, to: "/learning" },
  { title: "Quiz Builder", desc: "Turn topics and notes into practice tests.", icon: FileQuestion, to: "/quiz" },
  { title: "Career Roadmap", desc: "Map skills to roles and project milestones.", icon: Target, to: "/career" },
];

const timeline = [
  { time: "09:00", title: "Revise RC circuits", tag: "Physics", done: true },
  { time: "10:30", title: "Solve 5 DSA prompts", tag: "Coding", done: true },
  { time: "14:00", title: "Ask tutor about DP states", tag: "AI Tutor", done: false },
  { time: "17:00", title: "Career roadmap checkpoint", tag: "Growth", done: false },
];

const simulatorPrompts = [
  {
    title: "Explain a concept",
    prompt: "Teach quantum superposition using a simple analogy.",
    answer: "Think of a spinning coin. Before it lands, it carries both outcomes as possibilities. Tiny particles behave similarly until measured.",
  },
  {
    title: "Build a quiz",
    prompt: "Create quick practice for React hooks.",
    answer: "Generated 5 questions covering useState, useEffect dependencies, memoization, custom hooks, and stale closures.",
  },
  {
    title: "Plan my day",
    prompt: "I have 90 minutes. What should I study?",
    answer: "Start with a 25-minute weak-topic review, do 35 minutes of active recall, then use 20 minutes for a quiz and 10 minutes for notes.",
  },
];

const impactStats = [
  { value: "10k+", label: "Courses" },
  { value: "500k+", label: "Learning Hours" },
  { value: "25+", label: "Languages Supported" },
  { value: "95%", label: "Improvement Rate" },
  { value: "100+", label: "AI Tutors" },
];

const testimonials = [
  {
    name: "Aarav Sharma",
    role: "Computer Science Student",
    quote: "GyaanSetu AI did not just teach me coding; it understood how I learn. The AI tutor felt like having a senior engineer sitting right next to me.",
    src: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120",
  },
  {
    name: "Dr. Elena Vaneva",
    role: "Senior Educator",
    quote: "The insights I get into my students' progress are powerful. It lets me focus on mentorship while the platform handles drills and revision loops.",
    src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120",
  },
  {
    name: "Mark Thompson",
    role: "Parent",
    quote: "My son's confidence has grown a lot. The personalized study flow helps him manage stress and keep moving without feeling lost.",
    src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=120",
  },
];

function LandingPage() {
  const [activePrompt, setActivePrompt] = useState(simulatorPrompts[0]);
  const [typedAnswer, setTypedAnswer] = useState("");

  useEffect(() => {
    setTypedAnswer("");
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setTypedAnswer(activePrompt.answer.slice(0, index));
      if (index >= activePrompt.answer.length) {
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [activePrompt]);

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-950 font-sans selection:bg-sky-200 selection:text-slate-950">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.18),transparent_32%),radial-gradient(circle_at_78%_12%,rgba(124,58,237,0.14),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:42px_42px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <img src="/Gyaansetu AI logo.png" alt="GyaanSetu AI" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <div className="font-display text-lg font-black leading-none tracking-tight text-slate-950">GyaanSetu AI</div>
              <div className="mt-1 hidden text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:block">Study cockpit</div>
            </div>
          </Link>

          <div className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-100/80 p-1 text-sm font-semibold text-slate-600 md:flex">
            {[
              { label: "Home", href: "#" },
              { label: "Features", href: "#features" },
              { label: "AI Tutor", href: "#tutor" },
              { label: "How it works", href: "#roadmap" },
              { label: "Impact", href: "#impact" },
            ].map((item, index) => (
              <a
                key={item.label}
                href={item.href}
                className={`rounded-full px-4 py-2 transition ${index === 0 ? "bg-white text-slate-950 shadow-sm" : "hover:text-slate-950"}`}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              search={{ mode: "login" }}
              className="hidden rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:inline-flex"
            >
              Login
            </Link>
            <Link
              to="/auth"
              search={{ mode: "register" }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-sky-600"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        <section className="grid min-h-[calc(100vh-7rem)] gap-5 lg:grid-cols-[1.02fr_1.4fr]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col justify-between rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 lg:p-8"
          >
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-sky-700">
                <Sparkles className="h-3.5 w-3.5" />
                Personal AI Study OS
              </div>

              <h1 className="mt-7 max-w-2xl font-display text-5xl font-black leading-[0.98] tracking-tight text-slate-950 md:text-6xl lg:text-7xl">
                Your daily learning cockpit.
              </h1>

              <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-slate-600">
                Plan your study day, ask AI doubts, generate quizzes, track mastery, and build career momentum from one focused workspace.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/auth"
                  search={{ mode: "register" }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-sky-600/20 transition hover:-translate-y-0.5 hover:bg-slate-950"
                >
                  Open Workspace <LayoutDashboard className="h-4 w-4" />
                </Link>
                <a
                  href="#tutor"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                >
                  Try Tutor <Play className="h-4 w-4 fill-slate-800" />
                </a>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3">
              {focusCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${card.bg} ${card.accent}`}>
                    <card.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="font-display text-2xl font-black text-slate-950">{card.value}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">{card.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="grid gap-5 lg:grid-rows-[auto_1fr]"
          >
            <div className="rounded-[32px] border border-slate-800 bg-slate-950 p-5 text-[#f8fafc] shadow-2xl shadow-slate-900/20 lg:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-sky-300">
                    <ShieldCheck className="h-4 w-4" />
                    Live study status
                  </div>
                  <h2 className="mt-3 font-display text-2xl font-black tracking-tight text-[#f8fafc]">Aarav's workspace</h2>
                </div>
                <div className="rounded-2xl bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-300 ring-1 ring-emerald-400/20">
                  AI ready
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_0.8fr]">
                <div className="rounded-3xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#cbd5e1]">Course mastery</div>
                      <div className="mt-1 font-display text-5xl font-black text-[#f8fafc]">84%</div>
                    </div>
                    <div className="relative h-24 w-24">
                      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="10" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#38bdf8" strokeLinecap="round" strokeWidth="10" strokeDasharray="251" strokeDashoffset="40" />
                      </svg>
                      <Target className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-sky-300" />
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-2">
                    {["React", "DSA", "Physics"].map((topic, index) => (
                      <div key={topic} className="rounded-2xl bg-slate-900 p-3 ring-1 ring-white/10">
                        <div className="text-[10px] font-black text-[#dbeafe]">{topic}</div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-sky-400" style={{ width: `${[78, 62, 91][index]}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-5 text-slate-950">
                  <div className="flex items-center justify-between">
                    <div className="font-display text-lg font-black">Today</div>
                    <CalendarDays className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {timeline.map((item) => (
                      <div key={item.title} className="flex gap-3">
                        <div className="w-10 pt-1 text-[10px] font-black text-slate-400">{item.time}</div>
                        <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-xs font-black">{item.title}</div>
                            <CheckCircle2 className={`h-4 w-4 ${item.done ? "text-emerald-500" : "text-slate-300"}`} />
                          </div>
                          <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.tag}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div id="tutor" className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">AI actions</div>
                    <h3 className="mt-2 font-display text-2xl font-black text-slate-950">Pick a prompt</h3>
                  </div>
                  <Bot className="h-8 w-8 text-sky-500" />
                </div>
                <div className="mt-5 space-y-3">
                  {simulatorPrompts.map((prompt) => (
                    <button
                      key={prompt.title}
                      onClick={() => setActivePrompt(prompt)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        activePrompt.title === prompt.title
                          ? "border-sky-300 bg-sky-50 text-slate-950"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-black">{prompt.title}</div>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                      <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">{prompt.prompt}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sky-300">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-950">GyaanSetu response</div>
                    <div className="text-xs font-semibold text-slate-500">Typing from local tutor preview</div>
                  </div>
                </div>

                <div className="mt-5 min-h-44 rounded-3xl bg-slate-950 p-5 text-sm font-semibold leading-7 text-slate-100">
                  {typedAnswer}
                  <span className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-pulse rounded-sm bg-sky-300" />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Sources", value: "3" },
                    { label: "Time", value: "1.2s" },
                    { label: "Mode", value: "Local" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="font-display text-lg font-black">{item.value}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="features" className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Workspace modules</div>
                <h2 className="mt-2 font-display text-3xl font-black text-slate-950">Everything opens into action</h2>
              </div>
              <Link to="/auth" search={{ mode: "register" }} className="text-sm font-black text-sky-600 hover:text-slate-950">
                Create account
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {workspaceTools.map((tool) => (
                <Link
                  key={tool.title}
                  to="/auth"
                  search={{ mode: "login" }}
                  className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:border-sky-200 hover:bg-white hover:shadow-lg hover:shadow-slate-200/60"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm ring-1 ring-slate-200">
                      <tool.icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-sky-600" />
                  </div>
                  <div className="mt-5 font-display text-xl font-black text-slate-950">{tool.title}</div>
                  <div className="mt-2 text-sm font-semibold leading-6 text-slate-500">{tool.desc}</div>
                </Link>
              ))}
            </div>
          </div>

          <div id="progress" className="rounded-[32px] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300 ring-1 ring-sky-300/20">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-2xl font-black">Weekly progress</div>
                <div className="text-xs font-semibold text-slate-400">Focused, readable, no clutter.</div>
              </div>
            </div>

            <div className="mt-8 flex h-52 items-end gap-3">
              {[54, 72, 46, 88, 64, 94, 78].map((height, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-3">
                  <div className="flex h-40 w-full items-end overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ height: 0 }}
                      whileInView={{ height: `${height}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: index * 0.05 }}
                      className="w-full rounded-full bg-gradient-to-t from-sky-500 to-emerald-300"
                    />
                  </div>
                  <div className="text-[10px] font-black text-slate-500">{["M", "T", "W", "T", "F", "S", "S"][index]}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="roadmap" className="mt-5 grid gap-5 md:grid-cols-3">
          {[
            { title: "Multilingual tutor", desc: "English, Hindi, and more for accessible study support.", icon: Mic },
            { title: "Skill radar", desc: "See weak areas before they become blockers.", icon: Radar },
            { title: "Career bridge", desc: "Convert learning progress into job-ready milestones.", icon: GraduationCap },
          ].map((item) => (
            <div key={item.title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="mt-5 font-display text-xl font-black text-slate-950">{item.title}</div>
              <div className="mt-2 text-sm font-semibold leading-6 text-slate-500">{item.desc}</div>
            </div>
          ))}
        </section>

        <section id="impact" className="mt-5 rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Impact</div>
              <h2 className="mt-2 font-display text-3xl font-black text-slate-950">Built for measurable learning outcomes</h2>
            </div>
            <div className="rounded-2xl bg-sky-50 px-4 py-2 text-xs font-black text-sky-700 ring-1 ring-sky-100">
              Live community metrics
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {impactStats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
                <div className="font-display text-3xl font-black text-sky-600">{stat.value}</div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 lg:p-8">
          <div className="max-w-2xl">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Community</div>
            <h2 className="mt-2 font-display text-3xl font-black text-slate-950">Trusted by learning communities</h2>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {testimonials.map((test) => (
              <div key={test.name} className="flex min-h-72 flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-semibold leading-7 text-slate-600">"{test.quote}"</div>
                <div className="mt-6 flex items-center gap-3 border-t border-slate-200 pt-4">
                  <img src={test.src} alt={test.name} className="h-11 w-11 rounded-2xl object-cover" />
                  <div>
                    <div className="text-sm font-black text-slate-950">{test.name}</div>
                    <div className="text-xs font-bold text-slate-500">{test.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[32px] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-900/20 lg:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-sky-300 ring-1 ring-sky-300/20">
                <Zap className="h-3.5 w-3.5" />
                Ready to begin
              </div>
              <h2 className="mt-5 max-w-2xl font-display text-4xl font-black tracking-tight lg:text-5xl">
                Start your AI learning journey today.
              </h2>
              <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-slate-400">
                Join students and professionals who use GyaanSetu AI to plan smarter, practice consistently, and build confidence.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ mode: "register" }}
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-300"
              >
                Create Free Account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/auth"
                search={{ mode: "login" }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:border-sky-400 hover:bg-slate-700"
              >
                Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-200 bg-white px-5 py-12 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <img src="/Gyaansetu AI logo.png" alt="GyaanSetu AI" className="h-8 w-8 object-contain" />
              </div>
              <span className="font-display text-lg font-black text-slate-950">GyaanSetu AI</span>
            </div>
            <p className="max-w-xs text-sm font-semibold leading-7 text-slate-500">
              Empowering learners through AI guidance, structured practice, and personalized progress.
            </p>
          </div>

          {[
            { title: "Product", links: ["Features", "AI Tutor", "Learning Path", "Solutions"] },
            { title: "Company", links: ["About Us", "Careers", "Contact", "Blog"] },
            { title: "Resources", links: ["Documentation", "Community", "Support Center", "API Access"] },
          ].map((group) => (
            <div key={group.title} className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-950">{group.title}</div>
              <div className="flex flex-col gap-2 text-sm font-semibold text-slate-500">
                {group.links.map((link) => (
                  <a key={link} href="#" className="transition hover:text-sky-600">
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-7xl flex-col justify-between gap-4 border-t border-slate-200 pt-6 text-xs font-semibold text-slate-500 md:flex-row md:items-center">
          <div>© 2026 GyaanSetu AI. Bridging knowledge through personalized learning.</div>
          <div className="flex gap-5">
            <a href="#" className="transition hover:text-sky-600">Privacy Policy</a>
            <a href="#" className="transition hover:text-sky-600">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
