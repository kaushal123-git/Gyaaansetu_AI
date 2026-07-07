import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createFileRoute("/dev-interview")({
  head: () => ({
    meta: [
      { title: "Dev Interview Bot — GyaanSetu AI" },
      { name: "description", content: "Practice technical interviews with the embedded GyaanSetu DevInterview bot." },
    ],
  }),
  component: DevInterviewRoute,
});

function DevInterviewRoute() {
  const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";
  const iframeSrc = isDev ? "http://localhost:5180/dev-interview-bot/" : "/dev-interview-bot/index.html";

  return (
    <AppLayout>
      <div className="flex-1 w-full bg-slate-950 rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden relative flex flex-col min-h-[calc(100vh-10rem)]">
        <iframe
          src={iframeSrc}
          className="w-full flex-1 border-none bg-slate-950 min-h-[calc(100vh-10rem)]"
          title="Dev Interview Bot"
          allow="camera; microphone; clipboard-read; clipboard-write; display-capture"
        />
      </div>
    </AppLayout>
  );
}
