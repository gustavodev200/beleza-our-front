"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { bookingHref } from "@/components/client/business-cards";
import { ReviewModal } from "@/components/client/review-modal";
import { BusinessImage } from "@/components/ui/business-image";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge, Segmented, Stars } from "@/components/ui/controls";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { formatMoney, formatWhen } from "@/lib/format";
import { STATUS_BADGE } from "@/lib/labels";
import { mapsLink } from "@/lib/maps";
import { RequireRole } from "@/lib/session";
import type { ClientAppointment, Page } from "@/lib/types";

type Scope = "upcoming" | "history";
const PAGE_SIZE = 20;

function AppointmentCard({
  a,
  scope,
  onRate,
}: {
  a: ClientAppointment;
  scope: Scope;
  onRate: (a: ClientAppointment) => void;
}) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const badge = STATUS_BADGE[a.status];
  const cancel = useMutation({
    mutationFn: () => api(`/me/appointments/${a.id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      toast("Agendamento cancelado — o estabelecimento foi avisado");
      void qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e) => {
      setConfirming(false);
      toast.error(errorMessage(e));
    },
  });
  const active = scope === "upcoming" && (a.status === "CONFIRMED" || a.status === "PENDING");

  return (
    <article className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start gap-3.5">
        <BusinessImage src={null} seed={a.business.name} alt="" className="size-[72px] shrink-0 rounded-xl" />
        <div className="flex min-w-[180px] flex-1 flex-col gap-0.5">
          <h2 className="m-0 text-base font-bold tracking-normal">{a.serviceName}</h2>
          <div className="text-[13px] text-muted">
            {a.business.name} · com {a.professional.name}
          </div>
          <div className="mt-1 text-sm font-semibold">{formatWhen(a.startsAt)}</div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={badge.tone}>{badge.label}</Badge>
          <b className="text-sm">{formatMoney(a.priceCents)}</b>
        </div>
      </div>

      {active && !confirming ? (
        <div className="flex flex-wrap gap-2">
          <Link href={`/${a.business.slug}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Ver estabelecimento
          </Link>
          <a
            href={mapsLink(a.business)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Como chegar
          </a>
          <Link href={`/appointments/${a.id}/reschedule`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Remarcar
          </Link>
          <Button variant="danger-outline" size="sm" onClick={() => setConfirming(true)}>
            Cancelar
          </Button>
        </div>
      ) : null}

      {confirming ? (
        <div role="alert" className="flex flex-wrap items-center gap-2.5 rounded-xl bg-danger-bg px-3.5 py-3">
          <span className="min-w-[180px] flex-1 text-sm font-semibold text-[#7a1a12]">
            Cancelar este horário? O estabelecimento será avisado.
          </span>
          <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={cancel.isPending}>
            Manter
          </Button>
          <Button variant="danger" size="sm" onClick={() => cancel.mutate()} loading={cancel.isPending}>
            Sim, cancelar
          </Button>
        </div>
      ) : null}

      {scope === "history" ? (
        <div className="flex flex-wrap items-center gap-2">
          {a.status === "COMPLETED" && !a.review ? (
            <Button variant="outline-ink" size="sm" onClick={() => onRate(a)}>
              Avaliar atendimento
            </Button>
          ) : null}
          {a.review ? (
            <span className="text-[13px] text-muted">
              Você avaliou <Stars value={a.review.rating} />
            </span>
          ) : null}
          <Link
            href={bookingHref(a.business.slug, { serviceId: a.serviceId })}
            className={buttonVariants({ size: "sm" })}
          >
            Agendar novamente
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function AppointmentsList() {
  const [scope, setScope] = useState<Scope>("upcoming");
  const [rating, setRating] = useState<ClientAppointment | null>(null);
  const q = useInfiniteQuery({
    queryKey: ["appointments", "mine", scope],
    queryFn: ({ pageParam }) =>
      api<Page<ClientAppointment>>("/me/appointments", { query: { scope, page: pageParam, pageSize: PAGE_SIZE } }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <Segmented
        className="mt-4"
        value={scope}
        onChange={setScope}
        options={[
          { value: "upcoming", label: "Próximos" },
          { value: "history", label: "Histórico" },
        ]}
      />
      <div className="mt-4 flex flex-col gap-3" aria-live="polite">
        {q.isPending ? (
          <ListSkeleton rows={2} />
        ) : q.isError ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : items.length ? (
          <>
            {items.map((a) => (
              <AppointmentCard key={a.id} a={a} scope={scope} onRate={setRating} />
            ))}
            {q.hasNextPage ? (
              <Button
                variant="outline"
                onClick={() => q.fetchNextPage()}
                loading={q.isFetchingNextPage}
                className="self-center"
              >
                Carregar mais
              </Button>
            ) : null}
          </>
        ) : (
          <EmptyState
            icon="event_busy"
            title={scope === "upcoming" ? "Nenhum horário marcado" : "Nada por aqui ainda"}
            action={
              <Link href="/explore" className={buttonVariants({ size: "sm" })}>
                Encontrar um horário
              </Link>
            }
          />
        )}
      </div>
      <ReviewModal appointment={rating} onClose={() => setRating(null)} />
    </>
  );
}

export default function AppointmentsPage() {
  return (
    <div className="mx-auto max-w-[880px] px-4 pt-5 sm:px-6 md:pt-7">
      <h1 className="m-0 text-[30px] font-bold md:text-[40px]">Meus agendamentos</h1>
      <RequireRole role="CLIENT">
        <AppointmentsList />
      </RequireRole>
    </div>
  );
}
