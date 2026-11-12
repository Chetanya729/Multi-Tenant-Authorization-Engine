import clsx from "clsx";
import type { ReactNode } from "react";

export type Tone = "slate" | "brand" | "green" | "amber" | "red";

const tones: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  red: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export function Badge({ tone = "slate", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={clsx("inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>{children}</span>;
}

export function PermissionChip({ code, muted }: { code: string; muted?: boolean }) {
  return (
    <span className={clsx("inline-flex rounded border px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap",
      muted ? "border-slate-200 text-slate-400 line-through dark:border-slate-700 dark:text-slate-500" : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200")}>
      {code}
    </span>
  );
}
