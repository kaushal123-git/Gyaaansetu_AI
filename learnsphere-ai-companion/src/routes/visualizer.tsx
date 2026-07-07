import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/ui-kit/FeaturePage";
import { Network } from "lucide-react";

export const Route = createFileRoute("/visualizer")({
  head: () => ({ meta: [{ title: "Visualizer — LearnSphere AI" }] }),
  component: () => (
    <FeaturePage
      icon={Network}
      title="Concept Visualizer"
      subtitle="Turn any topic into mind maps, flow charts, diagrams, infographics, and concept trees."
      cta="Visualize a Concept"
      stats={[
        { label: "Visuals Created", value: "92" },
        { label: "Mind Maps", value: "31" },
        { label: "Diagrams", value: "44" },
        { label: "Exports", value: "PNG / SVG" },
      ]}
      items={[
        { title: "Mind Maps", desc: "Auto-generated radial maps with AI-grouped sub-branches and color logic." },
        { title: "Flow Charts", desc: "Process and algorithm flowcharts from plain-English descriptions." },
        { title: "System Diagrams", desc: "Architecture diagrams for software and engineering systems.", tag: "AI" },
        { title: "Infographics", desc: "Beautiful explanatory infographics ready for slides and social media." },
        { title: "Concept Trees", desc: "Hierarchical tree breakdowns of any topic, expandable on demand." },
        { title: "Interactive Canvas", desc: "Edit, rearrange, and export — your visuals stay editable forever." },
      ]}
    />
  ),
});
