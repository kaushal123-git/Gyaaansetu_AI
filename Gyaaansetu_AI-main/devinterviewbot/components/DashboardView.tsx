import React from 'react';
import {
  BarChart2,
  Calendar,
  CheckCircle2,
  Code2,
  Coffee,
  FileCode2,
  Play,
  Target,
  Trophy,
} from 'lucide-react';

interface Activity {
  id: string;
  type: 'solve' | 'achievement';
  title: string;
  detail: string;
  timestamp: number;
}

interface UserProgress {
  email: string;
  xp: number;
  problemsSolved: number;
  mockInterviews: number;
  successRate: number;
  languages: {
    python: number;
    typescript: number;
    c: number;
    cpp: number;
    java: number;
  };
  activities: Activity[];
}

interface DashboardViewProps {
  user: UserProgress | null;
  onNavigateToPractice: (language?: string) => void;
}

const TOTAL_SYSTEM_PROBLEMS = 45;

const languageCards = [
  { key: 'python', label: 'Python', code: 'PY', color: 'bg-[#3776AB]', track: 'from-[#3776AB] to-[#FFD43B]' },
  { key: 'typescript', label: 'TypeScript', code: 'TS', color: 'bg-[#3178C6]', track: 'from-[#3178C6] to-[#00599C]' },
  { key: 'cpp', label: 'C++', code: 'C++', color: 'bg-[#00599C]', track: 'from-[#00599C] to-[#0080FF]' },
  { key: 'java', label: 'Java', code: 'JV', color: 'bg-[#EA2D2E]', track: 'from-[#EA2D2E] to-[#F89820]' },
  { key: 'c', label: 'C', code: 'C', color: 'bg-[#5C6BC0]', track: 'from-[#5C6BC0] to-[#3F51B5]' },
] as const;

const defaultStats: UserProgress = {
  email: '',
  xp: 0,
  problemsSolved: 0,
  mockInterviews: 0,
  successRate: 0,
  languages: { python: 0, typescript: 0, c: 0, cpp: 0, java: 0 },
  activities: [],
};

export default function DashboardView({ user, onNavigateToPractice }: DashboardViewProps) {
  const stats = user || defaultStats;
  const username = stats.email ? stats.email.split('@')[0] : 'Developer';
  const displayName = username.charAt(0).toUpperCase() + username.slice(1);

  return (
    <div className="flex-1 w-full overflow-y-auto bg-[#F5F7FB] px-5 py-6 text-[#111827]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-[#DDE6F3] bg-white p-7 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                Welcome back, {displayName}
              </div>

              <h1 className="text-3xl font-black leading-tight tracking-tight text-[#1E1B4B] lg:text-4xl">
                Interview prep dashboard
              </h1>

              <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-600">
                Practice DSA, system design, and coding interviews from one clean workspace.
              </p>

              <button
                onClick={() => onNavigateToPractice()}
                className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-[#1E1B4B] px-6 py-3 text-sm font-black text-white shadow-md transition-colors hover:bg-[#312E81]"
              >
                <Play className="h-4 w-4 fill-current" />
                Start practicing
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Readiness</p>
                  <p className="mt-1 text-3xl font-black text-[#1E1B4B]">{stats.successRate}%</p>
                </div>
                <Target className="h-10 w-10 text-indigo-600" />
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.min(100, stats.successRate)}%` }} />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-600">
                {stats.problemsSolved} problems solved across {stats.mockInterviews} mock interviews.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={<Code2 className="h-5 w-5" />} label="Problems Solved" value={stats.problemsSolved} tone="indigo" />
          <MetricCard icon={<Calendar className="h-5 w-5" />} label="Mock Interviews" value={stats.mockInterviews} tone="emerald" />
          <MetricCard icon={<Trophy className="h-5 w-5" />} label="Success Rate" value={`${stats.successRate}%`} tone="amber" />
          <MetricCard icon={<BarChart2 className="h-5 w-5" />} label="XP Earned" value={stats.xp} tone="sky" />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-[#DDE6F3] bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-sm font-black tracking-wide text-[#1E1B4B]">
                <span className="h-4 w-1.5 rounded-full bg-indigo-600" />
                Practice by language
              </h2>
              <FileCode2 className="h-5 w-5 text-indigo-600" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {languageCards.map((language) => {
                const count = stats.languages?.[language.key] || 0;
                const progress = Math.min(100, (count / TOTAL_SYSTEM_PROBLEMS) * 100);

                return (
                  <button
                    key={language.key}
                    onClick={() => onNavigateToPractice(language.key)}
                    className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 text-left transition-colors hover:border-indigo-300 hover:bg-white"
                  >
                    <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl text-xs font-black text-white ${language.color}`}>
                      {language.code}
                    </div>
                    <div className="text-sm font-black text-[#111827]">{language.label}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                      {count} / {TOTAL_SYSTEM_PROBLEMS}
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full bg-gradient-to-r ${language.track}`} style={{ width: `${progress}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-[#DDE6F3] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-sm font-black tracking-wide text-[#1E1B4B]">
                <span className="h-4 w-1.5 rounded-full bg-fuchsia-500" />
                Recent activity
              </h2>
            </div>

            {stats.activities.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-[#F8FAFC] p-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                  <Coffee className="h-6 w-6" />
                </div>
                <p className="text-sm font-black text-[#1E1B4B]">No activity yet</p>
                <p className="mt-2 max-w-[220px] text-xs font-semibold leading-5 text-slate-500">
                  Submit code in practice mode to start building your interview history.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {stats.activities.map((activity, index) => (
                  <div key={activity.id || index} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-[#F8FAFC] p-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-[#111827]">{activity.title}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{activity.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: 'indigo' | 'emerald' | 'amber' | 'sky';
}) {
  const toneClass = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
  }[tone];

  return (
    <div className="flex items-center gap-5 rounded-2xl border border-[#DDE6F3] bg-white p-6 text-left shadow-sm">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${toneClass}`}>
        {icon}
      </div>
      <div>
        <div className="font-mono text-3xl font-black leading-none text-[#111827]">{value}</div>
        <div className="mt-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{label}</div>
      </div>
    </div>
  );
}
