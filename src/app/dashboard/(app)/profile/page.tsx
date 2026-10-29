"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { HoursEditor, hoursToRows, rowsToPayload, type DayRow } from "@/components/owner/hours-editor";
import { BusinessImagesEditor } from "@/components/owner/image-upload";
import { Button, buttonVariants } from "@/components/ui/button";
import { Chip, PageTitle, Toggle } from "@/components/ui/controls";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { ErrorState, Spinner } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { formatPhone, maskPhoneInput } from "@/lib/format";
import { ownerKeys, useCategories, useOwnerBusiness } from "@/lib/owner-queries";
import { businessDataSchema } from "@/lib/schemas";
import { publicLink, publicLinkLabel } from "@/lib/site";
import type { OwnerBusiness } from "@/lib/types";

function LinkCard({ b }: { b: OwnerBusiness }) {
  const url = publicLink(b.slug);
  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg);
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente: " + text);
    }
  };
  const btn =
    "inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border border-line-strong bg-white px-3.5 text-[13px] font-semibold";
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[10px] bg-panel-bg px-3.5 py-3 text-sm">
          <Icon name="link" size={18} />
          <span className="truncate">{publicLinkLabel(b.slug)}</span>
        </div>
        <Button variant="primary" onClick={() => copy(url, "Link copiado")}>
          Copiar link
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Agende comigo pelo belezaOur: ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={btn}
        >
          <Icon name="chat" size={18} />
          Enviar no WhatsApp
        </a>
        <button
          type="button"
          className={btn}
          onClick={() => copy(`✨ Agende online: ${url}`, "Texto para a bio copiado — cole no Instagram")}
        >
          <Icon name="photo_camera" size={18} />
          Bio do Instagram
        </button>
        <Link
          href={`/${b.slug}`}
          target="_blank"
          className={buttonVariants({ variant: "ink", size: "sm", className: "min-h-10" })}
        >
          <Icon name="visibility" size={18} />
          Ver como cliente
        </Link>
      </div>
      {b.status !== "ACTIVE" ? (
        <p className="m-0 text-xs text-muted">O link só abre para clientes depois da aprovação.</p>
      ) : null}
    </section>
  );
}

