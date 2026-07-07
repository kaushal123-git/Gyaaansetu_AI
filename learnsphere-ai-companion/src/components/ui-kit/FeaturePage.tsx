import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui-kit/Card";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Sparkles, ChevronRight } from "lucide-react";

type Stat = { label: string; value: string; hint?: string };
type Item = { title: string; desc: string; tag?: string };

// Unique accent colors for each feature card
const CARD_ACCENTS = [
  "from-[#00F5FF] to-[#06b6d4]",
  "from-[#8B5CF6] to-[#6d28d9]",
  "from-[#F59E0B] to-[#d97706]",
  "from-[#EC4899] to-[#be185d]",
  "from-[#22C55E] to-[#16a34a]",
  "from-[#00F5FF] to-[#8B5CF6]",
];

export function FeaturePage({
  icon: Icon,
  title,
  subtitle,
  stats,
  items,
  cta,
  accent = "from-[#00F5FF] to-[#8B5CF6]",
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  stats?: Stat[];
  items: Item[];
  cta?: string;
  accent?: string;
}) {
  return (
    <AppLayout>
      {/* Page Header — light bg from AppLayout, dark navy text */}
      <PageHeader title={title} subtitle={subtitle} icon={Icon} />

      {/* Hero Banner */}
      <div className="mb-6 bg-[#0b1530] border border-blue-500/20 rounded-3xl p-6 relative overflow-hidden shadow-lg">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00f5ff]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#8b5cf6]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative grid lg:grid-cols-[1fr_auto] gap-5 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#00f5ff]/10 border border-[#00f5ff]/20 rounded-full px-3 py-1 text-xs text-[#00f5ff] font-mono font-semibold mb-3">
              <Sparkles className="h-3 w-3" /> Powered by GyaanSetu AI
            </div>
            <p className="text-blue-100/80 text-sm max-w-2xl leading-relaxed">{subtitle}</p>
          </div>
          {cta && (
            <button
              className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${accent} px-5 py-2.5 text-sm font-bold text-[#050816] shadow-lg hover:scale-[1.02] transition-all shrink-0`}
            >
              {cta} <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -2 }}
              className="bg-[#0b1530] border border-blue-500/20 rounded-2xl p-4 text-white shadow-md hover:border-blue-400/30 transition-all"
            >
              <div className="text-[10px] text-blue-300/70 font-mono uppercase tracking-wider font-semibold">{s.label}</div>
              <div className="mt-1.5 text-2xl font-display font-bold text-[#00f5ff]">{s.value}</div>
              {s.hint && <div className="text-[10px] text-blue-200/50 mt-1 font-mono">{s.hint}</div>}
            </motion.div>
          ))}
        </div>
      )}

      {/* Feature Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it, i) => (
          <motion.div
            key={it.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="cursor-default"
          >
            <div className="h-full bg-[#0b1530] border border-blue-500/20 hover:border-blue-400/40 text-white shadow-md hover:shadow-xl transition-all p-5 rounded-3xl flex flex-col">
              {/* Card header */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`h-9 w-9 rounded-xl bg-gradient-to-br ${CARD_ACCENTS[i % CARD_ACCENTS.length]} flex items-center justify-center text-white font-bold text-xs shadow-md`}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                {it.tag && (
                  <span className="text-[9px] bg-[#00F5FF]/10 border border-[#00F5FF]/20 text-[#00F5FF] rounded-full px-2 py-0.5 font-mono font-bold uppercase tracking-wide">
                    {it.tag}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h3 className="font-display font-bold text-sm text-white mb-1.5">{it.title}</h3>
              <p className="text-[11px] text-blue-200/60 leading-relaxed flex-1">{it.desc}</p>

              {/* Footer link */}
              <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-[#00f5ff] font-mono font-semibold flex items-center gap-1">
                Explore Feature →
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </AppLayout>
  );
}
