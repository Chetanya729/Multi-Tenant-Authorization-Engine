import clsx from "clsx";
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const control =
  "w-full rounded-md border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800";

const border = (error?: string) => (error ? "border-red-400 dark:border-red-500" : "border-slate-300 dark:border-slate-600");

export function Field({ label, hint, error, children, action }: {
  label?: ReactNode; hint?: ReactNode; error?: string; children: (id: string) => ReactNode; action?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      {(label || action) && (
        <div className="flex items-center justify-between gap-2">
          {label && <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
          {action}
        </div>
      )}
      {children(id)}
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { error?: string; leading?: ReactNode; trailing?: ReactNode };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ error, leading, trailing, className, ...rest }, ref) {
  return (
    <div className="relative">
      {leading && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">{leading}</span>}
      <input ref={ref} className={clsx(control, "h-9", border(error), leading && "pl-9", trailing && "pr-10", className)} aria-invalid={!!error} {...rest} />
      {trailing && <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>}
    </div>
  );
});

export function Textarea({ error, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return <textarea className={clsx(control, "min-h-20 py-2", border(error), className)} aria-invalid={!!error} {...rest} />;
}

export function Select({ error, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return <select className={clsx(control, "h-9 pr-8", border(error), className)} aria-invalid={!!error} {...rest}>{children}</select>;
}

export function Checkbox({ checked, onChange, label, description, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; disabled?: boolean;
}) {
  return (
    <label className={clsx("flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5",
      checked ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40",
      disabled && "cursor-not-allowed opacity-60")}>
      <input type="checkbox" className="mt-0.5 size-4 accent-brand-600" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
      </span>
    </label>
  );
}

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx("focus-ring relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600")}
    >
      <span className={clsx("inline-block size-4 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-4.5" : "translate-x-0.5")} />
    </button>
  );
}
