"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, Chip, PageTitle } from "@/components/ui/controls";
import { Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { adminKeys } from "@/lib/admin-queries";
import { api, errorMessage } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";
import type { AdminUser, AdminUsersPage, Role } from "@/lib/types";

const PAGE_SIZE = 20;

export default function UsersAdminPage() {
  const qc = useQueryClient();
  const [role, setRole] = useState<Role | "">("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: [...adminKeys.users, role, q, page],
    queryFn: () =>
      api<AdminUsersPage>("/admin/users", {
        query: { role: role || undefined, q: q || undefined, page, pageSize: PAGE_SIZE },
      }),
    placeholderData: (prev) => prev,
  });

  const toggle = useMutation({
    mutationFn: (u: AdminUser) =>
      api(`/admin/users/${u.id}/${u.banned ? "unblock" : "block"}`, {
        method: "POST",
        body: u.banned ? undefined : {},
      }),
    onSuccess: (_d, u) => {
      toast(u.banned ? `${u.name} desbloqueado` : `${u.name} bloqueado — sessões encerradas`);
      void qc.invalidateQueries({ queryKey: adminKeys.users });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const counts = list.data?.counts;
  const filters: { value: Role | ""; label: string; n?: number }[] = [
    { value: "", label: "Todos", n: counts?.all },
    { value: "CLIENT", label: "Clientes", n: counts?.CLIENT },
    { value: "BUSINESS_OWNER", label: "Donos", n: counts?.BUSINESS_OWNER },
    { value: "SUPER_ADMIN", label: "Admins", n: counts?.SUPER_ADMIN },
  ];
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <PageTitle>Usuários</PageTitle>
      <form
        role="search"
        className="mt-4 flex max-w-[480px] gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(search.trim().slice(0, 80));
          setPage(1);
        }}
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nome, e-mail ou telefone"
          aria-label="Buscar usuários"
          maxLength={80}
          className="py-2.5"
        />
        <Button type="submit" size="sm" variant="outline" aria-label="Buscar">
          <Icon name="search" size={20} />
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <Chip
            key={f.value}
            selected={role === f.value}
            onClick={() => {
              setRole(f.value);
              setPage(1);
            }}
          >
            {f.label}
            {f.n !== undefined ? <span className="opacity-70">{f.n}</span> : null}
          </Chip>
        ))}
      </div>
      <div className="mt-4">
        {list.isPending ? (
          <ListSkeleton rows={4} />
        ) : list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
        ) : !list.data.items.length ? (
          <EmptyState icon="group" title="Nenhum usuário encontrado" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-soft text-left text-xs font-bold tracking-[.04em] text-muted uppercase">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-3 py-3">Contato</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Estabelecimento</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((u) => (
                  <tr key={u.id} className="border-b border-panel-bg last:border-0">
                    <td className="px-4 py-3 font-bold">{u.name}</td>
                    <td className="px-3 py-3 text-ink-2">{u.email || formatPhone(u.phoneNumber) || "—"}</td>
                    <td className="px-3 py-3">
                      <Badge
                        tone={u.role === "SUPER_ADMIN" ? "accent" : u.role === "BUSINESS_OWNER" ? "ink" : "neutral"}
                        size="sm"
                      >
                        {ROLE_LABEL[u.role]}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-ink-2">{u.business?.name ?? "—"}</td>
                    <td className="px-3 py-3">
                      <Badge tone={u.banned ? "danger" : "ok"} size="sm">
                        {u.banned ? "Bloqueado" : "Ativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role === "SUPER_ADMIN" ? (
                        <span className="text-xs text-subtle">—</span>
                      ) : (
                        <Button
                          variant={u.banned ? "outline" : "danger-outline"}
                          size="xs"
                          loading={toggle.isPending && toggle.variables?.id === u.id}
                          onClick={() =>
                            (u.banned ||
                              window.confirm(
                                `Bloquear ${u.name}? A pessoa sai de todos os aparelhos e não consegue entrar nem agendar.`,
                              )) &&
                            toggle.mutate(u)
                          }
                        >
                          {u.banned ? "Desbloquear" : "Bloquear"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              ← Anterior
            </Button>
            <span className="text-muted">
              {page} de {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Próxima →
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}
