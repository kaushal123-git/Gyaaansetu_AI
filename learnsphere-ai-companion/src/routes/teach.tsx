import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/ui-kit/FeaturePage";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/teach")({
  head: () => ({ meta: [{ title: "Teach Back — LearnSphere AI" }] }),
  component: () => (
    <FeaturePage
      icon={GraduationCap}
      title="Teach Back"
      subtitle="The Feynman technique, supercharged — explain it back and let AI grade your understanding."
      cta="Start Teach-Back Session"
      stats={[
        { label: "Sessions", value: "34" },
        { label: "Avg Clarity", value: "8.4/10" },
        { label: "Top Concept", value: "Recursion" },
        { label: "Improvement", value: "+22%" },
      ]}
      items={[
        { title: "Voice Explanation", desc: "Speak your understanding — AI transcribes and analyzes in real time." },
        { title: "Clarity Score", desc: "How clearly did you explain? Detailed feedback on jargon, flow, and brevity." },
        { title: "Understanding Score", desc: "AI quizzes back to verify true depth vs surface-level recall." },
        { title: "Confidence Meter", desc: "Voice-tone and pause analysis estimate how confident you actually felt." },
        { title: "Accuracy Check", desc: "Cross-references your explanation against verified sources for correctness." },
        { title: "Scorecard", desc: "Beautiful PDF scorecard with breakdown, suggestions, and next concept to teach.", tag: "PDF" },
      ]}
    />
  ),
});
