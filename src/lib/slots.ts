import { addDays, hhmmToMinutes, localDate, weekdayOf } from "./format";
import type { PublicHours, Slot } from "./types";

export const SLOT_STEP_MINUTES = 15;
export const CLIENT_WINDOW_DAYS = 7;

export interface TimeCell {
  time: string; // "HH:MM" em SP
  slot: Slot | null; // null = ocupado (riscado)
}

/**
 * Grade de horários do dia para exibição: todos os inícios estruturais
 * (expediente, fora da pausa, cabendo a duração, no futuro) marcados como
 * livres quando a API os devolveu. A API é quem decide o que está livre;
 * a grade só serve para mostrar os ocupados riscados (§4.4).
 */
export function buildTimeCells(
  date: string,
  hours: PublicHours | undefined,
  durationMinutes: number,
  freeSlots: Slot[],
  now = new Date(),
): TimeCell[] {
  if (!hours) return [];
  const free = new Map(freeSlots.map((s) => [timeKey(s.startsAt), s]));
  const nowMinutes = date === localDate(now) ? hhmmToMinutes(timeKey(now.toISOString())) : -1;
  const cells: TimeCell[] = [];
  for (let start = hours.opensAt; start + durationMinutes <= hours.closesAt; start += SLOT_STEP_MINUTES) {
    const end = start + durationMinutes;
    if (hours.breakStart !== null && hours.breakEnd !== null && start < hours.breakEnd && end > hours.breakStart)
      continue;
    if (start <= nowMinutes) continue;
    const time = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
    cells.push({ time, slot: free.get(time) ?? null });
  }
  // Horário livre fora da grade estrutural (não deveria ocorrer) ainda aparece.
  for (const [time, slot] of free) if (!cells.some((c) => c.time === time)) cells.push({ time, slot });
  return cells.sort((a, b) => a.time.localeCompare(b.time));
}

function timeKey(instant: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));
}

/** Próximos 7 dias de agendamento, com os fechados marcados. */
export function bookingDays(hours: PublicHours[], today = localDate()) {
  const open = new Set(hours.map((h) => h.weekday));
  return Array.from({ length: CLIENT_WINDOW_DAYS }, (_, i) => {
    const date = addDays(today, i);
    return { date, closed: !open.has(weekdayOf(date)) };
  });
}
