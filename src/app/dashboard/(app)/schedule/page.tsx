"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Coffee, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { AppointmentDrawer } from "@/components/owner/appointment-drawer";
import { usePanel } from "@/components/owner/panel-shell";
import { Button } from "@/components/ui/button";
import { PageTitle, Segmented, Toggle } from "@/components/ui/controls";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { personColors } from "@/lib/colors";
import { addDays, dayOfMonth, firstName, formatShortDate, localDate, weekdayOf, weekdayShort } from "@/lib/format";
import { ownerKeys } from "@/lib/owner-queries";
import { uuidSchema } from "@/lib/schemas";
import type { Agenda } from "@/lib/types";

// O calendário depende de Intl/fuso do navegador: só renderiza no cliente.
const AgendaCalendar = dynamic(() => import("@/components/owner/agenda-calendar"), {
  ssr: false,
  loading: () => <Skeleton className="m-4 h-[480px]" />,
});

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

/** Faixa da semana para trocar de dia com um toque (celular, visão de dia). */
function DayStrip({ anchor, today, onPick }: { anchor: string; today: string; onPick: (day: string) => void }) {
  const monday = mondayOf(anchor);
  return (
    <div role="tablist" aria-label="Dias da semana" className="grid grid-cols-7 gap-1.5">
      {Array.from({ length: 7 }, (_, i) => addDays(monday, i)).map((d) => {
        const on = d === anchor;
        return (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onPick(d)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border text-center transition-colors",
              on ? "border-ink bg-ink text-white shadow-card" : "border-line bg-surface text-ink hover:border-line-strong",
            )}
          >
            <span className={cn("text-[10px] font-bold tracking-wide uppercase", on ? "text-white/70" : "text-muted")}>
              {weekdayShort(d)}
            </span>
            <span className="text-base leading-none font-extrabold">{dayOfMonth(d)}</span>
            <span
              aria-hidden
              className={cn("size-1 rounded-full", d === today ? (on ? "bg-accent-soft" : "bg-accent") : "bg-transparent")}
            />
          </button>
        );
      })}
    </div>
  );
}

function AgendaView() {
  const params = useSearchParams();
  const presetPro = uuidSchema.safeParse(params.get("professional")).data;
  const today = localDate();
  const { openNew, openBlock } = usePanel();
  const qc = useQueryClient();
  const narrow = useNarrowScreen();
  const [chosenView, setView] = useState<"week" | "day" | null>(null);
  // Celular: só a visão de dia (a faixa de dias faz o papel da semana).
  const view = narrow ? "day" : (chosenView ?? "week");
  const [anchor, setAnchor] = useState(today);
  const [hiddenState, setHidden] = useState<Set<string> | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const from = view === "week" ? mondayOf(anchor) : anchor;
  const to = view === "week" ? addDays(from, 6) : anchor;

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
  const proName = useCallback((id: string) => data?.professionals.find((p) => p.id === id)?.name ?? "", [data]);

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
              <ChevronLeft size={20} aria-hidden />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => shift(1)} aria-label="Próximo">
              <ChevronRight size={20} aria-hidden />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(today)}>
              Hoje
            </Button>
            <b className="px-1 text-sm">{rangeLabel}</b>
            {narrow ? null : (
              <Segmented
                value={view}
                onChange={setView}
                options={[
                  { value: "week", label: "Semana" },
                  { value: "day", label: "Dia" },
                ]}
              />
            )}
            <Button
              variant="outline"
              size="sm"
              icon={<Coffee size={18} aria-hidden />}
              onClick={() => openBlock({ date: anchor >= today ? anchor : today })}
            >
              Pausa
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={18} aria-hidden />}
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
              <span className="h-3 w-[18px] rounded-[3px] border-l-[3px] border-[#e59a1a] bg-[#ffe8bf]" />
              Pausa / intervalo (fechado)
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-[18px] rounded-[3px] hatch" />
              Fora do expediente / bloqueio
            </span>
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
          {narrow && view === "day" ? <DayStrip anchor={anchor} today={today} onPick={setAnchor} /> : null}
          <div
            onTouchStart={(e) => {
              swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }}
            onTouchEnd={(e) => {
              const start = swipe.current;
              swipe.current = null;
              if (!start || view !== "day") return;
              const dx = e.changedTouches[0].clientX - start.x;
              const dy = e.changedTouches[0].clientY - start.y;
              // Só um arrasto claramente horizontal troca o dia.
              if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) shift(dx < 0 ? 1 : -1);
            }}
            className="h-[70dvh] min-h-[460px] w-full overflow-hidden rounded-2xl border border-line bg-surface lg:h-[calc(100dvh-15rem)] lg:min-h-[560px]"
          >
            {q.isError ? (
              <ErrorState className="m-4" message={errorMessage(q.error)} onRetry={() => q.refetch()} />
            ) : (
              <AgendaCalendar
                data={data}
                hidden={hidden}
                view={view}
                anchor={anchor}
                selected={selected}
                proName={proName}
                onSelect={setSelected}
                onBlockClick={(id) => {
                  if (window.confirm("Remover este bloqueio? O horário volta a ficar disponível para as clientes."))
                    removeBlock.mutate(id);
                }}
              />
            )}
          </div>
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
