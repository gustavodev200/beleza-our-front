"use client";

import { Toggle } from "@/components/ui/controls";
import { Select } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { WEEKDAY_LONG, WEEKDAY_SHORT, localDate, weekdayOf } from "@/lib/format";
import { daySchema } from "@/lib/schemas";
import type { OwnerHours } from "@/lib/types";

export interface DayRow {
  weekday: number;
  open: boolean;
  opensAt: string;
  closesAt: string;
  breaks: BreakRow[];
}

export interface BreakRow {
  start: string;
  end: string;
}

const TIMES = Array.from(
  { length: 24 * 2 },
  (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
);
// Segunda a domingo, como o dono pensa a semana.
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const MAX_BREAKS = 10;

const addMinutes = (hhmm: string, minutes: number) => {
  const total = Math.min(Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5)) + minutes, 23 * 60 + 30);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/** Próxima pausa sugerida: almoço na primeira, depois 30 min logo após a última. */
function suggestBreak(r: DayRow): BreakRow {
  const last = r.breaks.at(-1);
  if (!last) return { start: "12:00", end: "13:00" };
  return { start: last.end, end: addMinutes(last.end, 30) };
}

export function hoursToRows(hours: OwnerHours[]): DayRow[] {
  const byDay = new Map(hours.map((h) => [h.weekday, h]));
  const fresh = hours.length === 0;
  return ORDER.map((weekday) => {
    const h = byDay.get(weekday);
    return {
      weekday,
      open: h ? true : fresh && weekday !== 0,
      opensAt: h?.opensAt ?? "09:00",
      closesAt: h?.closesAt ?? "19:00",
      breaks: h?.breaks ?? [],
    };
  });
}

/** Linhas da grade → corpo de PUT /owner/business/hours, com erro por dia. */
export function rowsToPayload(rows: DayRow[]) {
  const errors: Record<number, string> = {};
  const days = rows
    .filter((r) => r.open)
    .map((r) => {
      const day = {
        weekday: r.weekday,
        opensAt: r.opensAt,
        closesAt: r.closesAt,
        breaks: r.breaks,
      };
      const check = daySchema.safeParse(day);
      if (!check.success) errors[r.weekday] = check.error.issues[0].message;
      return day;
    });
  return { days, errors, valid: Object.keys(errors).length === 0 && days.length > 0 };
}

function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  // Horário salvo fora da grade de 30 min (ex.: 08:45) entra como opção, senão o select mostraria 00:00.
  const options = TIMES.includes(value) ? TIMES : [...TIMES, value].sort();
  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="py-2.5 text-center tabular-nums"
    >
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </Select>
  );
}

/** "Abre – Fecha" lado a lado, ocupando a largura disponível. */
function TimeRange({
  from,
  to,
  onFrom,
  onTo,
  fromLabel,
  toLabel,
}: {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  fromLabel: string;
  toLabel: string;
}) {
  return (
    <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
      <TimeSelect label={fromLabel} value={from} onChange={onFrom} />
      <span className="text-sm text-muted">até</span>
      <TimeSelect label={toLabel} value={to} onChange={onTo} />
    </div>
  );
}

