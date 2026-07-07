import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/ui-kit/FeaturePage";
import { Calendar } from "lucide-react";

export const Route = createFileRoute("/timetable")({
  head: () => ({ meta: [{ title: "Smart Timetable — LearnSphere AI" }] }),
  component: () => (
    <FeaturePage
      icon={Calendar}
      title="Smart Timetable"
      subtitle="AI study planner that builds your daily, weekly, and exam schedules around your goals and energy."
      cta="Generate This Week"
      stats={[
        { label: "Sessions Planned", value: "18" },
        { label: "Hours / Week", value: "32h" },
        { label: "Adherence", value: "91%" },
        { label: "Goals On-Track", value: "5/6" },
      ]}
      items={[
        { title: "Daily Schedule", desc: "Time-boxed daily plan that learns from your actual completion patterns." },
        { title: "Weekly Planner", desc: "Drag-and-drop weekly calendar with subject and intensity color coding." },
        { title: "Exam Planner", desc: "Backward-planned study blocks from exam date with auto-revision cycles.", tag: "AI" },
        { title: "Smart Notifications", desc: "Quiet, context-aware reminders — never during your deep-work hours." },
        { title: "Goal Tracking", desc: "Visual goal progress with weekly review and AI-suggested course-corrections." },
        { title: "Calendar Sync", desc: "Two-way sync with Google, Apple, and Outlook calendars." },
      ]}
    />
  ),
});
