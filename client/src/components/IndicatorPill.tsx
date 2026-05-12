import React from "react";

type IndicatorTone = "default" | "normal" | "watching" | "triggered";

const TONE_CLASSES: Record<IndicatorTone, string> = {
  triggered: "bg-amber-50 text-amber-700 border-amber-200",
  watching: "bg-slate-50 text-slate-700 border-slate-200",
  normal: "bg-emerald-50 text-emerald-700 border-emerald-200",
  default: "bg-muted text-foreground border-border",
};

export function indicatorStatusClass(status: string | null | undefined): string {
  if (status === "triggered") return "text-destructive font-medium";
  if (status === "watching") return "text-yellow-600 dark:text-yellow-400 font-medium";
  return "text-muted-foreground";
}

export function IndicatorPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: IndicatorTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