export function HoursEditor({
  rows,
  onChange,
  errors = {},
}: {
  rows: DayRow[];
  onChange: (rows: DayRow[]) => void;
  errors?: Record<number, string>;
}) {
  const set = (weekday: number, patch: Partial<DayRow>) =>
    onChange(rows.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
  const applyToAll = (source: DayRow) =>
    onChange(
      rows.map((r) =>
        r.open
          ? {
              ...r,
              opensAt: source.opensAt,
              closesAt: source.closesAt,
              breaks: source.breaks.map((b) => ({ ...b })),
            }
          : r,
      ),
    );
  const setBreak = (r: DayRow, index: number, patch: Partial<BreakRow>) =>
    set(r.weekday, { breaks: r.breaks.map((b, i) => (i === index ? { ...b, ...patch } : b)) });
  const openCount = rows.filter((r) => r.open).length;
  const todayWeekday = weekdayOf(localDate());

  return (
    <div className="flex flex-col gap-2">
      <ul className="m-0 flex list-none flex-col divide-y divide-line-soft rounded-2xl border border-line bg-surface p-0">
        {rows.map((r) => {
          const day = WEEKDAY_LONG[r.weekday];
          const short = WEEKDAY_SHORT[r.weekday];
          return (
            <li
              key={r.weekday}
              className="flex flex-col gap-3 px-4 py-3.5 sm:grid sm:grid-cols-[190px_1fr] sm:items-start sm:gap-4"
            >
              <div className="flex min-h-11 items-center gap-3">
                <Toggle checked={r.open} onChange={(v) => set(r.weekday, { open: v })} label={`Abrir ${day}`} />
                <b className={cn("text-[15px]", !r.open && "text-muted")}>{day}</b>
                {r.weekday === todayWeekday ? (
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary-strong">
                    Hoje
                  </span>
                ) : null}
              </div>

              {r.open ? (
                <div className="flex min-w-0 flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <TimeRange
                      from={r.opensAt}
                      to={r.closesAt}
                      onFrom={(v) => set(r.weekday, { opensAt: v })}
                      onTo={(v) => set(r.weekday, { closesAt: v })}
                      fromLabel={`Abre ${short}`}
                      toLabel={`Fecha ${short}`}
                    />
                    {openCount > 1 ? (
                      <button
                        type="button"
                        onClick={() => applyToAll(r)}
                        title="Copiar para os outros dias abertos"
                        aria-label={`Copiar horário de ${day} para os outros dias abertos`}
                        className="grid size-11 shrink-0 place-items-center rounded-[10px] text-muted hover:bg-soft hover:text-ink"
                      >
                        <Icon name="content_copy" size={20} />
                      </button>
                    ) : null}
                  </div>

                  {r.breaks.map((b, i) => {
                    const label = r.breaks.length > 1 ? `Intervalo ${i + 1}` : "Intervalo";
                    return (
                      <div key={i} className="flex flex-col gap-1.5 rounded-xl bg-panel-bg p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">
                            <Icon name={i === 0 ? "restaurant" : "coffee"} size={16} />
                            {label}
                          </span>
                          <button
                            type="button"
                            onClick={() => set(r.weekday, { breaks: r.breaks.filter((_, j) => j !== i) })}
                            aria-label={`Remover ${label.toLowerCase()} de ${day}`}
                            className="min-h-9 px-1 text-[13px] font-semibold text-muted hover:text-danger"
                          >
                            Remover
                          </button>
                        </div>
                        <TimeRange
                          from={b.start}
                          to={b.end}
                          onFrom={(v) => setBreak(r, i, { start: v })}
                          onTo={(v) => setBreak(r, i, { end: v })}
                          fromLabel={`Início do ${label.toLowerCase()} ${short}`}
                          toLabel={`Fim do ${label.toLowerCase()} ${short}`}
                        />
                      </div>
                    );
                  })}
                  {r.breaks.length < MAX_BREAKS ? (
                    <button
                      type="button"
                      onClick={() => set(r.weekday, { breaks: [...r.breaks, suggestBreak(r)] })}
                      className="inline-flex min-h-9 items-center gap-1 self-start text-[13px] font-bold text-primary-strong"
                    >
                      <Icon name="add" size={18} />
                      {r.breaks.length ? "Adicionar outro intervalo" : "Adicionar intervalo"}
                    </button>
                  ) : null}

                  {errors[r.weekday] ? (
                    <p role="alert" className="m-0 text-[13px] font-medium text-danger">
                      {errors[r.weekday]}
                    </p>
                  ) : null}
                </div>
              ) : (
                <span className="text-sm text-muted sm:flex sm:min-h-11 sm:items-center">Fechado</span>
              )}
            </li>
          );
        })}
      </ul>
      {openCount === 0 ? (
        <p role="alert" className="m-0 text-[13px] font-medium text-danger">
          Abra ao menos um dia.
        </p>
      ) : null}
    </div>
  );
}
