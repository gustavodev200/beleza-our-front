"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { bookingHref } from "@/components/client/business-cards";
import { FavoriteButton } from "@/components/client/favorite-button";
import { BusinessImage } from "@/components/ui/business-image";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, Card, Rating, Stars, UnderlineTabs } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { ErrorState, ListSkeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { stripes } from "@/lib/colors";
import {
  WEEKDAY_SHORT,
  firstName,
  formatAgo,
  formatDuration,
  formatMoney,
  formatPhone,
  formatRelativeDay,
  formatTime,
  localDate,
  minutesToHHMM,
  whatsappLink,
} from "@/lib/format";
import { BUSINESS_TYPE_LABEL, REVIEW_TAGS } from "@/lib/labels";
import { mapsLink } from "@/lib/maps";
import type { BusinessProfile, Page, PublicHours, Review } from "@/lib/types";

type Tab = "servicos" | "profissionais" | "avaliacoes" | "sobre";

function hoursLines(hours: PublicHours[]): string[] {
  const byDay = new Map(hours.map((h) => [h.weekday, h]));
  return [1, 2, 3, 4, 5, 6, 0].map((wd) => {
    const h = byDay.get(wd);
    if (!h) return `${WEEKDAY_SHORT[wd]} · Fechado`;
    const brk =
      h.breakStart !== null && h.breakEnd !== null
        ? ` (pausa ${minutesToHHMM(h.breakStart)}–${minutesToHHMM(h.breakEnd)})`
        : "";
    return `${WEEKDAY_SHORT[wd]} · ${minutesToHHMM(h.opensAt)}–${minutesToHHMM(h.closesAt)}${brk}`;
  });
}

function closesTodayAt(hours: PublicHours[]): string | null {
  const wd = new Date(`${localDate()}T12:00:00Z`).getUTCDay();
  const h = hours.find((x) => x.weekday === wd);
  return h ? minutesToHHMM(h.closesAt) : null;
}

function ReviewItem({ r }: { r: Review }) {
  const tags = REVIEW_TAGS.filter((t) => r.tags.includes(t.id)).map((t) => t.label);
  return (
    <Card className="flex flex-col gap-1.5 rounded-[14px] p-4">
      <div className="flex justify-between text-sm">
        <b>{r.clientName}</b>
        <span className="text-[13px] text-subtle">{formatAgo(r.createdAt)}</span>
      </div>
      <Stars value={r.rating} className="text-[13px]" />
      {tags.length ? <div className="text-xs text-muted">{tags.join(" · ")}</div> : null}
      {r.comment ? <p className="m-0 text-sm leading-relaxed text-ink-2">{r.comment}</p> : null}
    </Card>
  );
}

function AllReviews({ slug, initial }: { slug: string; initial: Review[] }) {
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ["reviews", slug, page],
    queryFn: () => api<Page<Review>>(`/businesses/${slug}/reviews`, { query: { page, pageSize: 10 } }),
    enabled: page > 0,
  });
  if (page === 0) {
    return (
      <>
        {initial.map((r) => (
          <ReviewItem key={r.id} r={r} />
        ))}
        {initial.length >= 5 ? (
          <button
            type="button"
            onClick={() => setPage(1)}
            className={buttonVariants({ variant: "outline", size: "sm", className: "self-start" })}
          >
            Ver todas as avaliações
          </button>
        ) : null}
      </>
    );
  }
  if (query.isPending) return <ListSkeleton rows={3} />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  const totalPages = Math.ceil(query.data.total / 10);
  return (
    <>
      {query.data.items.map((r) => (
        <ReviewItem key={r.id} r={r} />
      ))}
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            ← Anteriores
          </button>
        ) : null}
        {page < totalPages ? (
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Mais avaliações →
          </button>
        ) : null}
      </div>
    </>
  );
}

