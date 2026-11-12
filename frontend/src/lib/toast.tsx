import clsx from "clsx";
import { X } from "lucide-react";
import { useSyncExternalStore } from "react";

// A small toast system. It renders with the app's own stylesheet, so it works under a strict
// Content-Security-Policy (style-src 'self') that blocks libraries injecting <style> tags at runtime.

type Kind = "success" | "error" | "warning";
interface Item { id: number; kind: Kind; message: string }

let items: Item[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function push(kind: Kind, message: string) {
  const id = nextId++;
  items = [...items.slice(-3), { id, kind, message }];
  emit();
  window.setTimeout(() => dismiss(id), kind === "error" ? 6000 : 4000);
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  warning: (message: string) => push("warning", message),
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const bar: Record<Kind, string> = { success: "bg-emerald-500", error: "bg-red-500", warning: "bg-amber-500" };

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items);
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {list.map((t) => (
        <div key={t.id} role={t.kind === "error" ? "alert" : "status"}
          className="animate-fade-in pointer-events-auto flex items-start gap-3 overflow-hidden rounded-md border border-slate-200 bg-white py-2.5 pr-2 pl-0 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <span className={clsx("w-1 self-stretch", bar[t.kind])} />
          <span className="flex-1 py-0.5">{t.message}</span>
          <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
