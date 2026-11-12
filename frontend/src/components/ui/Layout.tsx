import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "./Button";

export function PageHeader({ title, actions }: { title: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold">{title}</h1>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, action, padded = true }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; padded?: boolean }) {
  return (
    <section className={clsx("card overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </div>
      )}
      <div className={clsx(padded && "p-4")}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, onClick }: { label: string; value: ReactNode; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={clsx("card w-full px-4 py-3 text-left", onClick && "focus-ring hover:border-slate-300 dark:hover:border-slate-600")}>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 truncate text-xl font-semibold tabular-nums">{value}</div>
    </Tag>
  );
}

export function Pagination({ page, totalPages, totalElements, onChange }: { page: number; totalPages: number; totalElements: number; onChange: (p: number) => void }) {
  if (totalElements === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
      <span>{totalElements} total · page {page + 1} of {Math.max(totalPages, 1)}</span>
      <div className="flex gap-1">
        <IconButton label="Previous page" disabled={page === 0} onClick={() => onChange(page - 1)}><ChevronLeft className="size-4" /></IconButton>
        <IconButton label="Next page" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}><ChevronRight className="size-4" /></IconButton>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[] }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx("focus-ring rounded px-3 py-1 text-sm whitespace-nowrap",
            value === o.value ? "bg-slate-100 font-medium text-slate-900 dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ email, size = "md" }: { email: string; size?: "sm" | "md" | "lg" }) {
  const parts = email.split("@")[0]!.split(/[._-]+/).filter(Boolean);
  const letters = ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
  return (
    <span className={clsx("inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-200",
      { sm: "size-6 text-[10px]", md: "size-8 text-xs", lg: "size-11 text-sm" }[size])}>
      {letters}
    </span>
  );
}

export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400"><tr>{head}</tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">{children}</tbody>
      </table>
    </div>
  );
}

export const th = "px-4 py-2.5 font-medium whitespace-nowrap";
export const td = "px-4 py-3 align-middle";
