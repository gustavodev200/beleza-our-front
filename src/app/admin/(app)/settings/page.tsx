"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chip, PageTitle, Toggle } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { adminKeys, useAdminCities, useSettings, useUpdateSettings } from "@/lib/admin-queries";
import { api, errorMessage } from "@/lib/api";
import { CANCELLATION_WINDOWS } from "@/lib/labels";
import { cityFormSchema } from "@/lib/schemas";
import type { AdminCity, PlatformSettings } from "@/lib/types";

function Row({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft py-4 last:border-0">
      <div className="min-w-[200px] flex-1">
        <b className="block text-sm">{title}</b>
        {sub ? <span className="text-[13px] text-muted">{sub}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Cities() {
  const qc = useQueryClient();
  const cities = useAdminCities();
  const [name, setName] = useState("");
  const [state, setState] = useState("GO");
  const [error, setError] = useState<string>();
  const toggle = useMutation({
    mutationFn: (c: AdminCity) => api(`/admin/cities/${c.id}`, { method: "PATCH", body: { active: !c.active } }),
    onSuccess: (_d, c) => {
      toast(c.active ? `${c.name} desativada — some do marketplace` : `${c.name} ativada`);
      void qc.invalidateQueries({ queryKey: adminKeys.cities });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const create = useMutation({
    mutationFn: (body: unknown) => api("/admin/cities", { method: "POST", body }),
    onSuccess: () => {
      toast("Cidade adicionada (inativa até você ativar)");
      setName("");
      void qc.invalidateQueries({ queryKey: adminKeys.cities });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const r = cityFormSchema.safeParse({ name, state });
    if (!r.success) {
      setError(r.error.issues[0].message);
      return;
    }
    setError(undefined);
    create.mutate({ ...r.data, active: false });
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {cities.isPending ? <Skeleton className="h-9 w-40" /> : null}
        {(cities.data ?? []).map((c) => (
          <Chip
            key={c.id}
            selected={c.active}
            onClick={() => toggle.mutate(c)}
            disabled={toggle.isPending}
            title={`${c._count.businesses} estabelecimentos`}
          >
            {c.active ? <Icon name="check" size={16} /> : null}
            {c.name} - {c.state}
          </Chip>
        ))}
      </div>
      <form onSubmit={add} className="flex flex-wrap items-end gap-2" noValidate>
        <Field label="Nova cidade" error={error} className="min-w-[180px] flex-1">
          {(p) => (
            <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="py-2.5" />
          )}
        </Field>
        <Field label="UF" className="w-20">
          {(p) => (
            <Input
              {...p}
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
              className="py-2.5"
            />
          )}
        </Field>
        <Button type="submit" variant="outline" size="sm" className="min-h-11" loading={create.isPending}>
          Adicionar
        </Button>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const s = settings.data;
  const set = (patch: Partial<Omit<PlatformSettings, "approvalRequired">>) => update.mutate(patch);

  return (
    <>
      <PageTitle>Configurações globais</PageTitle>
      <section className="mt-5 max-w-[820px] rounded-2xl border border-line bg-surface px-5">
        {settings.isPending ? (
          <Skeleton className="my-5 h-48" />
        ) : settings.isError ? (
          <ErrorState className="my-5" message={errorMessage(settings.error)} onRetry={() => settings.refetch()} />
        ) : s ? (
          <>
            <Row
              title="Aprovação obrigatória de estabelecimentos"
              sub="Todo novo cadastro passa pela fila antes de ir ao ar"
            >
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted">
                <Icon name="lock" size={16} />
                Sempre ativa
              </span>
            </Row>
            <Row
              title="Cancelamento gratuito pela cliente"
              sub="Até quanto tempo antes a cliente pode cancelar ou remarcar"
            >
              <div className="flex flex-wrap gap-1.5">
                {CANCELLATION_WINDOWS.map((w) => (
                  <Chip
                    key={w.value}
                    selected={s.cancellationWindowMinutes === w.value}
                    onClick={() => set({ cancellationWindowMinutes: w.value })}
                    disabled={update.isPending}
                  >
                    {w.label}
                  </Chip>
                ))}
              </div>
            </Row>
            <Row title="Lembretes automáticos no WhatsApp" sub="24h e 2h antes do horário">
              <Toggle
                checked={s.remindersEnabled}
                onChange={(v) => set({ remindersEnabled: v })}
                label="Lembretes no WhatsApp"
                disabled={update.isPending}
              />
            </Row>
            <Row title="Pedir avaliação após o atendimento" sub="Convite enviado 2h após a conclusão">
              <Toggle
                checked={s.reviewRequestEnabled}
                onChange={(v) => set({ reviewRequestEnabled: v })}
                label="Pedir avaliação"
                disabled={update.isPending}
              />
            </Row>
            <Row title="Cidades atendidas" sub="Só cidades ativas aparecem no marketplace">
              <Cities />
            </Row>
          </>
        ) : null}
      </section>
    </>
  );
}
