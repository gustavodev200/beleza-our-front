"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge, Chip, PageTitle, Toggle } from "@/components/ui/controls";
import { Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { adminKeys, useBusinessAction } from "@/lib/admin-queries";
import { api, errorMessage } from "@/lib/api";
import { formatRating } from "@/lib/format";
import { BUSINESS_STATUS, BUSINESS_TYPE_LABEL } from "@/lib/labels";
import type { AdminBusinessRow, BusinessStatus, Page } from "@/lib/types";

const FILTERS: { value: BusinessStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "ACTIVE", label: "Ativos" },
  { value: "PENDING", label: "Em análise" },
  { value: "SUSPENDED", label: "Suspensos" },
  { value: "REJECTED", label: "Recusados" },
  { value: "DRAFT", label: "Rascunhos" },
];
const PAGE_SIZE = 20;

export default function BusinessesAdminPage() {
  const [status, setStatus] = useState<BusinessStatus | "">("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const action = useBusinessAction();
  const list = useQuery({
    queryKey: [...adminKeys.businesses, "list", status, q, page],
    queryFn: () =>
      api<Page<AdminBusinessRow>>("/admin/businesses", {
        query: { status: status || undefined, q: q || undefined, page, pageSize: PAGE_SIZE },
      }),
    placeholderData: (prev) => prev,
  });
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;
  const busy = (id: string, a: string) =>
    action.isPending && action.variables?.id === id && action.variables.action === a;

  return (
    <>
      <PageTitle>Estabelecimentos</PageTitle>
      <form
        className="mt-4 flex max-w-[480px] gap-2"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(search.trim().slice(0, 80));
          setPage(1);
        }}
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, bairro…"
          aria-label="Buscar estabelecimentos"
          maxLength={80}
          className="py-2.5"
        />
        <Button type="submit" size="sm" variant="outline" aria-label="Buscar">
          <Icon name="search" size={20} />
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            selected={status === f.value}
            onClick={() => {
              setStatus(f.value);
              setPage(1);
            }}
          >
            {f.label}
          </Chip>
        ))}
      </div>

      <div className="mt-4">
        {list.isPending ? (
          <ListSkeleton rows={4} />
        ) : list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
        ) : !list.data.items.length ? (
          <EmptyState icon="storefront" title="Nenhum estabelecimento" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-soft text-left text-xs font-bold tracking-[.04em] text-muted uppercase">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-3 py-3">Dono</th>
                  <th className="px-3 py-3">Tipo</th>
                  <th className="px-3 py-3">Bairro</th>
                  <th className="px-3 py-3">Nota</th>
                  <th className="px-3 py-3">Plano</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Destaque</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((b) => (
                  <tr key={b.id} className="border-b border-panel-bg last:border-0">
                    <td className="px-4 py-3 font-bold">{b.name}</td>
                    <td className="px-3 py-3">
                      <div>{b.owner.name}</div>
                      <div className="text-xs text-muted">{b.owner.email}</div>
                    </td>
                    <td className="px-3 py-3 text-ink-2">{BUSINESS_TYPE_LABEL[b.type]}</td>
                    <td className="px-3 py-3 text-ink-2">{b.neighborhood}</td>
                    <td className="px-3 py-3">{b.ratingCount ? `★ ${formatRating(b.ratingAvg)}` : "Novo"}</td>
                    <td className="px-3 py-3">
                      <Badge tone="neutral" size="sm">
                        Grátis
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={BUSINESS_STATUS[b.status].tone} size="sm">
                        {BUSINESS_STATUS[b.status].label}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Toggle
                        checked={b.featured}
                        disabled={b.status !== "ACTIVE" || busy(b.id, "featured")}
                        label={`Destacar ${b.name} na home`}
                        onChange={(v) => action.mutate({ id: b.id, action: "featured", body: { featured: v } })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {b.status === "ACTIVE" ? (
                          <Link
                            href={`/${b.slug}`}
                            target="_blank"
                            className={buttonVariants({ variant: "outline", size: "xs" })}
                          >
                            Ver
                          </Link>
                        ) : null}
                        {b.status === "ACTIVE" ? (
                          <Button
                            variant="danger-outline"
                            size="xs"
                            loading={busy(b.id, "suspend")}
                            onClick={() =>
                              window.confirm(`Suspender ${b.name}? Ele sai do marketplace na hora.`) &&
                              action.mutate({ id: b.id, action: "suspend" })
                            }
                          >
                            Suspender
                          </Button>
                        ) : null}
                        {b.status === "SUSPENDED" ? (
                          <Button
                            variant="outline"
                            size="xs"
                            loading={busy(b.id, "reactivate")}
                            onClick={() => action.mutate({ id: b.id, action: "reactivate" })}
                          >
                            Reativar
                          </Button>
                        ) : null}
                        {b.status === "PENDING" ? (
                          <Link href="/admin/aprovacoes" className={buttonVariants({ variant: "outline", size: "xs" })}>
                            Revisar
                          </Link>
                        ) : null}
                      </div>
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
