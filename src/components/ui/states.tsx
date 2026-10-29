import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-[#d3dadd] bg-surface px-6 py-11 text-center",
        className,
      )}
    >
      <Icon name={icon} size={36} className="text-subtle" />
      <div className="font-bold">{title}</div>
      {description ? <div className="text-sm text-muted">{description}</div> : null}
      {action ? <div className="mt-1.5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message = "Não foi possível carregar.",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-2.5 rounded-2xl border border-danger-line bg-danger-bg/40 px-6 py-9 text-center",
        className,
      )}
    >
      <Icon name="cloud_off" size={32} className="text-danger" />
      <div className="font-semibold text-ink">{message}</div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 min-h-10 rounded-[10px] border border-ink bg-surface px-4 text-sm font-bold"
        >
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-soft", className)} />;
}

export function ListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)} aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("grid place-items-center py-16", className)} aria-busy="true" aria-label="Carregando">
      <Icon name="progress_activity" size={28} className="animate-spin text-muted" />
    </div>
  );
}

export function Notice({
  tone = "warn",
  children,
  className,
}: {
  tone?: "warn" | "danger" | "ok" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-[10px] px-3 py-2.5 text-[13px] leading-relaxed",
        tone === "warn" && "bg-warn-bg text-warn",
        tone === "danger" && "bg-danger-bg text-danger",
        tone === "ok" && "bg-ok-bg text-ok",
        tone === "info" && "bg-primary-soft text-primary-strong",
        className,
      )}
    >
      {children}
    </div>
  );
}
