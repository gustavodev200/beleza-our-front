"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BusinessImage } from "@/components/ui/business-image";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Notice, Skeleton } from "@/components/ui/states";
import { ApiError, api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  dayOfMonth,
  formatDuration,
  formatLongDate,
  formatMoney,
  formatPhone,
  formatTime,
  localDate,
  maskPhoneInput,
  weekdayOf,
  weekdayShort,
} from "@/lib/format";
import { BUSINESS_TYPE_LABEL } from "@/lib/labels";
import { nameSchema, otpSchema, phoneSchema } from "@/lib/schemas";
import { meKey, useMe } from "@/lib/session";
import { bookingDays, buildTimeCells } from "@/lib/slots";
import type { Availability, BusinessProfile, ClientAppointment } from "@/lib/types";
import { useOtp } from "@/lib/use-otp";

const ANY = "any";

export interface BookingPreset {
  serviceId?: string;
  professionalId?: string;
  startsAt?: string;
}

type Mode = { kind: "new" } | { kind: "reschedule"; appointment: ClientAppointment };

function StepCard({
  n,
  title,
  aside,
  children,
}: {
  n: number;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`passo-${n}`} className="rounded-[18px] border border-line bg-surface p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`passo-${n}`} className="m-0 text-base font-extrabold tracking-normal">
          {n}. {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Choice({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border-[1.5px] px-3.5 py-3 text-left transition-colors",
        selected ? "border-primary bg-primary-tint" : "border-line-strong bg-surface hover:border-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function BookingFlow({
  profile: b,
  preset = {},
  mode = { kind: "new" },
}: {
  profile: BusinessProfile;
  preset?: BookingPreset;
  mode?: Mode;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me, isPending: meLoading } = useMe();
  const otp = useOtp();
  const reschedule = mode.kind === "reschedule" ? mode.appointment : null;

  const initialService = b.services.find((s) => s.id === (preset.serviceId ?? reschedule?.serviceId)) ?? null;
  const [serviceId, setServiceId] = useState<string | null>(
    initialService?.id ?? (b.services.length === 1 ? b.services[0].id : null),
  );
  const [chosenPro, setProfessionalId] = useState<string>(
    preset.professionalId && b.professionals.some((p) => p.id === preset.professionalId) ? preset.professionalId : ANY,
  );
  const days = useMemo(() => bookingDays(b.hours), [b.hours]);
  const presetDate = preset.startsAt ? localDate(preset.startsAt) : null;
  const [date, setDate] = useState<string>(
    presetDate && days.some((d) => d.date === presetDate && !d.closed)
      ? presetDate
      : (days.find((d) => !d.closed)?.date ?? days[0].date),
  );
  const [startsAt, setStartsAt] = useState<string | null>(preset.startsAt ?? null);
  const [nameInput, setName] = useState<string | null>(null);
  const [phoneInput, setPhone] = useState("");
  const [consentInput, setConsent] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [slotTaken, setSlotTaken] = useState(false);

  const isClient = me?.role === "CLIENT";
  const otherRole = me && !isClient;
  // Cliente logada: nome, telefone e consentimento vêm da conta até ela editar.
  const name = nameInput ?? (isClient && me.name !== "Cliente" ? me.name : "");
  const phone = isClient && me.phoneNumber ? formatPhone(me.phoneNumber) : phoneInput;
  const consent = consentInput ?? Boolean(isClient && me.whatsappConsent);

  const service = b.services.find((s) => s.id === serviceId) ?? null;
  const pros = useMemo(
    () => (service ? b.professionals.filter((p) => service.professionalIds.includes(p.id)) : b.professionals),
    [b.professionals, service],
  );
  // Profissional escolhida que não faz o serviço vale como "Sem preferência".
  const professionalId = chosenPro !== ANY && service && !service.professionalIds.includes(chosenPro) ? ANY : chosenPro;

  const availability = useQuery({
    queryKey: ["availability", b.slug, serviceId, date, professionalId],
    queryFn: () =>
      api<Availability>(`/businesses/${b.slug}/availability`, {
        query: { serviceId, date, professionalId: professionalId === ANY ? undefined : professionalId },
      }),
    enabled: Boolean(serviceId),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });

  const hoursOfDay = b.hours.find((h) => h.weekday === weekdayOf(date));
  const cells = useMemo(
    () =>
      service && availability.data
        ? buildTimeCells(date, hoursOfDay, service.durationMinutes, availability.data.slots)
        : [],
    [service, availability.data, date, hoursOfDay],
  );
  const selectedSlot = availability.data?.slots.find((s) => s.startsAt === startsAt) ?? null;

  // Horário escolhido sumiu da lista (reservado por outra pessoa): deixa de valer e avisa.
  const lostSlot = Boolean(
    startsAt && availability.data && !availability.isFetching && !selectedSlot && localDate(startsAt) === date,
  );

  const nameResult = nameSchema.safeParse(name);
  const phoneResult = phoneSchema.safeParse(phone);
  const needsOtp = !reschedule && !isClient;
  const otpForThisPhone = phoneResult.success && otp.sentTo === phoneResult.data;

  const missing = !service
    ? "Escolha o serviço"
    : !selectedSlot
      ? "Escolha um horário livre"
      : reschedule
        ? null
        : !nameResult.success
          ? "Informe seu nome"
          : !phoneResult.success
            ? "Informe um WhatsApp válido"
            : !consent
              ? "Autorize as mensagens no WhatsApp"
              : needsOtp && !otpForThisPhone
                ? "Confirme seu WhatsApp com o código"
                : needsOtp && !otpSchema.safeParse(code).success
                  ? "Digite o código de 4 números"
                  : null;

  const onSlotError = (e: unknown) => {
    if (e instanceof ApiError && (e.code === "SLOT_TAKEN" || e.code === "SLOT_UNAVAILABLE")) {
      setStartsAt(null);
      setSlotTaken(true);
      void qc.invalidateQueries({ queryKey: ["availability", b.slug] });
      toast.error("Esse horário acabou de ser reservado. Escolha outro.");
      document.getElementById("passo-4")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (e instanceof ApiError && e.code === "PHONE_NOT_VERIFIED") {
      otp.reset();
      toast.error("Confirme seu WhatsApp para agendar.");
      return;
    }
    toast.error(errorMessage(e));
  };

  const book = useMutation({
    mutationFn: async () => {
      if (needsOtp) {
        const ok = await otp.verify(code);
        if (!ok) throw new Error("otp");
        await qc.invalidateQueries({ queryKey: meKey });
      }
      return api<ClientAppointment>("/appointments", {
        method: "POST",
        body: {
          businessId: b.id,
          serviceId,
          professionalId: professionalId === ANY ? null : professionalId,
          startsAt,
          clientName: nameResult.data,
          whatsappConsent: true,
        },
      });
    },
    onSuccess: (appt) => {
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      router.push(`/agendamentos/${appt.id}/confirmado`);
    },
    onError: (e) => {
      if (e instanceof Error && e.message === "otp") return; // erro já exibido no campo do código
      onSlotError(e);
    },
  });

  const move = useMutation({
    mutationFn: () =>
      api<ClientAppointment>(`/me/appointments/${reschedule!.id}/reschedule`, {
        method: "PATCH",
        body: { startsAt, professionalId: professionalId === ANY ? null : professionalId },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      toast("Horário remarcado — o estabelecimento foi avisado");
      router.push("/agendamentos");
    },
    onError: onSlotError,
  });

  const pending = book.isPending || move.isPending || otp.verifying;
  const submit = () => {
    setTouched(true);
    if (missing || pending) return;
    if (reschedule) move.mutate();
    else book.mutate();
  };

  const sendCode = async () => {
    setTouched(true);
    if (!phoneResult.success) return;
    const ok = await otp.send(phoneResult.data);
    if (ok) {
      toast(`Código enviado para ${formatPhone(phoneResult.data)}`);
      setTimeout(() => document.getElementById("otp")?.focus(), 50);
    }
  };

  const proName =
    professionalId === ANY ? "Sem preferência" : (b.professionals.find((p) => p.id === professionalId)?.name ?? "—");
  const summary: [string, string][] = [
    ["Serviço", service?.name ?? "—"],
    ["Profissional", proName],
    ["Data", formatLongDate(date).replace(/^(\S+)-feira/, "$1")],
    ["Horário", selectedSlot ? formatTime(selectedSlot.startsAt) : "—"],
    ["Duração", service ? formatDuration(service.durationMinutes) : "—"],
  ];
  const ctaLabel = reschedule ? "Confirmar novo horário" : "Confirmar agendamento";

  return (
    <div className="mx-auto max-w-[1120px] px-4 pt-4 pb-40 sm:px-6 md:pt-5 md:pb-0">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-ink-2"
      >
        <Icon name="arrow_back" size={18} />
        Voltar
      </button>
      <h1 className="mt-2 mb-1 text-[30px] font-bold sm:text-[40px]">
        {reschedule ? "Remarcar horário" : "Agendar horário"}
      </h1>
      <Link href={`/${b.slug}`} className="text-sm text-muted hover:text-ink">
        {b.name}
        {b.address ? ` · ${b.address}` : ` · ${b.neighborhood}`}
      </Link>
      {reschedule ? (
        <Notice tone="info" className="mt-3">
          Horário atual: {formatLongDate(localDate(reschedule.startsAt))} às {formatTime(reschedule.startsAt)}. Escolha
          o novo horário abaixo.
        </Notice>
      ) : null}

      <div className="mt-5 flex flex-wrap items-start gap-7">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <StepCard n={1} title="Serviço">
            {b.services.length ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2.5">
                {b.services.map((s) => {
                  const on = s.id === serviceId;
                  return (
                    <Choice
                      key={s.id}
                      selected={on}
                      onClick={() => {
                        setServiceId(s.id);
                        setStartsAt(null);
                        setSlotTaken(false);
                      }}
                    >
                      <span
                        className={cn(
                          "size-[18px] shrink-0 rounded-full border-2 shadow-[inset_0_0_0_3px_#fff]",
                          on ? "border-primary bg-primary" : "border-[#c5cdd1] bg-white",
                        )}
                      />
                      <span className="flex-1">
                        <span className="block text-sm font-bold">{s.name}</span>
                        <span className="mt-0.5 block text-xs text-muted">{formatDuration(s.durationMinutes)}</span>
                      </span>
                      <b className="text-sm">{formatMoney(s.priceCents)}</b>
                    </Choice>
                  );
                })}
              </div>
            ) : (
              <Notice>Este estabelecimento ainda não tem serviços disponíveis.</Notice>
            )}
          </StepCard>

          <StepCard n={2} title="Profissional">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
              {[{ id: ANY, name: "Sem preferência", role: "Primeiro horário livre" }, ...pros].map((p) => (
                <Choice
                  key={p.id}
                  selected={professionalId === p.id}
                  onClick={() => {
                    setProfessionalId(p.id);
                    setStartsAt(null);
                  }}
                  className="py-2.5"
                >
                  {p.id === ANY ? (
                    <span className="grid size-[38px] shrink-0 place-items-center rounded-full bg-primary-soft text-primary-strong">
                      <Icon name="groups" size={20} />
                    </span>
                  ) : (
                    <Avatar name={p.name} size={38} />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{p.name}</span>
                    {p.role ? <span className="block truncate text-xs text-muted">{p.role}</span> : null}
                  </span>
                </Choice>
              ))}
            </div>
          </StepCard>

          <StepCard n={3} title="Data">
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {days.map((d) => {
                const on = d.date === date;
                return (
                  <button
                    key={d.date}
                    type="button"
                    disabled={d.closed}
                    aria-pressed={on}
                    aria-label={`${formatLongDate(d.date)}${d.closed ? " — fechado" : ""}`}
                    onClick={() => {
                      setDate(d.date);
                      setStartsAt(null);
                      setSlotTaken(false);
                    }}
                    className={cn(
                      "flex min-h-[68px] flex-col items-center justify-center gap-0.5 rounded-xl border-[1.5px] px-0.5 py-2",
                      on ? "border-ink bg-ink text-white" : "border-line-strong bg-surface",
                      d.closed && "cursor-not-allowed border-line bg-bg text-subtle",
                    )}
                  >
                    <span className="text-[11px] font-semibold sm:text-xs">{weekdayShort(d.date)}</span>
                    <span className="text-lg font-extrabold sm:text-xl">{dayOfMonth(d.date)}</span>
                    <span className="text-[10px] opacity-75 sm:text-[11px]">
                      {d.closed ? "Fechado" : d.date === localDate() ? "Hoje" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </StepCard>

          <StepCard
            n={4}
            title="Horário"
            aside={<span className="text-xs text-muted">Riscados já estão reservados</span>}
          >
            {slotTaken || (touched && lostSlot) ? (
              <Notice tone="danger" className="mb-3">
                Esse horário acabou de ser reservado por outra pessoa. A lista foi atualizada — escolha outro.
              </Notice>
            ) : null}
            {!service ? (
              <p className="m-0 text-sm text-muted">Escolha o serviço para ver os horários.</p>
            ) : availability.isPending ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2">
                {Array.from({ length: 12 }, (_, i) => (
                  <Skeleton key={i} className="h-11 rounded-[10px]" />
                ))}
              </div>
            ) : availability.isError ? (
              <Notice tone="danger">
                {errorMessage(availability.error)}{" "}
                <button type="button" className="font-bold underline" onClick={() => availability.refetch()}>
                  Tentar novamente
                </button>
              </Notice>
            ) : cells.some((c) => c.slot) ? (
              <div
                className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2"
                role="group"
                aria-label="Horários"
              >
                {cells.map((c) => {
                  const on = c.slot !== null && c.slot.startsAt === startsAt;
                  return (
                    <button
                      key={c.time}
                      type="button"
                      disabled={!c.slot}
                      aria-pressed={on}
                      aria-label={c.slot ? `${c.time} livre` : `${c.time} ocupado`}
                      onClick={() => {
                        if (!c.slot) return;
                        setStartsAt(c.slot.startsAt);
                        setSlotTaken(false);
                      }}
                      className={cn(
                        "min-h-11 rounded-[10px] border-[1.5px] text-sm font-bold",
                        on
                          ? "border-ink bg-ink text-white"
                          : c.slot
                            ? "border-line-strong bg-surface hover:border-ink"
                            : "cursor-not-allowed border-line bg-bg text-[#b4bcc0] line-through",
                      )}
                    >
                      {c.time}
                    </button>
                  );
                })}
              </div>
            ) : (
              <Notice>Sem horários livres neste dia. Tente outra data ou outra profissional.</Notice>
            )}
          </StepCard>

          {reschedule ? null : (
            <StepCard n={5} title="Seus dados">
              {otherRole ? (
                <Notice className="mb-3">
                  Você está logado como profissional/admin. Para agendar, saia e entre com o WhatsApp da cliente.
                </Notice>
              ) : null}
              <p className="mt-0 mb-3.5 text-[13px] text-muted">
                Sem cadastro e sem senha — confirmamos seu WhatsApp com um código e a confirmação chega por lá.
              </p>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
                <Field
                  label="Nome"
                  error={touched && !nameResult.success ? nameResult.error.issues[0].message : undefined}
                >
                  {(p) => (
                    <Input
                      {...p}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      maxLength={80}
                    />
                  )}
                </Field>
                <Field
                  label="WhatsApp"
                  error={touched && !phoneResult.success ? phoneResult.error.issues[0].message : undefined}
                  hint={isClient ? "Número da sua conta" : undefined}
                >
                  {(p) => (
                    <Input
                      {...p}
                      value={phone}
                      onChange={(e) => {
                        setPhone(maskPhoneInput(e.target.value));
                        if (otp.sentTo) otp.reset();
                      }}
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="(62) 99999-0000"
                      readOnly={isClient}
                    />
                  )}
                </Field>
              </div>
              <label className="mt-3.5 flex min-h-11 cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-ink-2">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-[oklch(0.5_0.09_210)]"
                />
                Autorizo receber a confirmação, lembretes e avisos deste agendamento pelo WhatsApp.
              </label>

              {needsOtp && !meLoading ? (
                <div className="mt-3 flex flex-col gap-2.5 rounded-xl bg-bg p-3.5">
                  {!otpForThisPhone ? (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="min-w-[180px] flex-1 text-[13px] text-ink-2">
                        Enviaremos um código de 4 números para confirmar seu WhatsApp.
                      </span>
                      <Button
                        variant="outline-ink"
                        size="sm"
                        onClick={sendCode}
                        loading={otp.sending}
                        disabled={!phoneResult.success}
                      >
                        Receber código
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Field label={`Código enviado para ${formatPhone(otp.sentTo)}`} error={otp.error ?? undefined}>
                        {(p) => (
                          <Input
                            {...p}
                            id="otp"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="0000"
                            className="max-w-[180px] text-center text-2xl tracking-[.5em]"
                          />
                        )}
                      </Field>
                      <button
                        type="button"
                        disabled={otp.cooldown > 0 || otp.sending}
                        onClick={sendCode}
                        className="self-start text-[13px] font-semibold text-primary-strong disabled:text-muted"
                      >
                        {otp.cooldown > 0 ? `Reenviar código em ${otp.cooldown}s` : "Reenviar código"}
                      </button>
                    </>
                  )}
                  {!otpForThisPhone && otp.error ? (
                    <p role="alert" className="m-0 text-[13px] text-danger">
                      {otp.error}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </StepCard>
          )}
        </div>

        <aside className="hidden flex-[1_1_300px] flex-col gap-3 rounded-[18px] border border-line bg-surface p-[22px] md:sticky md:top-24 md:flex">
          <div className="flex items-center gap-3 border-b border-line-soft pb-3">
            <BusinessImage
              src={b.logoUrl ?? b.coverUrl}
              seed={b.name}
              alt=""
              kind="logo"
              className="size-11 shrink-0 rounded-[10px]"
            />
            <div className="min-w-0">
              <div className="truncate font-bold">{b.name}</div>
              <div className="text-xs text-muted">{BUSINESS_TYPE_LABEL[b.type]}</div>
            </div>
          </div>
          {summary.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 text-sm">
              <span className="text-muted">{k}</span>
              <b className="text-right">{v}</b>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-line-soft pt-3 text-[17px]">
            <b>Total</b>
            <b>{service ? formatMoney(service.priceCents) : "—"}</b>
          </div>
          <div className="text-xs text-muted">Pagamento no local.</div>
          <Button
            size="lg"
            onClick={submit}
            loading={pending}
            aria-disabled={Boolean(missing) || otherRole || undefined}
            disabled={Boolean(otherRole)}
          >
            {ctaLabel}
          </Button>
          <div
            className={cn("text-center text-[13px]", touched && missing ? "text-danger" : "text-muted")}
            aria-live="polite"
          >
            {missing ?? "Tudo certo!"}
          </div>
        </aside>
      </div>

      {/* Resumo fixo no mobile */}
      <div className="fixed inset-x-0 bottom-[68px] z-30 border-t border-line bg-white px-4 py-3 md:hidden">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0 truncate text-muted">
            {service
              ? `${service.name}${selectedSlot ? ` · ${weekdayShort(date)} ${formatTime(selectedSlot.startsAt)}` : ""}`
              : "Escolha o serviço"}
          </span>
          <b>{service ? formatMoney(service.priceCents) : ""}</b>
        </div>
        <Button
          block
          size="lg"
          onClick={submit}
          loading={pending}
          aria-disabled={Boolean(missing) || undefined}
          disabled={Boolean(otherRole)}
        >
          {ctaLabel}
        </Button>
        <div
          className={cn("mt-1 text-center text-xs", touched && missing ? "text-danger" : "text-muted")}
          aria-live="polite"
        >
          {missing ?? "Pagamento no local"}
        </div>
      </div>
    </div>
  );
}
