"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { mapsLink } from "@/lib/maps";
import { formatLongDate, formatMoney, formatPhone, formatTime, localDate } from "@/lib/format";
import { uuidSchema } from "@/lib/schemas";
import { RequireRole, useMe } from "@/lib/session";
import type { ClientAppointment } from "@/lib/types";

function icsDate(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Texto seguro para ICS: escapa separadores e remove quebras de linha. */
function icsText(value: string): string {
  return value.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/[\r\n]+/g, " ");
}

function downloadIcs(a: ClientAppointment) {
  const location = [a.business.address, a.business.neighborhood].filter(Boolean).join(" · ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//belezaOur//PT-BR",
    "BEGIN:VEVENT",
    `UID:${a.id}@belezaour`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(a.startsAt)}`,
    `DTEND:${icsDate(a.endsAt)}`,
    `SUMMARY:${icsText(`${a.serviceName} — ${a.business.name}`)}`,
    `LOCATION:${icsText(location)}`,
    `DESCRIPTION:${icsText(`Com ${a.professional.name}. Pagamento no local.`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "agendamento-belezaour.ics";
  link.click();
  URL.revokeObjectURL(url);
}

function Confirmation({ id }: { id: string }) {
  const { data: me } = useMe();
  const q = useQuery({
    queryKey: ["appointments", id],
    queryFn: () => api<ClientAppointment>(`/me/appointments/${id}`),
  });
  if (q.isPending) return <Spinner className="min-h-[50dvh]" />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const a = q.data;
  const pending = a.status === "PENDING";
  const rows: [string, string][] = [
    ["Serviço", a.serviceName],
    ["Onde", a.business.name],
    ["Quando", `${formatLongDate(localDate(a.startsAt))} · ${formatTime(a.startsAt)}`],
    ["Com", a.professional.name],
    ["Valor", formatMoney(a.priceCents)],
  ];
  return (
    <div className="flex flex-col items-center gap-[18px] rounded-3xl border border-line bg-surface p-6 text-center sm:p-8">
      <div className={`grid size-16 place-items-center rounded-full ${pending ? "bg-warn-bg" : "bg-ok-bg"}`}>
        <Icon name={pending ? "hourglass_top" : "check"} size={34} className={pending ? "text-warn" : "text-ok"} />
      </div>
      <div>
        <h1 className="m-0 text-[30px] font-bold sm:text-[34px]">
          {pending ? "Pedido enviado!" : "Horário confirmado!"}
        </h1>
        <p className="mt-2 mb-0 text-sm text-muted">
          {pending
            ? "O estabelecimento vai confirmar seu horário. Você recebe o aviso no WhatsApp."
            : `Enviamos os detalhes para o WhatsApp ${formatPhone(me?.phoneNumber)}.`}
        </p>
      </div>
      <dl className="m-0 flex w-full flex-col gap-2.5 rounded-[14px] bg-bg p-4 text-left text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2.5">
            <dt className="text-muted">{k}</dt>
            <dd className="m-0 text-right font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="grid w-full grid-cols-2 gap-2.5">
        <button type="button" onClick={() => downloadIcs(a)} className={buttonVariants({ variant: "outline" })}>
          Adicionar ao calendário
        </button>
        <a
          href={mapsLink({ ...a.business })}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          Abrir no mapa
        </a>
      </div>
      <Link href="/appointments" className={buttonVariants({ size: "lg", block: true })}>
        Ver meus agendamentos
      </Link>
      <Link href="/" className="text-sm font-semibold text-ink-2">
        Voltar ao início
      </Link>
    </div>
  );
}

export default function ConfirmedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="mx-auto max-w-[540px] px-4 pt-8 sm:pt-12">
      {uuidSchema.safeParse(id).success ? (
        <RequireRole role="CLIENT">
          <Confirmation id={id} />
        </RequireRole>
      ) : (
        <EmptyState icon="event_busy" title="Agendamento não encontrado" />
      )}
    </div>
  );
}
