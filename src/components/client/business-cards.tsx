"use client";

import Link from "next/link";
import { BusinessImage } from "@/components/ui/business-image";
import { Badge, Rating } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatMoney, formatRelativeDay, formatTime, localDate } from "@/lib/format";
import { BUSINESS_TYPE_LABEL } from "@/lib/labels";
import type { BusinessCard as Card, NextSlot } from "@/lib/types";
import { FavoriteButton } from "./favorite-button";

export function bookingHref(
  slug: string,
  opts: { serviceId?: string; professionalId?: string; startsAt?: string } = {},
) {
  const params = new URLSearchParams();
  if (opts.serviceId) params.set("service", opts.serviceId);
  if (opts.professionalId) params.set("professional", opts.professionalId);
  if (opts.startsAt) params.set("start", opts.startsAt);
  const q = params.toString();
  return `/${slug}/book${q ? `?${q}` : ""}`;
}

function badgeOf(b: Card): string | null {
  if (b.isAutonomous) return "Autônoma";
  if (b.isNew) return "Novo";
  return null;
}

/** Bolinha verde pulsando quando aberto; vermelha parada quando fora do horário ou na pausa. */
export function OpenStatus({
  open,
  feminine,
  className,
}: {
  open: boolean;
  /** Autônoma: "Aberta"/"Fechada". */
  feminine?: boolean;
  className?: string;
}) {
  const label = open ? (feminine ? "Aberta" : "Aberto") : feminine ? "Fechada" : "Fechado";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-bold",
        open ? "text-ok" : "text-danger",
        className,
      )}
    >
      <span className="relative flex size-2">
        {open ? (
          <span className="absolute inline-flex size-full rounded-full bg-ok opacity-60 motion-safe:animate-ping" />
        ) : null}
        <span className={cn("relative inline-flex size-2 rounded-full", open ? "bg-ok" : "bg-danger")} />
      </span>
      {label}
    </span>
  );
}

/** "Hoje" / "Amanhã" / "Qua, 29/10" — rótulo dos próximos horários. */
function slotsLabel(slots: NextSlot[]): string {
  if (!slots.length) return "Sem horários nos próximos dias";
  return formatRelativeDay(localDate(slots[0].startsAt));
}

export function SlotChips({ business, size = "sm" }: { business: Card; size?: "sm" | "md" }) {
  const slots = business.nextSlots;
  const sameDay = slots.filter((s) => localDate(s.startsAt) === localDate(slots[0]?.startsAt ?? new Date()));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-semibold text-muted">{slotsLabel(slots)}</span>
      {sameDay.map((s) => (
        <Link
          key={s.startsAt}
          href={bookingHref(business.slug, { serviceId: s.serviceId, startsAt: s.startsAt })}
          onClick={(e) => e.stopPropagation()}
          className={
            size === "sm"
              ? "inline-flex min-h-8 items-center rounded-lg border border-[#dde2e4] bg-surface px-2.5 text-xs font-bold hover:border-ink hover:bg-ink hover:text-white"
              : "inline-flex min-h-9 items-center rounded-lg border border-[#dde2e4] bg-surface px-2.5 text-[13px] font-bold hover:border-ink hover:bg-ink hover:text-white"
          }
          aria-label={`Agendar às ${formatTime(s.startsAt)}`}
        >
          {formatTime(s.startsAt)}
        </Link>
      ))}
    </div>
  );
}

function Meta({ b }: { b: Card }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
      <Rating value={b.ratingAvg} count={b.ratingCount} />
      <span className="inline-flex items-center gap-0.5 text-muted">
        <Icon name="location_on" size={15} />
        {b.distanceKm !== null ? `${b.distanceKm.toFixed(1).replace(".", ",")} km · ` : ""}
        {b.neighborhood}
      </span>
    </div>
  );
}

