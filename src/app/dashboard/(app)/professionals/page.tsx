"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, Badge, Chip, PageTitle, Toggle } from "@/components/ui/controls";
import { Field, Input, SectionLabel } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { personColors } from "@/lib/colors";
import { plural } from "@/lib/format";
import { ownerKeys, useOwnerProfessionals, useOwnerServices } from "@/lib/owner-queries";
import { professionalFormSchema } from "@/lib/schemas";
import type { OwnerProfessional } from "@/lib/types";

function ProfessionalForm({
  pro,
  open,
  onClose,
}: {
  pro: OwnerProfessional | null;
  open: boolean;
  onClose: () => void;
}) {
  // O conteúdo do modal desmonta ao fechar: cada abertura começa do zero.
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={pro ? "Editar profissional" : "Nova profissional"}>
      <ProfessionalFormBody pro={pro} onClose={onClose} />
    </Modal>
  );
}

function ProfessionalFormBody({ pro, onClose }: { pro: OwnerProfessional | null; onClose: () => void }) {
  const qc = useQueryClient();
  const services = useOwnerServices();
  const [name, setName] = useState(pro?.name ?? "");
  const [role, setRole] = useState(pro?.role ?? "");
  const [serviceIds, setServiceIds] = useState<string[]>(pro?.serviceIds ?? []);
  const [active, setActive] = useState(pro?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: (body: unknown) =>
      pro
        ? api(`/owner/professionals/${pro.id}`, { method: "PATCH", body })
        : api("/owner/professionals", { method: "POST", body }),
    onSuccess: () => {
      toast(pro ? "Profissional atualizada" : "Profissional adicionada");
      void qc.invalidateQueries({ queryKey: ownerKeys.professionals });
      void qc.invalidateQueries({ queryKey: ownerKeys.services });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = professionalFormSchema.safeParse({ name, role: role.trim() || undefined, serviceIds, active });
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
      <Field label="Função (opcional)" hint="Ex.: Manicure, Barbeiro, Designer de sobrancelhas">
        {(p) => <Input {...p} value={role} onChange={(e) => setRole(e.target.value)} maxLength={60} />}
      </Field>
      <SectionLabel>Serviços que atende</SectionLabel>
      <div className="-mt-2 flex flex-wrap gap-1.5">
        {(services.data ?? []).map((s) => {
          const on = serviceIds.includes(s.id);
          return (
            <Chip
              key={s.id}
              selected={on}
              onClick={() => setServiceIds(on ? serviceIds.filter((x) => x !== s.id) : [...serviceIds, s.id])}
            >
              {s.name}
            </Chip>
          );
        })}
        {services.data && !services.data.length ? (
          <span className="text-sm text-muted">Cadastre serviços primeiro.</span>
        ) : null}
      </div>
      <div className="flex items-center justify-between rounded-[10px] border border-line px-3 py-1.5 text-sm font-semibold">
        Ativa (aparece para agendamento)
        <Toggle checked={active} onChange={setActive} label="Ativa" />
      </div>
      <Button type="submit" size="lg" loading={save.isPending}>
        Salvar
      </Button>
    </form>
  );
}

export default function ProfessionalsPage() {
  const q = useOwnerProfessionals();
  const services = useOwnerServices();
  const [editing, setEditing] = useState<OwnerProfessional | null>(null);
  const [open, setOpen] = useState(false);
  const show = (p: OwnerProfessional | null) => {
    setEditing(p);
    setOpen(true);
  };
  const serviceName = (id: string) => services.data?.find((s) => s.id === id)?.name;

  return (
    <>
      <PageTitle
        sub="O número de profissionais ativas segue o limite do seu plano."
        actions={
          <Button variant="primary" size="sm" icon="person_add" onClick={() => show(null)}>
            Nova profissional
          </Button>
        }
      >
        Profissionais
      </PageTitle>
      <div className="mt-[18px]">
        {q.isPending ? (
          <ListSkeleton rows={2} />
        ) : q.isError ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : !q.data.length ? (
          <EmptyState
            icon="groups"
            title="Nenhuma profissional"
            action={
              <Button size="sm" onClick={() => show(null)}>
                Adicionar
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
            {q.data.map((p) => (
              <article key={p.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-[18px]">
                <div className="flex items-center gap-3">
                  <Avatar name={p.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <b className="block truncate">{p.name}</b>
                    <div className="text-[13px] text-muted">{p.role || "Profissional"}</div>
                  </div>
                  {!p.active ? (
                    <Badge tone="done" size="sm">
                      Inativa
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-ink-2">
                  <span className="size-2 rounded-full" style={{ background: personColors(p.name).strong }} />
                  {plural(p.appointmentsLast7Days ?? 0, "atendimento", "atendimentos")} nos últimos 7 dias
                </div>
                <div className="text-xs text-muted">
                  {p.serviceIds.length
                    ? p.serviceIds.map(serviceName).filter(Boolean).join(" · ")
                    : "Nenhum serviço vinculado"}
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <Link
                    href={`/dashboard/schedule?professional=${p.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Ver agenda
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => show(p)}>
                    Editar
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <ProfessionalForm pro={editing} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
