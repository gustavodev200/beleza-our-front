"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { HoursEditor, hoursToRows, rowsToPayload, type DayRow } from "@/components/owner/hours-editor";
import { BusinessImagesEditor } from "@/components/owner/image-upload";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/controls";
import { Field, Input, Select } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Notice, Spinner } from "@/components/ui/states";
import { ApiError, api, errorMessage } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { formatDuration, formatMoney, formatPhone, maskCpfCnpjInput, maskPhoneInput, parseMoneyToCents } from "@/lib/format";
import { BUSINESS_TYPES, SERVICE_SUGGESTIONS } from "@/lib/labels";
import {
  ownerKeys,
  slugPreview,
  useCategories,
  useCities,
  useOwnerBusiness,
  useOwnerProfessionals,
  useOwnerServices,
} from "@/lib/owner-queries";
import { businessDataSchema, ownerSignUpSchema } from "@/lib/schemas";
import { meKey, useMe, useSignOut } from "@/lib/session";
import { publicLinkLabel } from "@/lib/site";
import type { BusinessType, OwnerBusiness, OwnerProfessional, OwnerService } from "@/lib/types";
import { authErrorMessage } from "@/lib/use-otp";

const STEPS = ["Conta", "Tipo", "Dados", "Serviços", "Horários", "Capa e logo"];

function Progress({ step }: { step: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-xs font-semibold text-muted">
        <span>
          Passo {step + 1} de {STEPS.length} · {STEPS[step]}
        </span>
        <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
      </div>
      <div className="grid grid-cols-6 gap-1.5" aria-hidden>
        {STEPS.map((s, i) => (
          <span key={s} className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-line")} />
        ))}
      </div>
    </div>
  );
}

function StepTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h1 className="m-0 text-[28px] leading-tight font-bold sm:text-[34px]">{title}</h1>
      {sub ? <p className="mt-1.5 mb-0 text-sm text-muted">{sub}</p> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- passo 1 */

function AccountStep() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<typeof ownerSignUpSchema>, unknown, z.output<typeof ownerSignUpSchema>>({
    resolver: zodResolver(ownerSignUpSchema),
    defaultValues: { name: "", email: "", cpfCnpj: "", password: "", acceptedTerms: false },
  });

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    const { error: err } = await authClient.signUp.email({
      name: v.name,
      email: v.email,
      password: v.password,
      cpfCnpj: v.cpfCnpj,
      // Não é campo do usuário: o hook da API exige e transforma em termsAcceptedAt/termsVersion.
      ...({ acceptedTerms: v.acceptedTerms } as object),
      callbackURL: `${window.location.origin}/dashboard/sign-up`,
    });
    if (err) {
      setError(
        err.status === 422 || err.code === "USER_ALREADY_EXISTS" || err.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
          ? "Já existe uma conta com este e-mail. Entre no painel."
          : authErrorMessage(err, "Não foi possível criar a conta."),
      );
      return;
    }
    setSentTo(v.email);
  });

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid size-14 place-items-center rounded-full bg-primary-soft">
          <Icon name="mark_email_unread" size={30} className="text-primary-strong" />
        </div>
        <StepTitle
          title="Confirme seu e-mail"
          sub={`Enviamos um link para ${sentTo}. Ao clicar, você volta para cá já logado e continua o cadastro.`}
        />
        <Notice tone="info">Não chegou? Confira o spam ou peça outro link pela tela de login.</Notice>
        <Link href="/dashboard/sign-in" className="text-sm font-semibold text-primary-strong">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <StepTitle
        title="Crie sua conta de dono"
        sub="É com ela que você entra no painel. Depois cadastramos o seu estabelecimento."
      />
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Field label="Nome completo" error={form.formState.errors.name?.message}>
        {(p) => <Input {...p} autoComplete="name" {...form.register("name")} />}
      </Field>
      <Field label="E-mail" error={form.formState.errors.email?.message}>
        {(p) => <Input {...p} type="email" autoComplete="email" {...form.register("email")} />}
      </Field>
      <Field
        label="CPF ou CNPJ"
        error={form.formState.errors.cpfCnpj?.message}
        hint="Necessário para receber pagamentos pelo Asaas"
      >
        {(p) => (
          <Input
            {...p}
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            {...form.register("cpfCnpj", {
              onChange: (e) => form.setValue("cpfCnpj", maskCpfCnpjInput(e.target.value)),
            })}
          />
        )}
      </Field>
      <Field label="Senha" error={form.formState.errors.password?.message} hint="Mínimo de 8 caracteres">
        {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register("password")} />}
      </Field>
      <div className="flex flex-col gap-1.5">
        <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-ink-2">
          <input
            type="checkbox"
            aria-invalid={Boolean(form.formState.errors.acceptedTerms)}
            className="mt-0.5 size-5 shrink-0 accent-[oklch(0.5_0.09_210)]"
            {...form.register("acceptedTerms")}
          />
          <span>
            Li e concordo com os{" "}
            <Link href="/termos" target="_blank" className="font-bold text-ink underline">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" target="_blank" className="font-bold text-ink underline">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>
        {form.formState.errors.acceptedTerms ? (
          <p role="alert" className="text-[13px] font-medium text-danger">
            {form.formState.errors.acceptedTerms.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
        Criar conta
      </Button>
      <p className="m-0 text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/dashboard/sign-in" className="font-bold text-ink">
          Entrar
        </Link>
      </p>
    </form>
  );
}

/* ------------------------------------------------------------ passos 2–6 */

interface Draft {
  type: BusinessType | null;
  name: string;
  whatsapp: string;
  neighborhood: string;
  cityId: string;
  address: string;
  /** null = o dono ainda não mexeu: valem as categorias sugeridas pelo tipo. */
  categoryIds: string[] | null;
}

interface SuggestionRow {
  key: string;
  name: string;
  durationMinutes: number;
  price: string;
  categorySlug: string;
  selected: boolean;
}

function BusinessWizard({ business, ownerName }: { business: OwnerBusiness | null; ownerName: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const categories = useCategories();
  const cities = useCities();
  const services = useOwnerServices(Boolean(business));
  const pros = useOwnerProfessionals(Boolean(business));
  const [step, setStep] = useState(business ? 3 : 1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Draft>({
    type: business?.type ?? null,
    name: business?.name ?? "",
    whatsapp: business ? formatPhone(business.whatsapp) : "",
    neighborhood: business?.neighborhood ?? "",
    cityId: business?.city.id ?? "",
    address: business?.address ?? "",
    categoryIds: business ? business.categories.map((c) => c.id) : null,
  });
  const [rows, setRows] = useState<DayRow[]>(() => hoursToRows(business?.hours ?? []));
  const [hourErrors, setHourErrors] = useState<Record<number, string>>({});
  const [edits, setEdits] = useState<Record<string, Partial<Pick<SuggestionRow, "price" | "selected">>>>({});
  const [proName, setProName] = useState(ownerName);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Cidade padrão: a de lançamento (primeira ativa).
  const cityId = draft.cityId || cities.data?.[0]?.id || "";

  // Sugestões por tipo; as já cadastradas não aparecem de novo. Edições do dono por cima.
  const baseSuggestions = useMemo<SuggestionRow[]>(() => {
    if (!draft.type) return [];
    const existing = new Set((services.data ?? []).map((sv) => sv.name.toLowerCase()));
    return SERVICE_SUGGESTIONS[draft.type]
      .filter(([n]) => !existing.has(n.toLowerCase()))
      .map(([n, dur, cents, slug], i) => ({
        key: draft.type + "-" + i,
        name: n,
        durationMinutes: dur,
        price: (cents / 100).toFixed(2).replace(".", ","),
        categorySlug: slug,
        selected: i < 3,
      }));
  }, [draft.type, services.data]);
  const suggestions = baseSuggestions.map((sg) => ({ ...sg, ...edits[sg.key] }));
  const editSuggestion = (key: string, patch: Partial<Pick<SuggestionRow, "price" | "selected">>) =>
    setEdits((e) => ({ ...e, [key]: { ...e[key], ...patch } }));

  // Categorias sugeridas pelo tipo enquanto o dono não escolhe.
  const defaultCategoryIds = useMemo(() => {
    if (!draft.type || !categories.data) return [];
    const slugs = new Set(SERVICE_SUGGESTIONS[draft.type].map(([, , , sl]) => sl));
    return categories.data.filter((c) => slugs.has(c.slug)).map((c) => c.id);
  }, [draft.type, categories.data]);
  const categoryIds = draft.categoryIds ?? defaultCategoryIds;

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const saveBusiness = async () => {
    const parsed = businessDataSchema.safeParse({
      name: draft.name,
      whatsapp: draft.whatsapp,
      neighborhood: draft.neighborhood,
      cityId,
      address: draft.address.trim() || undefined,
    });
    const errs: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
    if (!categoryIds.length) errs.categoryIds = "Escolha ao menos uma categoria";
    setErrors(errs);
    if (!parsed.success || errs.categoryIds) return false;
    const body = { ...parsed.data, type: draft.type, categoryIds };
    const saved = business
      ? await api<OwnerBusiness>("/owner/business", { method: "PATCH", body })
      : await api<OwnerBusiness>("/owner/business", { method: "POST", body });
    qc.setQueryData(ownerKeys.business, saved);
    void qc.invalidateQueries({ queryKey: meKey });
    return true;
  };

  const saveServices = async () => {
    const chosen = suggestions.filter((s) => s.selected);
    const existing = services.data ?? [];
    if (!chosen.length && !existing.length) {
      setErrors({ services: "Escolha ao menos um serviço" });
      return false;
    }
    if (!proName.trim() || proName.trim().length < 2) {
      setErrors({ proName: "Informe quem atende" });
      return false;
    }
    const cats = categories.data ?? [];
    const created: OwnerService[] = [];
    for (const s of chosen) {
      const cents = parseMoneyToCents(s.price);
      const categoryId = cats.find((c) => c.slug === s.categorySlug)?.id ?? categoryIds[0];
      if (cents === null || !categoryId) {
        setErrors({ services: `Preço inválido em ${s.name}` });
        return false;
      }
      created.push(
        await api<OwnerService>("/owner/services", {
          method: "POST",
          body: {
            name: s.name.trim(),
            categoryId,
            durationMinutes: s.durationMinutes,
            priceCents: cents,
            visible: true,
          },
        }),
      );
    }
    // O envio exige um serviço com profissional ativa: o próprio dono atende por padrão.
    const allIds = [...existing.map((s) => s.id), ...created.map((s) => s.id)];
    const current: OwnerProfessional[] = pros.data ?? [];
    const active = current.find((p) => p.active);
    if (active) {
      await api(`/owner/professionals/${active.id}`, {
        method: "PATCH",
        body: { serviceIds: Array.from(new Set([...active.serviceIds, ...allIds])) },
      });
    } else {
      await api("/owner/professionals", {
        method: "POST",
        body: { name: proName.trim(), serviceIds: allIds, active: true },
      });
    }
    void qc.invalidateQueries({ queryKey: ownerKeys.services });
    void qc.invalidateQueries({ queryKey: ownerKeys.professionals });
    return true;
  };

  const saveHours = async () => {
    const { days, errors: errs, valid } = rowsToPayload(rows);
    setHourErrors(errs);
    if (!valid) {
      if (!days.length) toast.error("Selecione ao menos um dia de atendimento.");
      return false;
    }
    const saved = await api<OwnerBusiness>("/owner/business/hours", { method: "PUT", body: { days } });
    qc.setQueryData(ownerKeys.business, saved);
    return true;
  };

  const next = async () => {
    setSaving(true);
    try {
      let ok = true;
      if (step === 1) {
        ok = Boolean(draft.type);
        if (!ok) setErrors({ type: "Escolha como você atende" });
      } else if (step === 2) ok = await saveBusiness();
      else if (step === 3) ok = await saveServices();
      else if (step === 4) ok = await saveHours();
      if (ok) {
        setErrors({});
        setStep((s) => s + 1);
        window.scrollTo({ top: 0 });
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    setSubmitError(null);
    try {
      await api("/owner/business/submit", { method: "POST" });
      await qc.invalidateQueries({ queryKey: ownerKeys.business });
      await qc.invalidateQueries({ queryKey: meKey });
      toast("Enviado para aprovação!");
      router.replace("/dashboard/status");
    } catch (e) {
      if (e instanceof ApiError && e.code === "BUSINESS_INCOMPLETE") setSubmitError(e.message);
      else toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const city = cities.data?.find((c) => c.id === cityId);
  const existingServices = services.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <Progress step={step} />

      {step === 1 ? (
        <>
          <StepTitle
            title="Como você atende?"
            sub="Do salão completo à profissional que atende em casa — todo mundo cabe aqui."
          />
          <div className="grid gap-2.5" role="radiogroup" aria-label="Tipo de estabelecimento">
            {BUSINESS_TYPES.map((t) => {
              const on = draft.type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set({ type: t.id })}
                  className={cn(
                    "flex min-h-16 items-center gap-3.5 rounded-[14px] border-[1.5px] px-4 py-3 text-left",
                    on ? "border-primary bg-primary-tint" : "border-line-strong bg-surface hover:border-ink",
                  )}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-strong">
                    <Icon name={t.icon} size={24} />
                  </span>
                  <span>
                    <span className="block font-bold">{t.label}</span>
                    <span className="block text-[13px] text-muted">{t.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {errors.type ? (
            <p role="alert" className="m-0 text-[13px] text-danger">
              {errors.type}
            </p>
          ) : null}
        </>
      ) : null}

      {step === 2 ? (
        <>
          <StepTitle title="Seu estabelecimento" sub="Esses dados aparecem no seu perfil público." />
          <Field label="Nome que aparece para as clientes" error={errors.name}>
            {(p) => <Input {...p} value={draft.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} />}
          </Field>
          <div className="-mt-2 flex items-center gap-1.5 text-[13px] text-muted">
            <Icon name="link" size={16} />
            {publicLinkLabel(slugPreview(draft.name))}
          </div>
          <Field label="WhatsApp do negócio" error={errors.whatsapp}>
            {(p) => (
              <Input
                {...p}
                value={draft.whatsapp}
                onChange={(e) => set({ whatsapp: maskPhoneInput(e.target.value) })}
                inputMode="tel"
                placeholder="(62) 99999-0000"
              />
            )}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cidade" error={errors.cityId}>
              {(p) => (
                <Select {...p} value={cityId} onChange={(e) => set({ cityId: e.target.value })}>
                  {(cities.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.state}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Bairro" error={errors.neighborhood}>
              {(p) => (
                <Input
                  {...p}
                  value={draft.neighborhood}
                  onChange={(e) => set({ neighborhood: e.target.value })}
                  maxLength={60}
                  placeholder="Ex.: Setor Bueno"
                />
              )}
            </Field>
          </div>
          <Field
            label="Endereço (opcional)"
            hint={draft.type === "AUTONOMOUS" ? "Atende em domicílio? Pode deixar em branco." : undefined}
          >
            {(p) => (
              <Input
                {...p}
                value={draft.address}
                onChange={(e) => set({ address: e.target.value })}
                maxLength={160}
                placeholder="Rua, número"
              />
            )}
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold">Categorias</span>
            <div className="flex flex-wrap gap-1.5">
              {(categories.data ?? []).map((c) => {
                const on = categoryIds.includes(c.id);
                return (
                  <Chip
                    key={c.id}
                    selected={on}
                    onClick={() =>
                      set({ categoryIds: on ? categoryIds.filter((x) => x !== c.id) : [...categoryIds, c.id] })
                    }
                  >
                    <Icon name={c.icon} size={16} />
                    {c.name}
                  </Chip>
                );
              })}
            </div>
            {errors.categoryIds ? (
              <p role="alert" className="m-0 text-[13px] text-danger">
                {errors.categoryIds}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <StepTitle title="Seus serviços" sub="Sugestões para começar — preços e duração são ajustáveis no painel." />
          {existingServices.length ? (
            <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-3.5">
              <div className="text-xs font-bold tracking-[.06em] text-muted uppercase">Já cadastrados</div>
              {existingServices.map((s) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="text-muted">
                    {formatDuration(s.durationMinutes)} · {formatMoney(s.priceCents)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            {suggestions.map((s) => (
              <div
                key={s.key}
                className={cn(
                  "flex flex-wrap items-center gap-2.5 rounded-[14px] border-[1.5px] p-3",
                  s.selected ? "border-primary bg-primary-tint" : "border-line-strong bg-surface",
                )}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={s.selected}
                  aria-label={`Incluir ${s.name}`}
                  onClick={() => editSuggestion(s.key, { selected: !s.selected })}
                  className="grid size-10 place-items-center"
                >
                  <Icon
                    name={s.selected ? "check_box" : "check_box_outline_blank"}
                    size={24}
                    className={s.selected ? "text-primary" : "text-muted"}
                  />
                </button>
                <span className="min-w-[120px] flex-1 font-semibold">{s.name}</span>
                <span className="text-[13px] text-muted">{formatDuration(s.durationMinutes)}</span>
                <label className="flex items-center gap-1 text-[13px] text-muted">
                  R$
                  <input
                    value={s.price}
                    onChange={(e) => editSuggestion(s.key, { price: e.target.value.replace(/[^\d,]/g, "") })}
                    inputMode="decimal"
                    aria-label={`Preço de ${s.name}`}
                    className="min-h-9 w-20 rounded-lg border border-line-strong bg-white px-2 text-base text-ink sm:text-sm"
                  />
                </label>
              </div>
            ))}
          </div>
          {errors.services ? (
            <p role="alert" className="m-0 text-[13px] text-danger">
              {errors.services}
            </p>
          ) : null}
          {(pros.data ?? []).some((p) => p.active) ? null : (
            <Field
              label="Quem atende?"
              error={errors.proName}
              hint="Você pode adicionar outras profissionais depois, no painel."
            >
              {(p) => <Input {...p} value={proName} onChange={(e) => setProName(e.target.value)} maxLength={80} />}
            </Field>
          )}
        </>
      ) : null}

      {step === 4 ? (
        <>
          <StepTitle title="Quando você atende?" sub="Dias, abertura, fechamento e pausa de almoço." />
          <HoursEditor rows={rows} onChange={setRows} errors={hourErrors} />
        </>
      ) : null}

      {step === 5 ? (
        <>
          <StepTitle title="Capa e logo" sub="Perfis com foto recebem mais agendamentos. Você pode trocar depois." />
          {business ? <BusinessImagesEditor business={business} /> : null}
          <div className="rounded-2xl bg-bg p-4 text-sm leading-relaxed text-ink-2">
            <b>{draft.name}</b> · {BUSINESS_TYPES.find((t) => t.id === draft.type)?.label} · {draft.neighborhood}
            {city ? `, ${city.name}` : ""}
            <br />
            {existingServices.length} serviço(s) · link {publicLinkLabel(business?.slug ?? slugPreview(draft.name))}
          </div>
          {business?.status === "REJECTED" && business.rejectionReason ? (
            <Notice>Ajuste pedido pela equipe: {business.rejectionReason}</Notice>
          ) : null}
          {submitError ? <Notice tone="danger">{submitError}</Notice> : null}
        </>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex gap-2.5 border-t border-line bg-bg px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        {step > 1 ? (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={saving}>
            Voltar
          </Button>
        ) : null}
        {step < 5 ? (
          <Button
            className="flex-1"
            onClick={next}
            loading={saving}
            disabled={step >= 3 && (services.isPending || pros.isPending)}
          >
            Continuar
          </Button>
        ) : (
          <Button className="flex-1" variant="primary" onClick={submit} loading={saving}>
            {business?.status === "REJECTED" ? "Reenviar para aprovação" : "Enviar para aprovação"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Onboarding() {
  const router = useRouter();
  const signOut = useSignOut();
  const { data: me, isPending } = useMe();
  const isOwner = me?.role === "BUSINESS_OWNER";
  const business = useOwnerBusiness(isOwner);

  const status = business.data?.status;
  useEffect(() => {
    if (status === "PENDING" || status === "SUSPENDED") router.replace("/dashboard/status");
    if (status === "ACTIVE") router.replace("/dashboard");
  }, [status, router]);

  const content = useMemo(() => {
    if (isPending) return <Spinner />;
    if (!me) return <AccountStep />;
    if (!isOwner) {
      return (
        <div className="flex flex-col gap-4">
          <StepTitle title="Cadastrar estabelecimento" />
          <Notice>
            Você está conectada com uma conta de {me.role === "CLIENT" ? "cliente" : "admin"}. Saia para criar a conta
            do estabelecimento.
          </Notice>
          <Button variant="outline" onClick={() => signOut("/dashboard/sign-up")}>
            Sair e continuar
          </Button>
        </div>
      );
    }
    if (business.isPending) return <Spinner />;
    if (business.isError) return <Notice tone="danger">{errorMessage(business.error)}</Notice>;
    if (status && status !== "DRAFT" && status !== "REJECTED") return <Spinner />;
    return <BusinessWizard business={business.data ?? null} ownerName={me.name} />;
  }, [isPending, me, isOwner, business.isPending, business.isError, business.error, business.data, status, signOut]);

  return content;
}

export default function OnboardingPage() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="flex h-16 items-center justify-between border-b border-line bg-white px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Icon name="spa" size={24} />
          <b className="text-lg">belezaOur</b>
          <span className="text-sm text-muted">para profissionais</span>
        </Link>
        <Link href="/dashboard/sign-in" className="text-sm font-semibold text-ink-2">
          Já tenho conta
        </Link>
      </header>
      <main className="mx-auto max-w-[620px] px-4 py-6 pb-10 sm:py-10">
        <Onboarding />
      </main>
    </div>
  );
}
