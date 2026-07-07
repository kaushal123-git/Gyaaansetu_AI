import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/ui-kit/FeaturePage";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/performance")({
  head: () => ({ meta: [{ title: "Performance — LearnSphere AI" }] }),
  component: () => (
    <FeaturePage
      icon={TrendingUp}
      title="Performance Analytics"
      subtitle="Advanced dashboard tracking accuracy, efficiency, focus, and your global rank in real time."
      cta="Export Report (PDF)"
      stats={[
        { label: "Accuracy", value: "87%", hint: "+5% this week" },
        { label: "Efficiency", value: "92" },
        { label: "Completion Rate", value: "78%" },
        { label: "Global Rank", value: "#284" },
      ]}
      items={[
        { title: "Accuracy Trends", desc: "Line chart of your accuracy across subjects with anomaly detection." },
        { title: "Learning Efficiency", desc: "Outcome per minute studied — find your peak productivity windows." },
        { title: "Focus Score", desc: "Composite of attention, depth, and session length, refreshed daily." },
        { title: "Completion Rate", desc: "Course, quiz, and project completion velocity vs your personal best." },
        { title: "Leaderboard", desc: "Global, country, and friend leaderboards refreshed every 15 minutes.", tag: "Live" },
        { title: "Growth Trends", desc: "Quarter-over-quarter growth with AI-narrated highlights and lowlights." },
      ]}
    />
  ),
});