function DetailsForm({ b }: { b: OwnerBusiness }) {
  const qc = useQueryClient();
  const categories = useCategories();
  const [form, setForm] = useState({
    name: b.name,
    whatsapp: formatPhone(b.whatsapp),
    phone: b.phone ?? "",
    neighborhood: b.neighborhood,
    address: b.address ?? "",
    description: b.description ?? "",
    categoryIds: b.categories.map((c) => c.id),
    requiresConfirmation: b.requiresConfirmation,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const save = useMutation({
    mutationFn: (body: unknown) => api<OwnerBusiness>("/owner/business", { method: "PATCH", body }),
    onSuccess: (data) => {
      qc.setQueryData(ownerKeys.business, data);
      toast("Perfil atualizado");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = businessDataSchema.safeParse({
      name: form.name,
      whatsapp: form.whatsapp,
      neighborhood: form.neighborhood,
      cityId: b.city.id,
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
      description: form.description.trim() || undefined,
    });
    const errs: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
    if (!form.categoryIds.length) errs.categoryIds = "Escolha ao menos uma categoria";
    setErrors(errs);
    if (!parsed.success || errs.categoryIds) return;
    save.mutate({ ...parsed.data, categoryIds: form.categoryIds, requiresConfirmation: form.requiresConfirmation });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-5" noValidate>
      <h2 className="m-0 text-lg font-bold">Dados do perfil</h2>
      <Field label="Nome" error={errors.name} hint="Mudar o nome não muda o seu link.">
        {(p) => <Input {...p} value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} />}
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="WhatsApp" error={errors.whatsapp}>
          {(p) => (
            <Input
              {...p}
              value={form.whatsapp}
              onChange={(e) => set({ whatsapp: maskPhoneInput(e.target.value) })}
              inputMode="tel"
            />
          )}
        </Field>
        <Field label="Telefone fixo (opcional)" error={errors.phone}>
          {(p) => (
            <Input
              {...p}
              value={form.phone}
              onChange={(e) => set({ phone: e.target.value })}
              inputMode="tel"
              maxLength={20}
            />
          )}
        </Field>
        <Field label="Bairro" error={errors.neighborhood}>
          {(p) => (
            <Input
              {...p}
              value={form.neighborhood}
              onChange={(e) => set({ neighborhood: e.target.value })}
              maxLength={60}
            />
          )}
        </Field>
        <Field label="Endereço" error={errors.address}>
          {(p) => (
            <Input {...p} value={form.address} onChange={(e) => set({ address: e.target.value })} maxLength={160} />
          )}
        </Field>
      </div>
      <Field label="Descrição" error={errors.description} hint={`${form.description.length}/1000`}>
        {(p) => (
          <Textarea
            {...p}
            rows={4}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            maxLength={1000}
          />
        )}
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold">Categorias</span>
        <div className="flex flex-wrap gap-1.5">
          {(categories.data ?? []).map((c) => {
            const on = form.categoryIds.includes(c.id);
            return (
              <Chip
                key={c.id}
                selected={on}
                onClick={() =>
                  set({ categoryIds: on ? form.categoryIds.filter((x) => x !== c.id) : [...form.categoryIds, c.id] })
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
      <div className="flex items-center justify-between gap-3 rounded-[10px] border border-line px-3 py-2 text-sm">
        <span>
          <b className="block">Confirmar agendamentos manualmente</b>
          <span className="text-xs text-muted">Agendamentos do app chegam como pendentes até você confirmar.</span>
        </span>
        <Toggle
          checked={form.requiresConfirmation}
          onChange={(v) => set({ requiresConfirmation: v })}
          label="Confirmar manualmente"
        />
      </div>
      <Button type="submit" loading={save.isPending} className="self-start">
        Salvar dados
      </Button>
    </form>
  );
}

function HoursForm({ b }: { b: OwnerBusiness }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<DayRow[]>(() => hoursToRows(b.hours));
  const [errors, setErrors] = useState<Record<number, string>>({});
  const save = useMutation({
    mutationFn: (days: unknown) => api<OwnerBusiness>("/owner/business/hours", { method: "PUT", body: { days } }),
    onSuccess: (data) => {
      qc.setQueryData(ownerKeys.business, data);
      void qc.invalidateQueries({ queryKey: ownerKeys.agenda });
      toast("Horários atualizados");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <section className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-5">
      <h2 className="m-0 text-lg font-bold">Horário de funcionamento</h2>
      <HoursEditor rows={rows} onChange={setRows} errors={errors} />
      <Button
        className="self-start"
        loading={save.isPending}
        onClick={() => {
          const { days, errors: errs, valid } = rowsToPayload(rows);
          setErrors(errs);
          if (!days.length) toast.error("Selecione ao menos um dia.");
          if (valid) save.mutate(days);
        }}
      >
        Salvar horários
      </Button>
    </section>
  );
}

export default function PublicProfilePage() {
  const q = useOwnerBusiness();
  if (q.isPending) return <Spinner />;
  if (q.isError || !q.data) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const b = q.data;
  return (
    <div className="flex max-w-[720px] flex-col gap-4">
      <PageTitle sub="Divulgue seu link no Instagram e WhatsApp — clientes agendam direto, sem baixar app.">
        Perfil público
      </PageTitle>
      <BusinessImagesEditor business={b} />
      <LinkCard b={b} />
      <DetailsForm key={b.id} b={b} />
      {/* key: horários salvos em outro lugar recriam o formulário com os dados novos */}
      <HoursForm key={JSON.stringify(b.hours)} b={b} />
    </div>
  );
}
