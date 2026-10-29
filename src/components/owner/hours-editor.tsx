"use client";

import { Chip, Toggle } from "@/components/ui/controls";
import { Select } from "@/components/ui/form";
import { WEEKDAY_SHORT } from "@/lib/format";
import { daySchema } from "@/lib/schemas";
import type { OwnerHours } from "@/lib/types";

export interface DayRow {
  weekday: number;
  open: boolean;
  opensAt: string;
  closesAt: string;
  hasBreak: boolean;
  breakStart: string;
  breakEnd: string;
}

const TIMES = Array.from(
  { length: 24 * 2 },
  (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
);
// Segunda a domingo, como o dono pensa a semana.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

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
      hasBreak: Boolean(h?.breakStart),
      breakStart: h?.breakStart ?? "12:00",
      breakEnd: h?.breakEnd ?? "13:00",
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
        ...(r.hasBreak ? { breakStart: r.breakStart, breakEnd: r.breakEnd } : {}),
      };
      const check = daySchema.safeParse(day);
      if (!check.success) errors[r.weekday] = check.error.issues[0].message;
      return day;
    });
  return { days, errors, valid: Object.keys(errors).length === 0 && days.length > 0 };
}

function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-[96px] py-2 text-sm"
    >
      {TIMES.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </Select>
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
              hasBreak: source.hasBreak,
              breakStart: source.breakStart,
              breakEnd: source.breakEnd,
            }
          : r,
      ),
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dias de atendimento">
        {rows.map((r) => (
          <Chip key={r.weekday} selected={r.open} onClick={() => set(r.weekday, { open: !r.open })}>
            {WEEKDAY_SHORT[r.weekday]}
          </Chip>
        ))}
      </div>
      <div className="flex flex-col divide-y divide-line-soft rounded-2xl border border-line bg-surface">
        {rows
          .filter((r) => r.open)
          .map((r, i) => (
            <div key={r.weekday} className="flex flex-col gap-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <b className="w-10 text-sm">{WEEKDAY_SHORT[r.weekday]}</b>
                <TimeSelect
                  label={`Abre ${WEEKDAY_SHORT[r.weekday]}`}
                  value={r.opensAt}
                  onChange={(v) => set(r.weekday, { opensAt: v })}
                />
                <span className="text-sm text-muted">às</span>
                <TimeSelect
                  label={`Fecha ${WEEKDAY_SHORT[r.weekday]}`}
                  value={r.closesAt}
                  onChange={(v) => set(r.weekday, { closesAt: v })}
                />
                <Toggle
                  checked={r.hasBreak}
                  onChange={(v) => set(r.weekday, { hasBreak: v })}
                  label="Pausa"
                  showLabel
                />
                {i === 0 && rows.filter((x) => x.open).length > 1 ? (
                  <button
                    type="button"
                    onClick={() => applyToAll(r)}
                    className="ml-auto min-h-9 text-xs font-bold text-primary-strong"
                  >
                    Copiar para todos
                  </button>
                ) : null}
              </div>
              {r.hasBreak ? (
                <div className="flex flex-wrap items-center gap-2 pl-12 text-sm text-muted">
                  Pausa
                  <TimeSelect
                    label={`Início da pausa ${WEEKDAY_SHORT[r.weekday]}`}
                    value={r.breakStart}
                    onChange={(v) => set(r.weekday, { breakStart: v })}
                  />
                  às
                  <TimeSelect
                    label={`Fim da pausa ${WEEKDAY_SHORT[r.weekday]}`}
                    value={r.breakEnd}
                    onChange={(v) => set(r.weekday, { breakEnd: v })}
                  />
                </div>
              ) : null}
              {errors[r.weekday] ? (
                <p role="alert" className="m-0 pl-12 text-[13px] text-danger">
                  {errors[r.weekday]}
                </p>
              ) : null}
            </div>
          ))}
        {rows.every((r) => !r.open) ? <p className="m-0 p-4 text-sm text-muted">Selecione ao menos um dia.</p> : null}
      </div>
    </div>
  );
}
