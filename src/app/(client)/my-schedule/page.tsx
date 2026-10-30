"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useOwnerAction } from "@/components/owner/appointment-drawer";
import { PushOptIn } from "@/components/pwa/push-opt-in";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/controls";
import { ErrorState, ListSkeleton, Notice } from "@/components/ui/states";
import { ApiError, api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { personColors } from "@/lib/colors";
import { addDays, dayOfMonth, formatTime, localDate, weekdayShort } from "@/lib/format";
import { STATUS_BADGE } from "@/lib/labels";
import { RequireRole, useMe } from "@/lib/session";
import type { Agenda } from "@/lib/types";

const DAYS = 6;

function MyAgenda() {
  const { data: me } = useMe();
  const today = localDate();
  const [day, setDay] = useState(today);
  const act = useOwnerAction();
  const q = useQuery({
    queryKey: ["owner", "agenda", today, addDays(today, DAYS - 1)],
    queryFn: () => api<Agenda>("/owner/agenda", { query: { from: today, to: addDays(today, DAYS - 1) } }),
    refetchInterval: 60_000,
  });

  if (q.isError && q.error instanceof ApiError && q.error.code === "BUSINESS_NOT_ACTIVE") {
    return (
      <Notice>
        Sua agenda abre depois da aprovação do cadastro.{" "}
        <Link href="/dashboard/status" className="font-bold underline">
          Ver status
        </Link>
      </Notice>
    );
  }

  const list = (q.data?.appointments ?? []).filter((a) => localDate(a.startsAt) === day && a.status !== "CANCELED");
  const count = (d: string) =>
    (q.data?.appointments ?? []).filter((a) => localDate(a.startsAt) === d && a.status !== "CANCELED").length;

  return (
    <>
      <div className="mb-3 flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-[26px] font-bold">Minha agenda</h1>
          <div className="text-xs text-muted">{me?.business?.name}</div>
        </div>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Painel completo
        </Link>
      </div>
      <PushOptIn audience="owner" className="mb-3" />
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: DAYS }, (_, i) => addDays(today, i)).map((d) => {
          const on = d === day;
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              onClick={() => setDay(d)}
              className={cn(
                "flex min-h-[64px] flex-col items-center justify-center gap-px rounded-[11px] border-[1.5px]",
                on ? "border-ink bg-ink text-white" : "border-line-strong bg-white",
              )}
            >
              <span className="text-[10px] font-semibold">{weekdayShort(d)}</span>
              <span className="text-base font-extrabold">{dayOfMonth(d)}</span>
              <span className="text-[9px] opacity-70">{q.data ? `${count(d)} agend.` : ""}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {q.isPending ? (
          <ListSkeleton rows={3} />
        ) : q.isError ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : list.length ? (
          list.map((a) => (
            <div key={a.id} className="flex items-stretch gap-2.5">
              <div className="w-11 pt-3 text-xs font-bold">{formatTime(a.startsAt)}</div>
              <div
                className="flex flex-1 flex-col gap-1 rounded-xl border border-soft bg-white px-3 py-2.5"
                style={{ borderLeft: `3px solid ${personColors(a.professional.name).strong}` }}
              >
                <div className="flex justify-between gap-1.5">
                  <b className="text-[13px]">{a.client.name}</b>
                  <Badge tone={STATUS_BADGE[a.status].tone} size="sm">
                    {STATUS_BADGE[a.status].label}
                  </Badge>
                </div>
                <span className="text-[11px] text-muted">
                  {a.serviceName} · {a.professional.name}
                </span>
                {a.status === "PENDING" ? (
                  <Button
                    variant="primary"
                    size="xs"
                    className="mt-1 self-start"
                    loading={act.isPending && act.variables?.id === a.id}
                    onClick={() => act.mutate({ id: a.id, action: "confirm" })}
                  >
                    Confirmar
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-[13px] text-muted">Sem agendamentos neste dia.</div>
        )}
      </div>
    </>
  );
}

export default function MyAgendaPage() {
  return (
    <div className="mx-auto max-w-[560px] px-4 pt-4">
      <RequireRole role="BUSINESS_OWNER">
        <MyAgenda />
      </RequireRole>
    </div>
  );
}
