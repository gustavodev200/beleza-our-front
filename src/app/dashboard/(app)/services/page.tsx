"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageTitle, Toggle } from "@/components/ui/controls";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { formatDuration, formatMoney, parseMoneyToCents } from "@/lib/format";
import { ownerKeys, useCategories, useOwnerServices } from "@/lib/owner-queries";
import { serviceFormSchema } from "@/lib/schemas";
import type { OwnerService } from "@/lib/types";

const DURATIONS = [15, 20, 30, 40, 45, 50, 60, 75, 90, 120, 150, 180, 240];

function ServiceForm({ service, open, onClose }: { service: OwnerService | null; open: boolean; onClose: () => void }) {
  // O conteúdo do modal desmonta ao fechar: cada abertura começa do zero.
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={service ? "Editar serviço" : "Novo serviço"}>
      <ServiceFormBody service={service} onClose={onClose} />
    </Modal>
  );
}

function ServiceFormBody({ service, onClose }: { service: OwnerService | null; onClose: () => void }) {
  const qc = useQueryClient();
  const categories = useCategories();
  const [name, setName] = useState(service?.name ?? "");
  const [categoryId, setCategoryId] = useState(service?.category.id ?? "");
  const [duration, setDuration] = useState(service?.durationMinutes ?? 30);
  const [price, setPrice] = useState(service ? (service.priceCents / 100).toFixed(2).replace(".", ",") : "");
  const [visible, setVisible] = useState(service?.visible ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: (body: unknown) =>
      service
        ? api(`/owner/services/${service.id}`, { method: "PATCH", body })
        : api("/owner/services", { method: "POST", body }),
    onSuccess: () => {
      toast(service ? "Serviço atualizado" : "Serviço criado");
      void qc.invalidateQueries({ queryKey: ownerKeys.services });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = serviceFormSchema.safeParse({
      name,
      categoryId,
      durationMinutes: duration,
      priceCents: parseMoneyToCents(price) ?? -1,
      visible,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    save.mutate(parsed.data);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5" noValidate>
      <Field label="Nome" error={errors.name}>
        {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />}
      </Field>
      <Field label="Categoria" error={errors.categoryId}>
        {(p) => (
          <Select {...p} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Escolha…</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duração" error={errors.durationMinutes}>
          {(p) => (
            <Select {...p} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {Array.from(new Set([...DURATIONS, duration]))
                .sort((a, b) => a - b)
                .map((d) => (
                  <option key={d} value={d}>
                    {formatDuration(d)}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <Field label="Preço (R$)" error={errors.priceCents}>
          {(p) => (
            <Input
              {...p}
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d,]/g, ""))}
              inputMode="decimal"
              placeholder="45,00"
            />
          )}
        </Field>
      </div>
      <div className="flex items-center justify-between rounded-[10px] border border-line px-3 py-1.5 text-sm font-semibold">
        Visível no app
        <Toggle checked={visible} onChange={setVisible} label="Visível no app" />
      </div>
      <Button type="submit" size="lg" loading={save.isPending}>
        Salvar
      </Button>
    </form>
  );
}

export default function ServicesPage() {
  const qc = useQueryClient();
  const q = useOwnerServices();
  const [editing, setEditing] = useState<OwnerService | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const toggle = useMutation({
    mutationFn: (s: OwnerService) => api(`/owner/services/${s.id}`, { method: "PATCH", body: { visible: !s.visible } }),
    onSuccess: (_d, s) => {
      toast(s.visible ? "Serviço oculto do marketplace" : "Serviço visível no marketplace");
      void qc.invalidateQueries({ queryKey: ownerKeys.services });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (s: OwnerService) => api(`/owner/services/${s.id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast("Serviço excluído");
      void qc.invalidateQueries({ queryKey: ownerKeys.services });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const open = (s: OwnerService | null) => {
    setEditing(s);
    setFormOpen(true);
  };

  return (
    <>
      <PageTitle
        sub="Serviços ocultos deixam de aparecer no marketplace na hora."
        actions={
          <Button variant="primary" size="sm" icon="add" onClick={() => open(null)}>
            Novo serviço
          </Button>
        }
      >
        Serviços
      </PageTitle>
      <div className="mt-[18px]">
        {q.isPending ? (
          <ListSkeleton rows={3} />
        ) : q.isError ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : !q.data.length ? (
          <EmptyState
            icon="design_services"
            title="Nenhum serviço ainda"
            action={
              <Button size="sm" onClick={() => open(null)}>
                Criar serviço
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_150px_88px] gap-3 border-b border-soft px-[18px] py-3 text-xs font-bold tracking-[.04em] text-muted uppercase md:grid">
              <span>Serviço</span>
              <span>Categoria</span>
              <span>Duração</span>
              <span>Preço</span>
              <span>No app</span>
              <span />
            </div>
            {q.data.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border-b border-panel-bg px-4 py-3.5 text-sm last:border-0 md:grid-cols-[2fr_1fr_1fr_1fr_150px_88px] md:px-[18px]"
              >
                <b className="min-w-0 truncate">{s.name}</b>
                <span className="hidden text-ink-2 md:block">{s.category.name}</span>
                <span className="col-start-1 text-[13px] text-muted md:col-auto md:text-sm md:text-ink-2">
                  <span className="md:hidden">{s.category.name} · </span>
                  {formatDuration(s.durationMinutes)}
                  <span className="md:hidden"> · {formatMoney(s.priceCents)}</span>
                </span>
                <span className="hidden font-semibold md:block">{formatMoney(s.priceCents)}</span>
                <span className="col-start-2 row-span-2 row-start-1 flex items-center gap-1 md:col-auto md:row-auto">
                  <Toggle
                    checked={s.visible}
                    onChange={() => toggle.mutate(s)}
                    label={`${s.name} visível no app`}
                    disabled={toggle.isPending}
                  />
                  <span className={`hidden text-xs font-semibold md:inline ${s.visible ? "text-ok" : "text-subtle"}`}>
                    {s.visible ? "Visível no app" : "Oculto"}
                  </span>
                </span>
                <span className="col-span-2 flex gap-1 md:col-auto">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => open(s)}
                    aria-label={`Editar ${s.name}`}
                    icon="edit"
                  />
                  <Button
                    variant="ghost"
                    size="xs"
                    icon="delete"
                    aria-label={`Excluir ${s.name}`}
                    onClick={() =>
                      window.confirm(
                        `Excluir "${s.name}"? Serviços com agendamentos não podem ser excluídos — oculte-os.`,
                      ) && remove.mutate(s)
                    }
                  />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <ServiceForm service={editing} open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  );
}
