"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatAgo } from "@/lib/format";
import { notificationIcon } from "@/lib/labels";
import type { AppNotification, Page } from "@/lib/types";

/** Lista de notificações (cliente, dono e admin). Marca como lidas ao abrir (§4.8). */
export function NotificationsList() {
  const qc = useQueryClient();
  const marked = useRef(new Set<string>());
  const q = useInfiniteQuery({
    queryKey: ["notifications", "list"],
    queryFn: ({ pageParam }) =>
      api<Page<AppNotification>>("/me/notifications", { query: { page: pageParam, pageSize: 20 } }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);

  useEffect(() => {
    const unread = items.filter((n) => !n.readAt && !marked.current.has(n.id)).map((n) => n.id);
    if (!unread.length) return;
    unread.forEach((id) => marked.current.add(id));
    api("/me/notifications/read", { method: "POST", body: { ids: unread.slice(0, 100) } })
      .then(() => qc.invalidateQueries({ queryKey: ["notifications", "unread"] }))
      .catch(() => undefined);
  }, [items, qc]);

  if (q.isPending) return <ListSkeleton rows={3} />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!items.length)
    return (
      <EmptyState icon="notifications" title="Sem notificações" description="Confirmações e avisos aparecem aqui." />
    );

  return (
    <div className="flex flex-col gap-2">
      {items.map((n) => (
        <div
          key={n.id}
          className={cn(
            "flex items-start gap-3 rounded-[14px] border border-line px-4 py-3.5",
            n.readAt ? "bg-surface" : "bg-primary-soft",
          )}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white">
            <Icon name={notificationIcon(n.type)} size={19} className="text-primary-strong" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">{n.title}</div>
            <div className="text-sm leading-snug text-ink-2">{n.body}</div>
            <div className="mt-1 text-xs text-subtle">{formatAgo(n.createdAt)}</div>
          </div>
          {!n.readAt ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-label="Nova" /> : null}
        </div>
      ))}
      {q.hasNextPage ? (
        <Button
          variant="outline"
          onClick={() => q.fetchNextPage()}
          loading={q.isFetchingNextPage}
          className="self-center"
        >
          Carregar mais
        </Button>
      ) : null}
    </div>
  );
}
