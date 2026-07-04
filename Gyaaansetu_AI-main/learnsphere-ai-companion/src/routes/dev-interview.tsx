import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

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
  useEffect(() => {
    window.location.replace("/dev-interview-bot/index.html");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-5 text-center shadow-2xl">
        <div className="text-sm font-bold">Opening Dev Interview Bot...</div>
        <div className="mt-2 text-xs text-slate-400">Taking you directly to your interview workspace.</div>
      </div>
    </div>
  );
}
