"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/controls";
import { Field, Input, SectionLabel, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { Notice, Skeleton } from "@/components/ui/states";
import { ApiError, api, errorMessage } from "@/lib/api";
import { addDays, dayOfMonth, formatRelativeDay, formatTime, localDate, maskPhoneInput } from "@/lib/format";
import { ownerKeys, useOwnerProfessionals, useOwnerServices } from "@/lib/owner-queries";
import { nameSchema, phoneSchema } from "@/lib/schemas";
import type { Availability, OwnerAppointment } from "@/lib/types";

const DAYS_SHOWN = 14;

/** Agendamento de balcão (§5.6): só horários livres; origem = balcão. */
export function CounterModal({
  open,
  preset,
  onClose,
}: {
  open: boolean;
  preset?: { professionalId?: string; date?: string };
  onClose: () => void;
}) {
  // O conteúdo do modal desmonta ao fechar: cada abertura começa do zero.
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Novo agendamento">
      <CounterForm preset={preset} onClose={onClose} />
    </Modal>
  );
}

function CounterForm({
  preset,
  onClose,
}: {
  preset?: { professionalId?: string; date?: string };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const services = useOwnerServices();
  const pros = useOwnerProfessionals();
  const today = localDate();
  const [client, setClient] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [chosenPro, setProfessionalId] = useState<string | null>(preset?.professionalId ?? null);
  const [date, setDate] = useState(preset?.date && preset.date >= today ? preset.date : today);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const visibleServices = useMemo(() => (services.data ?? []).filter((s) => s.visible), [services.data]);
  const service = visibleServices.find((s) => s.id === serviceId) ?? null;
  const eligiblePros = useMemo(
    () => (pros.data ?? []).filter((p) => p.active && (!serviceId || p.serviceIds.includes(serviceId))),
    [pros.data, serviceId],
  );
  // Profissional que não faz o serviço escolhido deixa de valer (derivado, sem efeito).
  const professionalId = chosenPro && eligiblePros.some((p) => p.id === chosenPro) ? chosenPro : null;

  const slots = useQuery({
    queryKey: ["owner", "availability", serviceId, professionalId, date],
    queryFn: () => api<Availability>("/owner/availability", { query: { serviceId, professionalId, date } }),
    enabled: Boolean(serviceId && professionalId),
  });

  const nameOk = nameSchema.safeParse(client);
  const phoneOk = phoneSchema.safeParse(phone);

  const save = useMutation({
    mutationFn: () =>
      api<OwnerAppointment>("/owner/appointments", {
        method: "POST",
        body: {
          clientName: nameOk.data,
          clientPhone: phoneOk.data,
          serviceId,
          professionalId,
          startsAt,
          notes: notes.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast("Agendamento salvo — cliente avisada no WhatsApp");
      void qc.invalidateQueries({ queryKey: ownerKeys.overview });
      void qc.invalidateQueries({ queryKey: ownerKeys.agenda });
      onClose();
    },
    onError: (e) => {
      if (e instanceof ApiError && (e.code === "SLOT_TAKEN" || e.code === "SLOT_UNAVAILABLE")) {
        setStartsAt(null);
        void slots.refetch();
      }
      toast.error(errorMessage(e));
    },
  });

  const submit = () => {
    setTouched(true);
    if (!nameOk.success || !phoneOk.success || !serviceId || !professionalId || !startsAt) return;
    save.mutate();
  };

  const missing = !serviceId
    ? "Escolha o serviço"
    : !professionalId
      ? "Escolha a profissional"
      : !startsAt
        ? "Escolha um horário livre"
        : null;

  return (
    <>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field label="Nome da cliente" error={touched && !nameOk.success ? nameOk.error.issues[0].message : undefined}>
          {(p) => <Input {...p} value={client} onChange={(e) => setClient(e.target.value)} maxLength={80} />}
        </Field>
        <Field label="WhatsApp" error={touched && !phoneOk.success ? phoneOk.error.issues[0].message : undefined}>
          {(p) => (
            <Input
              {...p}
              value={phone}
              onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
              inputMode="tel"
              placeholder="(62) 99999-0000"
            />
          )}
        </Field>
      </div>

      <SectionLabel>Serviço</SectionLabel>
      <div className="-mt-2 flex flex-wrap gap-1.5">
        {services.isPending ? <Skeleton className="h-9 w-full" /> : null}
        {visibleServices.map((s) => (
          <Chip
            key={s.id}
            selected={s.id === serviceId}
            onClick={() => {
              setServiceId(s.id);
              setStartsAt(null);
            }}
          >
            {s.name}
          </Chip>
        ))}
      </div>

      <SectionLabel>Profissional</SectionLabel>
      <div className="-mt-2 flex flex-wrap gap-1.5">
        {eligiblePros.map((p) => (
          <Chip
            key={p.id}
            selected={p.id === professionalId}
            onClick={() => {
              setProfessionalId(p.id);
              setStartsAt(null);
            }}
          >
            {p.name}
          </Chip>
        ))}
        {serviceId && !eligiblePros.length && !pros.isPending ? (
          <Notice className="w-full">Nenhuma profissional ativa faz este serviço.</Notice>
        ) : null}
      </div>

      <SectionLabel>Data</SectionLabel>
      <div className="-mx-1 -mt-2 scrollbar-none flex gap-1.5 overflow-x-auto px-1 pb-1">
        {Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i)).map((d) => (
          <Chip
            key={d}
            selected={d === date}
            onClick={() => {
              setDate(d);
              setStartsAt(null);
            }}
            className="shrink-0"
          >
            {i18nDay(d, today)}
          </Chip>
        ))}
      </div>

      <SectionLabel>Horário livre</SectionLabel>
      <div className="-mt-2 flex flex-wrap gap-1.5">
        {!serviceId || !professionalId ? (
          <span className="text-sm text-muted">Escolha serviço e profissional.</span>
        ) : slots.isPending ? (
          <Skeleton className="h-9 w-full" />
        ) : slots.isError ? (
          <Notice tone="danger" className="w-full">
            {errorMessage(slots.error)}
          </Notice>
        ) : slots.data.slots.length ? (
          slots.data.slots.map((s) => (
            <Chip key={s.startsAt} selected={s.startsAt === startsAt} onClick={() => setStartsAt(s.startsAt)}>
              {formatTime(s.startsAt)}
            </Chip>
          ))
        ) : (
          <Notice className="w-full">Sem horários livres para essa profissional neste dia.</Notice>
        )}
      </div>

      <Field label="Observações (opcional)">
        {(p) => <Textarea {...p} rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </Field>

      {touched && missing ? (
        <p role="alert" className="m-0 text-[13px] text-danger">
          {missing}
        </p>
      ) : null}
      <Button variant="primary" size="lg" onClick={submit} loading={save.isPending}>
        Salvar agendamento{service ? ` · ${service.name}` : ""}
      </Button>
    </>
  );
}

function i18nDay(date: string, today: string): string {
  const rel = formatRelativeDay(date, today);
  return rel === "Hoje" || rel === "Amanhã" ? rel : `${rel.slice(0, 3)} ${dayOfMonth(date)}`;
}
