import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/ui-kit/FeaturePage";
import { Swords } from "lucide-react";

export const Route = createFileRoute("/wars")({
  head: () => ({ meta: [{ title: "Study Wars — LearnSphere AI" }] }),
  component: () => (
    <FeaturePage
      icon={Swords}
      title="Study Wars"
      subtitle="Esports-style learning arena — battle AI, challenge friends, and climb the global ranks."
      cta="Find a Match"
      accent="from-[#FF00AA] to-[#8B5CF6]"
      stats={[
        { label: "Battles Won", value: "127" },
        { label: "Win Rate", value: "73%" },
        { label: "Current Streak", value: "8 W" },
        { label: "Season Rank", value: "Diamond II" },
      ]}
      items={[
        { title: "Ranked Battles", desc: "1v1 timed quiz duels with ELO ranking and seasonal rewards.", tag: "Live" },
        { title: "AI Boss Battles", desc: "Fight ever-evolving AI bosses themed by subject — beat them to unlock loot." },
        { title: "Friend Challenges", desc: "Send a 5-question gauntlet to any friend and watch the replay." },
        { title: "Global Leaderboard", desc: "Real-time top 1000 across the world with country and college filters." },
        { title: "XP & Loot", desc: "Earn XP, glow-skins, sound packs, and limited-edition seasonal badges." },
        { title: "Tournaments", desc: "Weekly bracket tournaments with cash and scholarship prize pools." },
      ]}
    />
  ),
});
