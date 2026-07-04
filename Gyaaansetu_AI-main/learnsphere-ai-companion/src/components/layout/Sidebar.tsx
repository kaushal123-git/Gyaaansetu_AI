import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Bot, User, Compass, Home, HeartPulse, BookOpen,
  Smile, TrendingUp, FolderKanban, FileQuestion, Radar, Swords, GraduationCap,
  Calendar, Network, Mic, LogOut, X, Award, Flame, Code2
} from "lucide-react";
import { useState, useEffect } from "react";

const groups = [
  {
    title: "Workspace",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/learning", label: "My Learning Plan", icon: BookOpen },
      { to: "/tutor", label: "Ask AI Tutor", icon: Bot },
    ]
  },
  {
    title: "AI Study Labs",
    items: [
      { to: "/dev-interview", label: "Dev Interview Bot", icon: Code2 },
      { to: "/projects", label: "Build Projects", icon: FolderKanban },
      { to: "/quiz", label: "Practice Quizzes", icon: FileQuestion },
      { to: "/teach", label: "Teach Back", icon: GraduationCap },
      { to: "/visualizer", label: "Visualizer", icon: Network },
      { to: "/voice", label: "Voice Notes", icon: Mic },
    ]
  },
  {
    title: "Growth & Progress",
    items: [
      { to: "/career", label: "Career Roadmap", icon: Compass },
      { to: "/skills", label: "Skills Radar", icon: Radar },
      { to: "/avatar", label: "My Profile", icon: User },
      { to: "/performance", label: "Performance", icon: TrendingUp },
      { to: "/vault", label: "Certificate Vault", icon: Award },
    ]
  },
  {
    title: "Wellness & Play",
    items: [
      { to: "/focus", label: "Focus Room", icon: Home },
      { to: "/health", label: "Health Monitor", icon: HeartPulse },
      { to: "/timetable", label: "Timetable", icon: Calendar },
      { to: "/mood", label: "Mood Check-in", icon: Smile },
      { to: "/wars", label: "Study Wars", icon: Swords },
    ]
  }
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open: mobileOpen = false, onClose }: SidebarProps) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [userName, setUserName] = useState("Student");
  const [streakDays, setStreakDays] = useState(0);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);

  useEffect(() => {
    const userStr = localStorage.getItem("gyaansetu_user");
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        if (userObj.name) setUserName(userObj.name);
      } catch (e) {
        // ignore
      }
    }

    const statsStr = localStorage.getItem("gyaansetu_stats");
    if (statsStr) {
      try {
        const statsObj = JSON.parse(statsStr);
        if (statsObj.streakDays !== undefined) setStreakDays(statsObj.streakDays);
        const studyHours = statsObj.studyHours || 0;
        const computedXp = Math.floor(studyHours * 100);
        setXp(computedXp);
        setLevel(Math.floor(computedXp / 1000) + 1);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => onClose?.()}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 flex flex-col bg-white/90 backdrop-blur-xl border-r border-slate-200/70 transition-transform duration-300 shadow-xl shadow-slate-200/40 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-200/70">
          <Link to="/" className="flex items-center gap-3" onClick={() => onClose?.()}>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200 shrink-0 p-0.5">
              <img
                src="/Gyaansetu AI logo.png"
                alt="GyaanSetu AI"
                className="h-full w-full object-contain rounded-lg"
              />
            </div>
            <div>
              <div className="font-display font-bold text-sm leading-none text-slate-800 tracking-tight">
                GyaanSetu AI
              </div>
              <div className="text-[9px] text-indigo-500/70 mt-1 uppercase font-mono tracking-widest">
                Study workspace
              </div>
            </div>
          </Link>
          <button onClick={() => onClose?.()} className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-4">
          {groups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="text-[9px] uppercase font-mono font-semibold tracking-widest text-slate-400/80 px-3 mb-1">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.to;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => onClose?.()}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200 ${active
                          ? "bg-indigo-50 border border-indigo-200/70 text-indigo-700 font-semibold shadow-sm shadow-indigo-100"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 border border-transparent"
                        }`}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-indigo-500"
                        />
                      )}
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-indigo-500" : "text-slate-400 group-hover:text-slate-600"
                          }`}
                      />
                      <span className="font-medium truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-slate-200/70">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm text-white shadow-md shadow-indigo-200">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate text-slate-800">{userName}</div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <span className="text-amber-400">🔥</span>
                  <span>{streakDays} day streak</span>
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("gyaansetu_user");
                  localStorage.removeItem("gyaansetu_stats");
                  document.cookie = "gyaansetu_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                  window.location.href = "/";
                }}
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg p-1 transition-all duration-200"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            {/* XP Progress Bar */}
            <div className="mt-3 flex items-center justify-between text-[10px] mb-1.5">
              <span className="text-slate-500 font-mono inline-flex items-center gap-1">
                <Flame className="h-3 w-3 text-amber-400" />
                Level {level}
              </span>
              <span className="text-indigo-600 font-mono font-bold">{xp.toLocaleString()} XP</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(xp % 1000) / 10}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
              />
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              {1000 - (xp % 1000)} XP until the next level
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
