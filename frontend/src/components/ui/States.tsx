import clsx from "clsx";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { ApiError } from "../../api/client";
import { Button } from "./Button";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx("size-5 animate-spin text-slate-400", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded bg-slate-200 dark:bg-slate-700", className)} />;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-8" />)}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const forbidden = error instanceof ApiError && error.status === 403;
  return (
    <EmptyState
      title={forbidden ? "You don't have access to this." : "Could not load data."}
      description={!forbidden && error instanceof Error ? error.message : undefined}
      action={onRetry && !forbidden ? <Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button> : undefined}
    />
  );
}