export function ProfileView({ profile: b }: { profile: BusinessProfile }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("servicos");
  const minPrice = b.services.length ? Math.min(...b.services.map((s) => s.priceCents)) : null;
  const closeAt = closesTodayAt(b.hours);
  const openLabel = b.closedToday
    ? "Fechado hoje"
    : b.openNow
      ? `Aberto agora${closeAt ? ` · até ${closeAt}` : ""}`
      : "Fechado agora";
  const next = b.nextSlot;
  const nextLabel = next
    ? `${formatRelativeDay(localDate(next.startsAt))}, ${formatTime(next.startsAt)}`
    : "Sem horários nos próximos dias";

  const share = async () => {
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share) {
        await navigator.share({ title: b.name, text: `Agende no ${b.name} pelo belezaOur`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast("Link copiado");
    } catch {
      /* usuário cancelou o compartilhamento */
    }
  };

  const actionClass =
    "inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border border-line-strong bg-surface px-3.5 text-[13px] font-semibold hover:border-ink";

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-4 pb-28 sm:px-6 md:pt-5 md:pb-0">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-ink-2"
      >
        <Icon name="arrow_back" size={18} />
        Voltar
      </button>

      <BusinessImage
        src={b.coverUrl}
        seed={b.name}
        alt={`Capa de ${b.name}`}
        className="mt-2 h-[180px] rounded-[22px] sm:h-[300px]"
        priority
      />

      <div className="flex flex-wrap items-end justify-between gap-5 px-1 sm:px-2">
        <div className="flex items-end gap-4">
          <div className="relative -mt-12 size-[88px] shrink-0 overflow-hidden rounded-[22px] border-4 border-white bg-white shadow-[0_8px_24px_rgba(20,36,43,.12)] sm:-mt-14 sm:size-[104px] sm:rounded-[26px]">
            <BusinessImage
              src={b.logoUrl}
              seed={b.name}
              alt={`Logo de ${b.name}`}
              kind="logo"
              className="absolute inset-0"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1 pt-2">
            <div className="flex items-center gap-1.5">
              <h1 className="m-0 text-[26px] leading-tight font-bold sm:text-[42px]">{b.name}</h1>
              <Icon name="verified" fill size={22} className="text-primary" label="Perfil verificado" />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-2">
              <span>{BUSINESS_TYPE_LABEL[b.type]}</span>
              <Rating value={b.ratingAvg} count={b.ratingCount} className="text-sm" />
              <span>{b.neighborhood}</span>
              <span className={b.openNow ? "font-semibold text-ok" : "font-semibold text-muted"}>{openLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <FavoriteButton businessId={b.id} variant="labeled" />
          <button type="button" onClick={share} className={actionClass}>
            <Icon name="share" size={18} />
            Compartilhar
          </button>
          <a href={mapsLink(b)} target="_blank" rel="noopener noreferrer" className={actionClass}>
            <Icon name="map" size={18} />
            Mapa
          </a>
          <a
            href={whatsappLink(b.whatsapp, `Olá! Vi o ${b.name} no belezaOur.`)}
            target="_blank"
            rel="noopener noreferrer"
            className={actionClass}
          >
            <Icon name="chat" size={18} />
            WhatsApp
          </a>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-8">
        <div className="min-w-0 flex-[999_1_540px]">
          <UnderlineTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: "servicos", label: "Serviços" },
              { value: "profissionais", label: "Profissionais" },
              { value: "avaliacoes", label: `Avaliações${b.ratingCount ? ` (${b.ratingCount})` : ""}` },
              { value: "sobre", label: "Sobre" },
            ]}
          />

          {tab === "servicos" ? (
            b.services.length ? (
              <Card className="mt-4 overflow-hidden">
                {b.services.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-4 border-b border-line-soft px-4 py-4 last:border-0 sm:px-[18px]"
                  >
                    <div
                      className="hidden size-12 shrink-0 rounded-[10px] sm:block"
                      style={{ background: stripes(b.name) }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold">{s.name}</div>
                      <div className="mt-0.5 text-[13px] text-muted">
                        {formatDuration(s.durationMinutes)} · {formatMoney(s.priceCents)}
                      </div>
                    </div>
                    <Link
                      href={bookingHref(b.slug, { serviceId: s.id })}
                      className={buttonVariants({ variant: "ink", size: "sm" })}
                    >
                      Agendar
                    </Link>
                  </div>
                ))}
              </Card>
            ) : (
              <p className="mt-4 text-sm text-muted">Nenhum serviço disponível no momento.</p>
            )
          ) : null}

          {tab === "profissionais" ? (
            <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
              {b.professionals.map((p) => (
                <Card key={p.id} className="flex flex-col items-start gap-2.5 p-[18px]">
                  <Avatar name={p.name} size={52} />
                  <div>
                    <div className="font-bold">{p.name}</div>
                    {p.role ? <div className="text-[13px] text-muted">{p.role}</div> : null}
                  </div>
                  <Link
                    href={bookingHref(b.slug, { professionalId: p.id })}
                    className={buttonVariants({ variant: "outline-ink", size: "sm" })}
                  >
                    Agendar com {firstName(p.name)}
                  </Link>
                </Card>
              ))}
            </div>
          ) : null}

          {tab === "avaliacoes" ? (
            <div className="mt-4 flex flex-col gap-3">
              {b.ratingCount ? (
                <>
                  <div className="flex items-center gap-3.5">
                    <span className="text-[40px] font-extrabold tracking-[-0.03em]">
                      {b.ratingAvg.toFixed(1).replace(".", ",")}
                    </span>
                    <div>
                      <Stars value={Math.round(b.ratingAvg)} />
                      <div className="text-[13px] text-muted">{b.ratingCount} avaliações</div>
                    </div>
                  </div>
                  <AllReviews slug={b.slug} initial={b.latestReviews} />
                </>
              ) : (
                <p className="text-sm text-muted">
                  Ainda sem avaliações. Seja a primeira a avaliar depois do atendimento!
                </p>
              )}
            </div>
          ) : null}

          {tab === "sobre" ? (
            <Card className="mt-4 flex flex-col gap-3.5 p-5 text-sm leading-relaxed">
              {b.description ? <p className="m-0 whitespace-pre-line text-ink-2">{b.description}</p> : null}
              <div className="flex gap-2.5">
                <Icon name="storefront" size={20} />
                {BUSINESS_TYPE_LABEL[b.type]}
              </div>
              <div className="flex gap-2.5">
                <Icon name="schedule" size={20} />
                <ul className="m-0 list-none p-0">
                  {hoursLines(b.hours).map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2.5">
                <Icon name="location_on" size={20} />
                {[b.address, b.neighborhood, `${b.city.name} - ${b.city.state}`].filter(Boolean).join(" · ")}
              </div>
              <div className="flex gap-2.5">
                <Icon name="call" size={20} />
                {formatPhone(b.phone ?? b.whatsapp)}
              </div>
            </Card>
          ) : null}
        </div>

        <aside className="hidden flex-[1_1_300px] flex-col gap-3.5 rounded-[18px] border border-line bg-surface p-[22px] md:sticky md:top-24 md:flex">
          <div className="text-lg font-extrabold">Agende em poucos cliques</div>
          <div className="text-sm leading-normal text-muted">
            Horários reais, sem precisar mandar mensagem. Você recebe a confirmação no WhatsApp.
          </div>
          <div className="flex justify-between border-y border-line-soft py-3 text-sm">
            <span className="text-muted">Próximo horário</span>
            <b>{nextLabel}</b>
          </div>
          {minPrice !== null ? (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Preços</span>
              <b>a partir de {formatMoney(minPrice)}</b>
            </div>
          ) : null}
          <Link
            href={bookingHref(b.slug, next ? { serviceId: next.serviceId, startsAt: next.startsAt } : {})}
            className={buttonVariants({ variant: "ink", size: "lg" })}
          >
            Agendar agora
          </Link>
          {b.address ? (
            <div className="flex gap-2 text-[13px] text-muted">
              <Icon name="location_on" size={18} />
              {b.address}
            </div>
          ) : null}
        </aside>
      </div>

      {/* CTA fixo no mobile, acima da barra de abas */}
      <div className="fixed inset-x-0 bottom-[68px] z-30 flex items-center gap-3 border-t border-line bg-white px-4 py-3 md:hidden">
        <div className="min-w-0 flex-1 text-xs">
          <div className="text-muted">Próximo horário</div>
          <div className="truncate text-sm font-bold">{nextLabel}</div>
        </div>
        <Link
          href={bookingHref(b.slug, next ? { serviceId: next.serviceId, startsAt: next.startsAt } : {})}
          className={buttonVariants({ variant: "ink" })}
        >
          Agendar agora
        </Link>
      </div>
    </div>
  );
}
