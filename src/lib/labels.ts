import type { AppointmentStatus, BlockReason, BusinessStatus, BusinessType, ReviewTag, Role } from "./types";

export const BUSINESS_TYPES: { id: BusinessType; label: string; icon: string; desc: string }[] = [
  { id: "SALON", label: "Salão", icon: "storefront", desc: "Salão com uma ou mais profissionais" },
  { id: "BARBERSHOP", label: "Barbearia", icon: "content_cut", desc: "Cortes, barba e acabamento" },
  { id: "STUDIO", label: "Estúdio", icon: "visibility", desc: "Sobrancelhas, cílios ou nail design" },
  {
    id: "AUTONOMOUS",
    label: "Profissional autônoma",
    icon: "person_pin_circle",
    desc: "Atende em casa ou a domicílio",
  },
  { id: "AESTHETICS", label: "Estética", icon: "spa", desc: "Clínica de estética e depilação" },
];

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = Object.fromEntries(
  BUSINESS_TYPES.map((t) => [t.id, t.label]),
) as Record<BusinessType, string>;

/** Sugestões do onboarding (nome, duração, preço em centavos, slug da categoria). */
export const SERVICE_SUGGESTIONS: Record<BusinessType, [string, number, number, string][]> = {
  SALON: [
    ["Corte feminino", 60, 8000, "cabelo"],
    ["Escova", 45, 6000, "cabelo"],
    ["Manicure", 40, 3500, "unhas"],
    ["Pedicure", 50, 4000, "unhas"],
  ],
  BARBERSHOP: [
    ["Corte masculino", 45, 4500, "barbearia"],
    ["Barba", 30, 3000, "barbearia"],
    ["Corte + barba", 70, 7000, "barbearia"],
    ["Pigmentação", 30, 3500, "barbearia"],
  ],
  STUDIO: [
    ["Design de sobrancelhas", 30, 4000, "sobrancelhas"],
    ["Henna", 40, 5500, "sobrancelhas"],
    ["Lash lifting", 60, 12000, "sobrancelhas"],
    ["Extensão de cílios", 120, 16000, "sobrancelhas"],
  ],
  AUTONOMOUS: [
    ["Manicure", 40, 3000, "unhas"],
    ["Pé e mão", 80, 5500, "unhas"],
    ["Esmaltação em gel", 60, 5500, "unhas"],
    ["Design de sobrancelhas", 30, 3500, "sobrancelhas"],
  ],
  AESTHETICS: [
    ["Limpeza de pele", 60, 12000, "estetica"],
    ["Depilação a cera", 40, 7000, "depilacao"],
    ["Drenagem linfática", 60, 11000, "estetica"],
    ["Massagem relaxante", 60, 10000, "estetica"],
  ],
};

export const STATUS_BADGE: Record<AppointmentStatus, { label: string; tone: "ok" | "warn" | "danger" | "done" }> = {
  CONFIRMED: { label: "Confirmado", tone: "ok" },
  PENDING: { label: "Pendente", tone: "warn" },
  COMPLETED: { label: "Concluído", tone: "done" },
  CANCELED: { label: "Cancelado", tone: "danger" },
  NO_SHOW: { label: "Não compareceu", tone: "danger" },
};

export const BUSINESS_STATUS: Record<BusinessStatus, { label: string; tone: "ok" | "warn" | "danger" | "done" }> = {
  DRAFT: { label: "Rascunho", tone: "done" },
  PENDING: { label: "Em análise", tone: "warn" },
  ACTIVE: { label: "Ativo", tone: "ok" },
  REJECTED: { label: "Recusado", tone: "danger" },
  SUSPENDED: { label: "Suspenso", tone: "danger" },
};

export const ROLE_LABEL: Record<Role, string> = {
  CLIENT: "Cliente",
  BUSINESS_OWNER: "Dono",
  SUPER_ADMIN: "Admin",
};

export const REVIEW_TAGS: { id: ReviewTag; label: string }[] = [
  { id: "PUNCTUAL", label: "Pontual" },
  { id: "ATTENTIVE", label: "Atenciosa" },
  { id: "CLEAN_ENVIRONMENT", label: "Ambiente limpo" },
  { id: "GREAT_RESULT", label: "Ótimo resultado" },
  { id: "FAIR_PRICE", label: "Preço justo" },
];

export const BLOCK_REASONS: { id: BlockReason; label: string }[] = [
  { id: "APPOINTMENT", label: "Compromisso" },
  { id: "DAY_OFF", label: "Folga" },
  { id: "EXTENDED_LUNCH", label: "Almoço estendido" },
  { id: "COURSE", label: "Curso" },
];

export const BLOCK_DURATIONS = [
  { id: "1h", label: "1h" },
  { id: "2h", label: "2h" },
  { id: "4h", label: "4h" },
  { id: "day", label: "Dia inteiro" },
] as const;

export const CANCELLATION_WINDOWS = [
  { value: 60, label: "1h" },
  { value: 120, label: "2h" },
  { value: 360, label: "6h" },
  { value: 1440, label: "24h" },
] as const;

export const POPULAR_SEARCHES = ["Manicure", "Corte masculino", "Design de sobrancelhas", "Escova"];

/** Ícone da notificação pelo tipo vindo da API. */
export function notificationIcon(type: string): string {
  if (type.includes("CANCEL")) return "event_busy";
  if (type.includes("RESCHEDULED")) return "update";
  if (type.includes("REVIEW")) return "star";
  if (type.includes("REMINDER")) return "alarm";
  if (type.startsWith("BUSINESS_")) return "storefront";
  if (type.includes("NO_SHOW")) return "person_off";
  if (type.includes("COMPLETED")) return "task_alt";
  return "event_available";
}
