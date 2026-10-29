/**
 * Formatação de datas, dinheiro, duração e telefone. Todo calendário do
 * produto é America/Sao_Paulo (§7.7): instantes chegam da API em UTC e
 * datas de calendário trafegam como YYYY-MM-DD no fuso de SP.
 */
export const TZ = "America/Sao_Paulo";

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_LONG = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
export const WEEKDAY_SHORT = WEEKDAYS_SHORT;
export const WEEKDAY_LONG = WEEKDAYS_LONG;

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function zonedParts(date: Date) {
  const p = Object.fromEntries(partsFmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: p.year, m: p.month, d: p.day, h: p.hour, min: p.minute };
}

/** Data de calendário (YYYY-MM-DD) em SP para um instante. */
export function localDate(date: Date | string = new Date()): string {
  const { y, m, d } = zonedParts(new Date(date));
  return `${y}-${m}-${d}`;
}

/** "14:30" em SP. */
export function formatTime(date: Date | string): string {
  const { h, min } = zonedParts(new Date(date));
  return `${h}:${min}`;
}

/** Soma dias a uma data de calendário, sem depender do fuso da máquina. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

/** Dia da semana (0 = domingo) de uma data de calendário. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

export function weekdayShort(date: string): string {
  return WEEKDAYS_SHORT[weekdayOf(date)];
}

/** "Quarta-feira, 28 de outubro". */
export function formatLongDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${WEEKDAYS_LONG[weekdayOf(date)]}, ${d} de ${MONTHS[m - 1]}`;
}

/** "Hoje", "Amanhã" ou "Qua, 28/10". */
export function formatRelativeDay(date: string, today = localDate()): string {
  if (date === today) return "Hoje";
  if (date === addDays(today, 1)) return "Amanhã";
  return `${weekdayShort(date)}, ${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

/** "Hoje · 14:30", "Qua, 28/10 · 09:00". */
export function formatWhen(instant: string | Date, today = localDate()): string {
  return `${formatRelativeDay(localDate(instant), today)} · ${formatTime(instant)}`;
}

/** "28 out" curto para linhas de tabela. */
export function formatShortDate(instant: string | Date): string {
  const day = localDate(instant);
  return `${Number(day.slice(8, 10))} ${MONTHS[Number(day.slice(5, 7)) - 1].slice(0, 3)}`;
}

/** "há 2 h", "há 3 dias". */
export function formatAgo(instant: string | Date, now = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(instant).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d} ${d === 1 ? "dia" : "dias"}`;
  return formatShortDate(instant);
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Centavos → "R$ 45,00". */
export function formatMoney(cents: number): string {
  return brl.format(cents / 100).replace(/ /g, " ");
}

/** "R$ 45,00" / "45" / "45,5" → centavos. */
export function parseMoneyToCents(value: string): number | null {
  const clean = value
    .replace(/[^\d,.]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** 90 → "1h30", 45 → "45 min", 60 → "1h". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** Minutos desde 00:00 → "09:00". */
export function minutesToHHMM(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function hhmmToMinutes(value: string): number {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
}

/** Mesma regra do backend: celular BR → E.164 (+5562999990000) ou null. */
export function normalizeBrPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const withCountry = digits.length === 11 ? `55${digits}` : digits;
  const e164 = `+${withCountry}`;
  return /^\+55[1-9]{2}9\d{8}$/.test(e164) ? e164 : null;
}

/** Máscara progressiva enquanto digita: "(62) 99999-0000". */
export function maskPhoneInput(raw: string): string {
  const d = raw
    .replace(/\D/g, "")
    .replace(/^55(?=\d{11})/, "")
    .slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Máscara progressiva de CPF ("000.000.000-00") que vira CNPJ ("00.000.000/0000-00") após 11 dígitos. */
export function maskCpfCnpjInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

/** Dígitos de um CPF/CNPJ válido (dígitos verificadores conferidos) ou `null`. */
export function normalizeCpfCnpj(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (/^(\d)\1+$/.test(d)) return null;
  const n = d.split("").map(Number);
  const check = (nums: number[], weights: number[]) => {
    const rest = nums.reduce((acc, v, i) => acc + v * weights[i], 0) % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  if (d.length === 11) {
    const ok =
      check(n.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]) === n[9] &&
      check(n.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) === n[10];
    return ok ? d : null;
  }
  if (d.length === 14) {
    const ok =
      check(n.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === n[12] &&
      check(n.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === n[13];
    return ok ? d : null;
  }
  return null;
}

/** E.164 → "(62) 99999-0000"; devolve o valor original se não reconhecer. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const d = value.replace(/\D/g, "");
  const local = d.length === 13 && d.startsWith("55") ? d.slice(2) : d;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return value;
}

/** Link wa.me só com dígitos (evita injeção de parâmetros na URL). */
export function whatsappLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function formatRating(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
