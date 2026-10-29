import { cva } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { personColors } from "@/lib/colors";
import { initials } from "@/lib/format";
import { Icon } from "./icon";

/** Pílula selecionável (filtros, horários, dias nos modais). */
export function Chip({
  selected,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        selected ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink hover:border-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Interruptor acessível (role=switch). */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  className,
  showLabel = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={showLabel ? undefined : label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("inline-flex min-h-9 items-center gap-2 text-xs font-semibold disabled:opacity-50", className)}
    >
      <span
        className={cn(
          "relative h-5 w-[34px] shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-[#d3dadd]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-[left]",
            checked ? "left-4" : "left-0.5",
          )}
        />
      </span>
      {showLabel ? label : null}
    </button>
  );
}

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap", {
  variants: {
    tone: {
      ok: "bg-ok-bg text-ok",
      warn: "bg-warn-bg text-warn",
      danger: "bg-danger-bg text-danger",
      done: "bg-done-bg text-done",
      ink: "bg-ink text-white",
      accent: "bg-accent text-white",
      neutral: "bg-soft text-ink-2",
    },
    size: { sm: "px-2 py-0.5 text-[11px]", md: "" },
  },
  defaultVariants: { tone: "neutral", size: "md" },
});

export function Badge({
  tone,
  size,
  className,
  children,
}: {
  tone?: "ok" | "warn" | "danger" | "done" | "ink" | "accent" | "neutral";
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={cn(badgeVariants({ tone, size }), className)}>{children}</span>;
}

export function Avatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  const c = personColors(name);
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-full font-extrabold", className)}
      style={{ width: size, height: size, background: c.bg, color: c.fg, fontSize: Math.max(11, size * 0.32) }}
    >
      {initials(name)}
    </span>
  );
}

export function Rating({ value, count, className }: { value: number; count?: number; className?: string }) {
  if (!count) {
    return <span className={cn("text-[13px] font-semibold text-muted", className)}>Novo</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-[13px] text-ink-2", className)}>
      <Icon name="star" fill size={16} className="text-star" />
      <b>{value.toFixed(1).replace(".", ",")}</b>
      <span className="text-muted">({count})</span>
    </span>
  );
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("tracking-[2px] text-star", className)} aria-label={`${value} de 5 estrelas`}>
      {"★".repeat(value)}
      <span className="text-line-strong">{"★".repeat(5 - value)}</span>
    </span>
  );
}

/** Abas em segmento (fundo cinza, item ativo branco). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  stretch,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
  stretch?: boolean;
}) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex gap-1 rounded-[10px] bg-soft p-1", stretch && "grid w-full grid-flow-col", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-9 rounded-[7px] px-4 text-sm font-bold transition-colors",
              active ? "bg-surface text-ink shadow-[0_1px_3px_rgba(20,36,43,.12)]" : "text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Abas sublinhadas (perfil do estabelecimento). */
export function UnderlineTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="tablist" className="scrollbar-none flex gap-1 overflow-x-auto border-b border-line">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "-mb-px min-h-11 border-b-2 px-3.5 text-sm whitespace-nowrap",
              active ? "border-ink font-bold text-ink" : "border-transparent font-medium text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-line bg-surface", className)} {...props} />;
}

export function PageTitle({
  children,
  sub,
  className,
  actions,
}: {
  children: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="m-0 text-[28px] leading-tight font-bold sm:text-4xl">{children}</h1>
        {sub ? <div className="mt-1 text-sm text-muted">{sub}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