/** Card vertical da home ("Em destaque"). */
export function FeaturedCard({ business: b, priority }: { business: Card; priority?: boolean }) {
  const badge = badgeOf(b);
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-line bg-surface transition hover:-translate-y-0.5 hover:shadow-card">
      <div className="relative h-40">
        <BusinessImage src={b.coverUrl} seed={b.name} alt="" className="absolute inset-0" priority={priority} />
        {badge ? (
          <Badge tone="ink" size="sm" className="absolute top-3 left-3 rounded-md">
            {badge}
          </Badge>
        ) : null}
        <FavoriteButton businessId={b.id} className="absolute top-2.5 right-2.5 z-10" />
      </div>
      <div className="flex flex-col gap-1.5 px-4 pt-3.5 pb-4">
        <h3 className="m-0 text-base font-bold">
          <Link href={`/${b.slug}`} className="after:absolute after:inset-0">
            {b.name}
          </Link>
        </h3>
        <div className="flex items-center justify-between gap-2 text-[13px] text-muted">
          {BUSINESS_TYPE_LABEL[b.type]}
          <OpenStatus open={b.openNow} feminine={b.isAutonomous} />
        </div>
        <Meta b={b} />
        <div className="relative z-10 mt-1.5">
          <SlotChips business={b} />
        </div>
      </div>
    </article>
  );
}

/** Linha compacta (home no mobile). */
export function CompactCard({ business: b }: { business: Card }) {
  return (
    <article className="relative flex items-center gap-3 rounded-2xl border border-soft bg-surface p-2.5">
      <BusinessImage src={b.coverUrl} seed={b.name} alt="" className="size-[76px] shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="m-0 truncate text-sm font-bold">
          <Link href={`/${b.slug}`} className="after:absolute after:inset-0">
            {b.name}
          </Link>
        </h3>
        <span className="text-xs text-muted">
          {BUSINESS_TYPE_LABEL[b.type]} · {b.neighborhood}
        </span>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
          <Rating value={b.ratingAvg} count={b.ratingCount} className="text-xs" />
          <OpenStatus open={b.openNow} feminine={b.isAutonomous} />
        </div>
      </div>
      <Link
        href={bookingHref(b.slug)}
        className="relative z-10 inline-flex min-h-10 shrink-0 items-center rounded-[9px] bg-ink px-3 text-xs font-bold text-white"
      >
        Agendar
      </Link>
    </article>
  );
}

/** Resultado horizontal de Explorar. */
export function ResultCard({ business: b }: { business: Card }) {
  const badge = badgeOf(b);
  return (
    <article className="relative flex flex-col gap-4 rounded-2xl border border-line bg-surface p-3.5 transition hover:shadow-[0_10px_28px_rgba(20,36,43,.08)] sm:flex-row">
      <div className="relative h-40 shrink-0 sm:h-[140px] sm:w-[190px]">
        <BusinessImage src={b.coverUrl} seed={b.name} alt="" className="absolute inset-0 rounded-xl" />
        {badge ? (
          <Badge tone="ink" size="sm" className="absolute top-2.5 left-2.5 rounded-md">
            {badge}
          </Badge>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex justify-between gap-2">
          <h3 className="m-0 text-[17px] font-bold">
            <Link href={`/${b.slug}`} className="after:absolute after:inset-0">
              {b.name}
            </Link>
          </h3>
          <FavoriteButton businessId={b.id} variant="plain" className="relative z-10 -mt-2 -mr-2" />
        </div>
        <div className="flex items-center gap-2.5 text-[13px] text-muted">
          {BUSINESS_TYPE_LABEL[b.type]}
          <OpenStatus open={b.openNow} feminine={b.isAutonomous} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Meta b={b} />
          {b.minPriceCents !== null ? (
            <span className="text-[13px] text-muted">a partir de {formatMoney(b.minPriceCents)}</span>
          ) : null}
        </div>
        <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-2">
          <SlotChips business={b} size="md" />
          <div className="flex-1" />
          <Link
            href={bookingHref(b.slug)}
            className="inline-flex min-h-10 items-center rounded-[9px] bg-ink px-3.5 text-[13px] font-bold text-white"
          >
            Ver horários
          </Link>
        </div>
      </div>
    </article>
  );
}
