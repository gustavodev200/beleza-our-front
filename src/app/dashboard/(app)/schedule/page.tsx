"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { AppointmentDrawer } from "@/components/owner/appointment-drawer";
import { usePanel } from "@/components/owner/panel-shell";
import { Button } from "@/components/ui/button";
import { PageTitle, Segmented, Toggle } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { layoutLanes } from "@/lib/agenda-layout";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { personColors } from "@/lib/colors";
import {
  addDays,
  dayOfMonth,
  firstName,
  formatShortDate,
  formatTime,
  hhmmToMinutes,
  localDate,
  weekdayOf,
  weekdayShort,
} from "@/lib/format";
import { BLOCK_REASONS } from "@/lib/labels";
import { ownerKeys } from "@/lib/owner-queries";
import { uuidSchema } from "@/lib/schemas";
import type { Agenda, OwnerAppointment, TimeBlock } from "@/lib/types";

const HOUR_PX = 56;

const NARROW = "(max-width: 767px)";
function subscribeNarrow(cb: () => void) {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useNarrowScreen(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

function mondayOf(date: string): string {
  const wd = weekdayOf(date);
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

function minutesIn(instant: string, day: string, edge: "start" | "end"): number {
  const d = localDate(instant);
  if (d < day) return 0;
  if (d > day) return edge === "end" ? 1440 : 0;
  return hhmmToMinutes(formatTime(instant));
}

type Entry =
  | { kind: "appt"; id: string; start: number; end: number; appt: OwnerAppointment }
  | { kind: "block"; id: string; start: number; end: number; block: TimeBlock };

function AgendaView() {
  const params = useSearchParams();
  const presetPro = uuidSchema.safeParse(params.get("professional")).data;
  const today = localDate();
  const { openNew, openBlock } = usePanel();
  const qc = useQueryClient();
  const narrow = useNarrowScreen();
  const [chosenView, setView] = useState<"week" | "day" | null>(null);
  // Sem escolha explícita: telas estreitas começam na visão de dia.
  const view = chosenView ?? (narrow ? "day" : "week");
  const [anchor, setAnchor] = useState(today);
  const [hiddenState, setHidden] = useState<Set<string> | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const from = view === "week" ? mondayOf(anchor) : anchor;
  const to = view === "week" ? addDays(from, 6) : anchor;
  const days = Array.from({ length: view === "week" ? 7 : 1 }, (_, i) => addDays(from, i));

  const q = useQuery({
    queryKey: [...ownerKeys.agenda, from, to],
    queryFn: () => api<Agenda>("/owner/agenda", { query: { from, to } }),
    refetchInterval: 60_000,
  });

  // "Ver agenda" de uma profissional (?professional=) esconde as demais até o dono mexer nos filtros.
  const hidden =
    hiddenState ??
    new Set(presetPro && q.data ? q.data.professionals.filter((p) => p.id !== presetPro).map((p) => p.id) : []);

  const removeBlock = useMutation({
    mutationFn: (id: string) => api(`/owner/blocks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast("Bloqueio removido — horário liberado na agenda online");
      void qc.invalidateQueries({ queryKey: ownerKeys.agenda });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const data = q.data;
  const pros = data?.professionals ?? [];
  const proName = (id: string) => pros.find((p) => p.id === id)?.name ?? "";

  const range = useMemo(() => {
    const open = data?.hours ?? [];
    if (!open.length) return { start: 8 * 60, end: 20 * 60 };
    const start = Math.floor(Math.min(...open.map((h) => h.opensAt)) / 60) * 60;
    const end = Math.ceil(Math.max(...open.map((h) => h.closesAt)) / 60) * 60;
    return { start, end: Math.max(end, start + 60) };
  }, [data?.hours]);
  const hours = Array.from({ length: (range.end - range.start) / 60 }, (_, i) => range.start / 60 + i);
  const height = (range.end - range.start) * (HOUR_PX / 60);
  const y = (minutes: number) => (Math.max(range.start, Math.min(range.end, minutes)) - range.start) * (HOUR_PX / 60);

  const columns = days.map((day) => {
    const h = data?.hours.find((x) => x.weekday === weekdayOf(day));
    const entries: Entry[] = [];
    for (const a of data?.appointments ?? []) {
      if (hidden.has(a.professional.id) || a.status === "CANCELED") continue;
      if (localDate(a.startsAt) !== day) continue;
      entries.push({
        kind: "appt",
        id: a.id,
        start: minutesIn(a.startsAt, day, "start"),
        end: minutesIn(a.endsAt, day, "end"),
        appt: a,
      });
    }
    for (const b of data?.blocks ?? []) {
      if (hidden.has(b.professionalId)) continue;
      if (
        localDate(b.startsAt) > day ||
        localDate(b.endsAt) < day ||
        (localDate(b.endsAt) === day && formatTime(b.endsAt) === "00:00")
      )
        continue;
      entries.push({
        kind: "block",
        id: b.id,
        start: minutesIn(b.startsAt, day, "start"),
        end: minutesIn(b.endsAt, day, "end"),
        block: b,
      });
    }
    return { day, hours: h, placed: layoutLanes(entries) };
  });

  const shift = (dir: 1 | -1) => setAnchor(addDays(anchor, dir * (view === "week" ? 7 : 1)));
  const rangeLabel =
    view === "week"
      ? `${formatShortDate(`${from}T12:00:00Z`)} – ${formatShortDate(`${to}T12:00:00Z`)}`
      : formatShortDate(`${from}T12:00:00Z`);

  return (
    <>
      <PageTitle
        sub="Toque em um horário para ver detalhes e agir"
        actions={
          <>
            <Button variant="outline" size="icon-sm" onClick={() => shift(-1)} aria-label="Anterior">
              <Icon name="chevron_left" size={20} />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => shift(1)} aria-label="Próximo">
              <Icon name="chevron_right" size={20} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(today)}>
              Hoje
            </Button>
            <b className="px-1 text-sm">{rangeLabel}</b>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "week", label: "Semana" },
                { value: "day", label: "Dia" },
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              icon="block"
              onClick={() => openBlock({ date: anchor >= today ? anchor : today })}
            >
              Bloquear
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon="add"
              onClick={() => openNew({ date: anchor >= today ? anchor : today })}
            >
              Novo
            </Button>
          </>
        }
      >
        Agenda
      </PageTitle>

      <div className="mt-4 flex flex-col items-start gap-4 lg:flex-row">
        <div className="flex w-full flex-col gap-3.5 lg:w-[210px] lg:shrink-0">
          <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-3.5">
            <b className="text-[13px]">Profissionais</b>
            <div className="flex flex-wrap gap-x-4 gap-y-2 lg:flex-col">
              {pros.map((p) => {
                const c = personColors(p.name);
                const on = !hidden.has(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-extrabold"
                      style={{ background: c.bg, color: c.fg }}
                    >
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className={cn("min-w-0 flex-1 text-[13px] font-bold", !p.active && "text-muted")}>
                      {firstName(p.name)}
                      {!p.active ? " (inativa)" : ""}
                    </span>
                    <Toggle
                      checked={on}
                      label={`Mostrar ${p.name}`}
                      onChange={() => {
                        const n = new Set(hidden);
                        if (on) n.add(p.id);
                        else n.delete(p.id);
                        setHidden(n);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="hidden flex-col gap-2 rounded-2xl border border-line bg-surface p-3.5 text-xs text-ink-2 lg:flex">
            <b className="text-[13px] text-ink">Legenda</b>
            <span className="flex items-center gap-2">
              <span className="h-3 w-[18px] rounded-[3px] border-l-[3px] border-[oklch(0.58_0.15_262)] bg-[oklch(0.95_0.03_262)]" />
              Confirmado
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-[18px] rounded-[3px] border border-dashed border-[oklch(0.58_0.15_262)]" />
              Pendente
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-[18px] rounded-[3px] bg-[oklch(0.95_0.03_262)] opacity-50" />
              Não compareceu / concluído
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-[18px] rounded-[3px] hatch" />
              Pausa / fechado / bloqueio
            </span>
          </div>
        </div>

        <div className="w-full min-w-0 flex-1 overflow-auto rounded-2xl border border-line bg-surface">
          {q.isPending ? (
            <Skeleton className="m-4 h-[480px]" />
          ) : q.isError ? (
            <ErrorState className="m-4" message={errorMessage(q.error)} onRetry={() => q.refetch()} />
          ) : (
            <div style={{ minWidth: view === "week" ? 760 : undefined }}>
              <div
                className="sticky top-0 z-[2] grid border-b border-soft bg-white"
                style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0,1fr))` }}
              >
                <div />
                {days.map((d) => (
                  <div key={d} className="flex flex-col items-center gap-0.5 py-2.5">
                    <span className={cn("text-xs font-semibold", d === today ? "text-primary-strong" : "text-muted")}>
                      {weekdayShort(d)}
                    </span>
                    <span
                      className={cn(
                        "grid size-[30px] place-items-center rounded-full text-sm font-extrabold",
                        d === today && "bg-primary text-white",
                      )}
                    >
                      {dayOfMonth(d)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0,1fr))` }}>
                <div>
                  {hours.map((h) => (
                    <div key={h} style={{ height: HOUR_PX }} className="pt-0.5 pr-2 text-right text-[11px] text-subtle">
                      {String(h).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>
                {columns.map((col) => (
                  <div
                    key={col.day}
                    className={cn("relative border-l border-soft", !col.hours && "hatch-closed")}
                    style={{ height }}
                  >
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: `repeating-linear-gradient(to bottom,#eff1f1 0 1px,transparent 1px ${HOUR_PX}px)`,
                      }}
                    />
                    {!col.hours ? (
                      <div className="absolute inset-x-0 top-3 text-center text-xs font-bold text-subtle">Fechado</div>
                    ) : null}
                    {col.hours ? (
                      <>
                        {col.hours.opensAt > range.start ? (
                          <div
                            className="absolute inset-x-0 top-0 hatch-closed"
                            style={{ height: y(col.hours.opensAt) }}
                          />
                        ) : null}
                        {col.hours.closesAt < range.end ? (
                          <div
                            className="absolute inset-x-0 bottom-0 hatch-closed"
                            style={{ top: y(col.hours.closesAt) }}
                          />
                        ) : null}
                        {col.hours.breakStart !== null && col.hours.breakEnd !== null ? (
                          <div
                            className="absolute inset-x-[3px] rounded-[7px] px-1.5 py-1 text-[11px] text-muted hatch"
                            style={{
                              top: y(col.hours.breakStart),
                              height: y(col.hours.breakEnd) - y(col.hours.breakStart),
                            }}
                          >
                            Pausa
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    {col.placed.map(({ item, lane, lanes }) => {
                      const top = y(item.start) + 1;
                      const h = Math.max(y(item.end) - y(item.start) - 3, 22);
                      const style = {
                        top,
                        height: h,
                        left: `calc(${(lane / lanes) * 100}% + 3px)`,
                        width: `calc(${100 / lanes}% - 6px)`,
                      };
                      if (item.kind === "block") {
                        return (
                          <button
                            key={item.id}
                            type="button"
                            style={style}
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Remover este bloqueio? O horário volta a ficar disponível para as clientes.",
                                )
                              )
                                removeBlock.mutate(item.id);
                            }}
                            className="absolute z-[1] overflow-hidden rounded-[7px] border border-line-strong px-1.5 py-1 text-left text-[11px] text-ink-2 hatch"
                            title="Clique para remover o bloqueio"
                          >
                            <b className="block truncate">
                              Bloqueado · {firstName(proName(item.block.professionalId))}
                            </b>
                            <span className="block truncate">
                              {BLOCK_REASONS.find((r) => r.id === item.block.reason)?.label}
                            </span>
                          </button>
                        );
                      }
                      const a = item.appt;
                      const c = personColors(a.professional.name);
                      const faded = a.status === "NO_SHOW" || a.status === "COMPLETED";
                      return (
                        <button
                          key={item.id}
                          type="button"
                          style={{
                            ...style,
                            background: a.status === "PENDING" ? "#fff" : c.soft,
                            color: c.text,
                            borderWidth: 1,
                            borderStyle: a.status === "PENDING" ? "dashed" : "solid",
                            borderColor: a.status === "PENDING" ? c.strong : "transparent",
                            borderLeftWidth: 3,
                            borderLeftStyle: "solid",
                            borderLeftColor: c.strong,
                            opacity: faded ? 0.55 : 1,
                            boxShadow: selected === a.id ? "0 0 0 2px #14242b" : undefined,
                          }}
                          onClick={() => setSelected(a.id)}
                          className="absolute z-[1] flex flex-col gap-px overflow-hidden rounded-[7px] px-1.5 py-1 text-left hover:brightness-[.97]"
                          aria-label={`${formatTime(a.startsAt)} ${a.serviceName} com ${a.client.name}`}
                        >
                          <span className="w-full truncate text-[11px] font-bold">
                            {a.isNewForOwner && a.origin === "APP" ? "● " : ""}
                            {a.serviceName}
                          </span>
                          <span className="w-full truncate text-[10px]">
                            {formatTime(a.startsAt)} · {firstName(a.client.name)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <AppointmentDrawer id={selected} onClose={() => setSelected(null)} />
    </>
  );
}

export default function AgendaPage() {
  return (
    <Suspense>
      <AgendaView />
    </Suspense>
  );
}
