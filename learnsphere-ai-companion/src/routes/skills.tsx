import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { GlassCard, PageHeader, GradientCard } from "@/components/ui-kit/Card";
import { Radar as RadarIcon } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/skills")({
  head: () => ({ meta: [{ title: "Skill Radar — LearnSphere AI" }] }),
  component: Skills,
});

const data = [
  { skill: "Coding", value: 92 },
  { skill: "Communication", value: 68 },
  { skill: "Aptitude", value: 85 },
  { skill: "Leadership", value: 74 },
  { skill: "Creativity", value: 80 },
  { skill: "Critical Thinking", value: 88 },
];

function Skills() {
  return (
    <AppLayout>
      <PageHeader title="Skill Radar" subtitle="A real-time radar of your six core competencies." icon={RadarIcon} />
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4">
        <GradientCard>
          <div className="h-[420px]">
            <ResponsiveContainer>
              <RadarChart data={data}>
                <PolarGrid stroke="rgba(255,255,255,0.12)" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                <Radar dataKey="value" stroke="#00F5FF" fill="url(#radarFill)" fillOpacity={0.5} strokeWidth={2.5} />
                <defs>
                  <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#00F5FF" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GradientCard>
        <div className="space-y-3">
          {data.map((d) => (
            <GlassCard key={d.skill}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{d.skill}</span>
                <span className="text-sm font-mono text-[#00F5FF]">{d.value}</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6]" style={{ width: `${d.value}%` }} />
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
