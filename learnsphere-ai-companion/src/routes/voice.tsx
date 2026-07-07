import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/ui-kit/FeaturePage";
import { Mic } from "lucide-react";

export const Route = createFileRoute("/voice")({
  head: () => ({ meta: [{ title: "Voice Notes — LearnSphere AI" }] }),
  component: () => (
    <FeaturePage
      icon={Mic}
      title="Voice Notes Studio"
      subtitle="Record lectures, get AI summaries, translations, and instant key-point extraction."
      cta="Start Recording"
      accent="from-[#FF00AA] to-[#00F5FF]"
      stats={[
        { label: "Recordings", value: "57" },
        { label: "Hours Saved", value: "23h" },
        { label: "Languages", value: "10+" },
        { label: "Words Transcribed", value: "184k" },
      ]}
      items={[
        { title: "Lecture Recording", desc: "High-quality recording with auto-noise reduction and speaker separation." },
        { title: "Speech to Text", desc: "Real-time transcription in 10+ Indian and global languages.", tag: "Live" },
        { title: "AI Summaries", desc: "Concise, structured notes from a 1-hour lecture in under 10 seconds." },
        { title: "Translation", desc: "Translate any recording or summary to your preferred language instantly." },
        { title: "Key Points", desc: "Extract definitions, formulas, and exam-relevant highlights automatically." },
        { title: "Waveform Player", desc: "Beautiful waveform UI with chapter markers and click-to-jump navigation." },
      ]}
    />
  ),
});
