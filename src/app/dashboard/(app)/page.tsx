"use client";

import Link from "next/link";
import { useState } from "react";
import { AppointmentDrawer, useOwnerAction } from "@/components/owner/appointment-drawer";
import { useOverview, usePanel } from "@/components/owner/panel-shell";
import { Button } from "@/components/ui/button";
import { Badge, PageTitle } from "@/components/ui/controls";
import { ErrorState, ListSkeleton } from "@/components/ui/states";
import { errorMessage } from "@/lib/api";
import { personColors } from "@/lib/colors";
import { formatLongDate, formatMoney, formatTime, formatWhen } from "@/lib/format";
import { STATUS_BADGE } from "@/lib/labels";
import { useOwnerBusiness } from "@/lib/owner-queries";
import { useMe } from "@/lib/session";
import type { OwnerAppointment } from "@/lib/types";

function greeting(): string {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" }).format(
      new Date(),
    ),
  );
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-[18px]">
      <div className="text-[13px] text-muted">{label}</div>
      <div className={`mt-1.5 text-[30px] font-extrabold tracking-[-0.02em] ${tone === "warn" ? "text-warn" : ""}`}>
        {value}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { data: me } = useMe();
  const business = useOwnerBusiness();
  const { openNew, openBlock } = usePanel();
  const q = useOverview();
  const act = useOwnerAction();
  const [selected, setSelected] = useState<string | null>(null);

  const confirm = (e: React.MouseEvent, a: OwnerAppointment) => {
    e.stopPropagation();
    act.mutate({ id: a.id, action: "confirm" });
  };

  return (
    <>
      <PageTitle sub={`${q.data ? formatLongDate(q.data.date) : ""} · ${business.data?.name ?? ""}`}>
        {greeting()}, {me?.name.split(" ")[0]}
      </PageTitle>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <Button variant="primary" size="sm" icon="add" onClick={() => openNew()}>
          Novo agendamento
        </Button>
        <Button variant="outline" size="sm" icon="block" onClick={() => openBlock()}>
          Bloquear horário
        </Button>
      </div>

      {q.isPending ? (
        <ListSkeleton rows={3} className="mt-5" />
      ) : q.isError ? (
        <ErrorState className="mt-5" message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <>
          <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
            <Stat label="Agendamentos hoje" value={String(q.data.appointmentsToday)} />
            <Stat label="Receita prevista hoje" value={formatMoney(q.data.expectedRevenueCents)} />
            <Stat label="Aguardando ação" value={String(q.data.awaitingAction)} tone="warn" />
          </div>
          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-4">
            <section className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line-soft px-[18px] py-4">
                <h2 className="m-0 text-base font-bold tracking-normal">Agenda de hoje</h2>
                <Link href="/dashboard/schedule" className="text-[13px] font-bold text-primary-strong">
                  Abrir agenda →
                </Link>
              </div>
              {q.data.today.length ? (
                q.data.today.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelected(a.id)}
                    className="flex min-h-14 w-full items-center gap-3.5 border-b border-panel-bg px-[18px] py-3 text-left last:border-0 hover:bg-[#f9faf9]"
                  >
                    <b className="w-11 text-[13px]">{formatTime(a.startsAt)}</b>
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: personColors(a.professional.name).strong }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{a.client.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {a.serviceName} · {a.professional.name}
                      </span>
                    </span>
                    <Badge tone={STATUS_BADGE[a.status].tone} size="sm">
                      {STATUS_BADGE[a.status].label}
                    </Badge>
                  </button>
                ))
              ) : (
                <div className="px-[18px] py-7 text-center text-[13px] text-muted">Nenhum agendamento hoje.</div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="border-b border-line-soft px-[18px] py-4">
                <h2 className="m-0 text-base font-bold tracking-normal">Novos e pendentes</h2>
                <div className="mt-0.5 text-xs text-muted">Agendamentos feitos pelo app aparecem aqui</div>
              </div>
              {q.data.newAndPending.length ? (
                q.data.newAndPending.map((a) => (
                  <div
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(a.id)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(a.id)}
                    className="flex min-h-14 cursor-pointer items-center gap-3 border-b border-panel-bg px-[18px] py-3 last:border-0 hover:bg-[#f9faf9]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-bold">
                        <span className="truncate">{a.client.name}</span>
                        {a.isNewForOwner && a.origin === "APP" ? (
                          <span className="rounded-[5px] bg-accent px-1.5 py-px text-[10px] font-extrabold text-white">
                            NOVO
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {a.serviceName} · {formatWhen(a.startsAt)}
                      </span>
                    </span>
                    {a.status === "PENDING" ? (
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={(e) => confirm(e, a)}
                        loading={act.isPending && act.variables?.id === a.id}
                      >
                        Confirmar
                      </Button>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="px-[18px] py-7 text-center text-[13px] text-muted">Tudo em dia por aqui.</div>
              )}
            </section>
          </div>
        </>
      )}
      <AppointmentDrawer id={selected} onClose={() => setSelected(null)} />
    </>
  );
}
