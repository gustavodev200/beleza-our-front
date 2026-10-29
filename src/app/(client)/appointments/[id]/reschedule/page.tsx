"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
import { BookingFlow } from "@/components/client/booking-flow";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { uuidSchema } from "@/lib/schemas";
import { RequireRole } from "@/lib/session";
import type { BusinessProfile, ClientAppointment } from "@/lib/types";

function Reschedule({ id }: { id: string }) {
  const appt = useQuery({
    queryKey: ["appointments", id],
    queryFn: () => api<ClientAppointment>(`/me/appointments/${id}`),
  });
  const profile = useQuery({
    queryKey: ["profile", appt.data?.business.slug],
    queryFn: () => api<BusinessProfile>(`/businesses/${appt.data!.business.slug}`),
    enabled: Boolean(appt.data),
  });
  if (appt.isError)
    return (
      <div className="mx-auto max-w-xl px-4 pt-10">
        <ErrorState message={errorMessage(appt.error)} onRetry={() => appt.refetch()} />
      </div>
    );
  if (profile.isError)
    return (
      <div className="mx-auto max-w-xl px-4 pt-10">
        <ErrorState message={errorMessage(profile.error)} onRetry={() => profile.refetch()} />
      </div>
    );
  if (!appt.data || !profile.data) return <Spinner className="min-h-[50dvh]" />;
  if (!["PENDING", "CONFIRMED"].includes(appt.data.status) || new Date(appt.data.startsAt) < new Date()) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-10">
        <EmptyState
          icon="event_busy"
          title="Este agendamento não pode mais ser remarcado"
          action={
            <Link href="/appointments" className={buttonVariants({ size: "sm" })}>
              Meus agendamentos
            </Link>
          }
        />
      </div>
    );
  }
  return <BookingFlow profile={profile.data} mode={{ kind: "reschedule", appointment: appt.data }} />;
}

export default function ReschedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  if (!uuidSchema.safeParse(id).success) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-10">
        <EmptyState icon="event_busy" title="Agendamento não encontrado" />
      </div>
    );
  }
  return (
    <RequireRole role="CLIENT">
      <Reschedule id={id} />
    </RequireRole>
  );
}
