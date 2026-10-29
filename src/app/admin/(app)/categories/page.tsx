"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageTitle, Toggle } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/overlay";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { adminKeys } from "@/lib/admin-queries";
import { api, errorMessage } from "@/lib/api";
import { plural } from "@/lib/format";
import { categoryFormSchema } from "@/lib/schemas";
import type { AdminCategory } from "@/lib/types";

function CategoryForm({
  category,
  open,
  onClose,
}: {
  category: AdminCategory | null;
  open: boolean;
  onClose: () => void;
}) {
  // O conteúdo do modal desmonta ao fechar: cada abertura começa do zero.
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={category ? "Editar categoria" : "Nova categoria"}>
      <CategoryFormBody category={category} onClose={onClose} />
    </Modal>
  );
}

function CategoryFormBody({ category, onClose }: { category: AdminCategory | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: (body: unknown) =>
      category
        ? api(`/admin/categories/${category.id}`, { method: "PATCH", body })
        : api("/admin/categories", { method: "POST", body }),
    onSuccess: () => {
      toast(category ? "Categoria atualizada" : "Categoria criada");
      void qc.invalidateQueries({ queryKey: adminKeys.categories });
      void qc.invalidateQueries({ queryKey: ["categories"] });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = categoryFormSchema.safeParse({ name, icon });
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
        {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />}
      </Field>
      <Field label="Ícone (Material Symbols)" error={errors.icon} hint="Ex.: spa, content_cut, back_hand, brush">
        {(p) => (
          <div className="flex items-center gap-2.5">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-strong">
              <Icon name={/^[a-z0-9_]{2,40}$/.test(icon) ? icon : "help"} size={26} />
            </span>
            <Input {...p} value={icon} onChange={(e) => setIcon(e.target.value.toLowerCase())} maxLength={40} />
          </div>
        )}
      </Field>
      <Button type="submit" size="lg" loading={save.isPending}>
        Salvar
      </Button>
    </form>
  );
}

export default function CategoriesAdminPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: adminKeys.categories, queryFn: () => api<AdminCategory[]>("/admin/categories") });
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [open, setOpen] = useState(false);

  const visible = useMutation({
    mutationFn: (c: AdminCategory) =>
      api(`/admin/categories/${c.id}`, { method: "PATCH", body: { visible: !c.visible } }),
    onSuccess: (_d, c) => {
      toast(c.visible ? `${c.name} oculta do marketplace` : `${c.name} visível no marketplace`);
      void qc.invalidateQueries({ queryKey: adminKeys.categories });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) => api<AdminCategory[]>("/admin/categories/order", { method: "PUT", body: { ids } }),
    onSuccess: (data) => qc.setQueryData(adminKeys.categories, data),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const move = (index: number, dir: -1 | 1) => {
    if (!q.data) return;
    const ids = q.data.map((c) => c.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  };

  const show = (c: AdminCategory | null) => {
    setEditing(c);
    setOpen(true);
  };

  return (
    <>
      <PageTitle
        sub="Organizam a navegação do marketplace — um estabelecimento pode estar em várias."
        actions={
          <Button variant="primary" size="sm" icon="add" onClick={() => show(null)}>
            Nova categoria
          </Button>
        }
      >
        Categorias
      </PageTitle>
      <div className="mt-5">
        {q.isPending ? (
          <ListSkeleton rows={3} />
        ) : q.isError ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : !q.data.length ? (
          <EmptyState icon="category" title="Nenhuma categoria" />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
            {q.data.map((c, i) => (
              <article key={c.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-strong">
                    <Icon name={c.icon} size={26} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate">{c.name}</b>
                    <div className="text-xs text-muted">
                      {plural(c.activeBusinesses, "estabelecimento", "estabelecimentos")} ·{" "}
                      {plural(c.appointmentsLast7Days, "agendamento", "agendamentos")} em 7 dias
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Toggle
                    checked={c.visible}
                    onChange={() => visible.mutate(c)}
                    label={c.visible ? "Visível no app" : "Oculta"}
                    showLabel
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Subir ${c.name}`}
                      disabled={i === 0 || reorder.isPending}
                      onClick={() => move(i, -1)}
                    >
                      <Icon name="arrow_upward" size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Descer ${c.name}`}
                      disabled={i === q.data.length - 1 || reorder.isPending}
                      onClick={() => move(i, 1)}
                    >
                      <Icon name="arrow_downward" size={18} />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Editar ${c.name}`} onClick={() => show(c)}>
                      <Icon name="edit" size={18} />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <CategoryForm category={editing} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
