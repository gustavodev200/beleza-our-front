import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BookingFlow } from "@/components/client/booking-flow";
import { NotFoundError, serverGet } from "@/lib/server-api";
import type { BusinessProfile } from "@/lib/types";

export const metadata: Metadata = { title: "Agendar horário", robots: { index: false } };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Parâmetros do link (chips de horário, "Agendar com…"): inválido vira ausente.
const presetSchema = z.object({
  servico: z.string().uuid().optional().catch(undefined),
  profissional: z.string().uuid().optional().catch(undefined),
  inicio: z.string().datetime({ offset: true }).optional().catch(undefined),
});

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  if (!SLUG.test(slug)) notFound();
  const raw = await searchParams;
  const preset = presetSchema.parse(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])),
  );

  let profile: BusinessProfile;
  try {
    // Sem cache: o agendamento precisa dos serviços e profissionais atuais.
    profile = await serverGet<BusinessProfile>(`/businesses/${slug}`, 0);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  return (
    <BookingFlow
      profile={profile}
      preset={{ serviceId: preset.servico, professionalId: preset.profissional, startsAt: preset.inicio }}
    />
  );
}
