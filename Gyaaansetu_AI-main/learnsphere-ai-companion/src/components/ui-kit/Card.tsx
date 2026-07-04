import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function GlassCard({ className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  const hasBgOverride = className && (className.includes("bg-") || className.includes("bg-["));
  return (
    <div
      {...rest}
      className={cn(
        hasBgOverride ? "" : "glass",
        "rounded-2xl p-5 transition-all hover:shadow-md hover:shadow-slate-200/50",
        className
      )}
    >
      {children}
    </div>
  );
}

export function GradientCard({ className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  const hasBgOverride = className && (className.includes("bg-") || className.includes("bg-["));
  return (
    <div {...rest} className={cn(hasBgOverride ? "" : "gradient-border", "rounded-2xl p-5", className)}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, icon: Icon, accent }: { title: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }>; accent?: string }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/60 shadow-sm overflow-hidden p-0.5", accent)}>
        <img
          src="/Gyaansetu AI logo.png"
          alt="GyaanSetu AI"
          className="h-full w-full object-contain"
        />
      </div>
      <div className="min-w-0">
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-slate-800 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
