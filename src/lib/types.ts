/**
 * Tipos das respostas da API (../beleza-our-back). Instantes em ISO UTC,
 * datas de calendário em YYYY-MM-DD (SP), dinheiro em centavos.
 */

export type Role = "CLIENT" | "BUSINESS_OWNER" | "SUPER_ADMIN";
export type BusinessType = "SALON" | "BARBERSHOP" | "STUDIO" | "AUTONOMOUS" | "AESTHETICS";
export type BusinessStatus = "DRAFT" | "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
export type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELED" | "NO_SHOW";
export type AppointmentOrigin = "APP" | "COUNTER";
export type BlockReason = "APPOINTMENT" | "DAY_OFF" | "EXTENDED_LUNCH" | "COURSE" | "BREAK";
export type ReviewTag = "PUNCTUAL" | "ATTENTIVE" | "CLEAN_ENVIRONMENT" | "GREAT_RESULT" | "FAIR_PRICE";
export type OwnerAction = "confirm" | "complete" | "cancel" | "no-show" | "reopen";

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface City {
  id: string;
  name: string;
  state: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface NextSlot {
  startsAt: string;
  serviceId: string;
}

export interface BusinessCard {
  id: string;
  name: string;
  slug: string;
  type: BusinessType;
  neighborhood: string;
  coverUrl: string | null;
  logoUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  minPriceCents: number | null;
  latitude: number | null;
  longitude: number | null;
  isNew: boolean;
  isAutonomous: boolean;
  /** Dentro do expediente de hoje e fora das pausas (fuso SP). */
  openNow: boolean;
  distanceKm: number | null;
  nextSlots: NextSlot[];
}

export interface PublicHours {
  weekday: number;
  opensAt: number;
  closesAt: number;
  /** Pausas em minutos desde 00:00, ordenadas. */
  breaks: { start: number; end: number }[];
}

export interface PublicService {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  category: { id: string; name: string };
  professionalIds: string[];
}

export interface PublicProfessional {
  id: string;
  name: string;
  role: string | null;
  photoUrl: string | null;
}

export interface Review {
  id: string;
  rating: number;
  tags: ReviewTag[];
  comment: string | null;
  createdAt: string;
  clientName: string;
}

export interface BusinessProfile extends Omit<BusinessCard, "nextSlots"> {
  description: string | null;
  whatsapp: string;
  phone: string | null;
  address: string | null;
  city: { name: string; state: string };
  categories: { id: string; name: string; slug: string }[];
  hours: PublicHours[];
  services: PublicService[];
  professionals: PublicProfessional[];
  closedToday: boolean;
  nextSlot: NextSlot | null;
  latestReviews: Review[];
}

export interface Slot {
  startsAt: string;
  professionalIds: string[];
}

export interface Availability {
  date: string;
  slots: Slot[];
}

export interface ClientAppointment {
  id: string;
  status: AppointmentStatus;
  origin: AppointmentOrigin;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  durationMinutes: number;
  serviceName: string;
  notes: string | null;
  cancelledBy: "CLIENT" | "OWNER" | null;
  createdAt: string;
  serviceId: string;
  professional: { id: string; name: string };
  business: {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    neighborhood: string;
    latitude: number | null;
    longitude: number | null;
    whatsapp: string;
  };
  review: { id: string; rating: number } | null;
}

export interface OwnerAppointment {
  id: string;
  status: AppointmentStatus;
  origin: AppointmentOrigin;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  durationMinutes: number;
  serviceName: string;
  notes: string | null;
  cancelledBy: "CLIENT" | "OWNER" | null;
  isNewForOwner: boolean;
  createdAt: string;
  serviceId: string;
  professional: { id: string; name: string };
  client: { id: string; name: string; phoneNumber: string | null };
}

export interface FavoriteBusiness {
  id: string;
  name: string;
  slug: string;
  type: BusinessType;
  neighborhood: string;
  coverUrl: string | null;
  logoUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  minPriceCents: number | null;
  favoritedAt: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface Me {
  id: string;
  name: string;
  email: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  phoneNumberVerified: boolean | null;
  role: Role;
  twoFactorEnabled: boolean | null;
  whatsappConsent: boolean;
  createdAt: string;
  business: { id: string; name: string; slug: string; status: BusinessStatus } | null;
}

export interface OwnerHours {
  weekday: number;
  opensAt: string;
  closesAt: string;
  breaks: { start: string; end: string }[];
}

export interface OwnerBusiness {
  id: string;
  type: BusinessType;
  name: string;
  slug: string;
  description: string | null;
  whatsapp: string;
  phone: string | null;
  city: { id: string; name: string; state: string };
  neighborhood: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  coverUrl: string | null;
  logoUrl: string | null;
  status: BusinessStatus;
  rejectionReason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  requiresConfirmation: boolean;
  ratingAvg: number;
  ratingCount: number;
  categories: { id: string; name: string; slug: string }[];
  hours: OwnerHours[];
}

export interface OwnerService {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  visible: boolean;
  category: { id: string; name: string };
  professionals: { professionalId: string }[];
}

export interface OwnerProfessional {
  id: string;
  name: string;
  role: string | null;
  photoUrl: string | null;
  active: boolean;
  serviceIds: string[];
  appointmentsLast7Days?: number;
}

export interface TimeBlock {
  id: string;
  /** null = pausa do estabelecimento todo (fechado para todas). */
  professionalId: string | null;
  startsAt: string;
  endsAt: string;
  reason: BlockReason;
}

export interface Overview {
  date: string;
  appointmentsToday: number;
  expectedRevenueCents: number;
  awaitingAction: number;
  today: OwnerAppointment[];
  newAndPending: OwnerAppointment[];
}

export interface Agenda {
  from: string;
  to: string;
  appointments: OwnerAppointment[];
  blocks: TimeBlock[];
  professionals: { id: string; name: string; active: boolean }[];
  hours: PublicHours[];
}

export interface BlockResult {
  block: TimeBlock;
  conflicts: {
    id: string;
    startsAt: string;
    endsAt: string;
    serviceName: string;
    client: { name: string };
  }[];
}

export interface AdminDashboard {
  period: { from: string; to: string; today: string };
  kpis: {
    activeBusinesses: number;
    pendingApprovals: number;
    appointments: number;
    bookedVolumeCents: number;
    clients: number;
    noShowRate: number;
  };
  appointmentsByDay: { date: string; count: number }[];
  appointmentsByCategory: { id: string; name: string; count: number }[];
  topBusinesses: { id: string; name: string; slug: string; count: number }[];
  approvalQueue: {
    id: string;
    name: string;
    type: BusinessType;
    neighborhood: string;
    submittedAt: string | null;
  }[];
}

export interface AdminBusinessRow {
  id: string;
  name: string;
  slug: string;
  type: BusinessType;
  neighborhood: string;
  status: BusinessStatus;
  featured: boolean;
  ratingAvg: number;
  ratingCount: number;
  submittedAt: string | null;
  createdAt: string;
  owner: { id: string; name: string; email: string };
}

export interface AdminBusinessDetail {
  id: string;
  name: string;
  slug: string;
  type: BusinessType;
  description: string | null;
  whatsapp: string;
  phone: string | null;
  neighborhood: string;
  address: string | null;
  coverUrl: string | null;
  logoUrl: string | null;
  status: BusinessStatus;
  rejectionReason: string | null;
  submittedAt: string | null;
  featured: boolean;
  ratingAvg: number;
  owner: { id: string; name: string; email: string; emailVerified: boolean; createdAt: string };
  city: { name: string; state: string };
  categories: { id: string; name: string }[];
  hours: PublicHours[];
  services: { id: string; name: string; durationMinutes: number; priceCents: number; visible: boolean }[];
  professionals: { id: string; name: string; role: string | null; active: boolean }[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  role: Role;
  banned: boolean | null;
  banReason: string | null;
  createdAt: string;
  business: { id: string; name: string; status: BusinessStatus } | null;
}

export interface AdminUsersPage extends Page<AdminUser> {
  counts: { all: number; CLIENT: number; BUSINESS_OWNER: number; SUPER_ADMIN: number };
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  visible: boolean;
  sortOrder: number;
  activeBusinesses: number;
  appointmentsLast7Days: number;
}

export interface AdminCity {
  id: string;
  name: string;
  state: string;
  slug: string;
  active: boolean;
  _count: { businesses: number };
}

export interface PlatformSettings {
  cancellationWindowMinutes: 60 | 120 | 360 | 1440;
  remindersEnabled: boolean;
  reviewRequestEnabled: boolean;
  maxActiveProfessionals: number;
  approvalRequired: true;
}
