"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BusinessImage } from "@/components/ui/business-image";
import { Button } from "@/components/ui/button";
import { Badge, PageTitle } from "@/components/ui/controls";
import { Field, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { EmptyState, ErrorState, ListSkeleton, Skeleton } from "@/components/ui/states";
import { adminKeys, useBusinessAction } from "@/lib/admin-queries";
import { api, errorMessage } from "@/lib/api";
import { WEEKDAY_SHORT, formatAgo, formatDuration, formatMoney, formatPhone, minutesToHHMM } from "@/lib/format";
import { BUSINESS_TYPE_LABEL } from "@/lib/labels";
import { rejectSchema } from "@/lib/schemas";
import type { AdminBusinessDetail, AdminBusinessRow, Page } from "@/lib/types";

function hoursSummary(d: AdminBusinessDetail): string {
  if (!d.hours.length) return "Sem horários";
  return d.hours
    .map((h) => `${WEEKDAY_SHORT[h.weekday]} ${minutesToHHMM(h.opensAt)}–${minutesToHHMM(h.closesAt)}`)
    .join(" · ");
}

function ApprovalCard({ row, onReject }: { row: AdminBusinessRow; onReject: (row: AdminBusinessRow) => void }) {
  const action = useBusinessAction();
  const detail = useQuery({
    queryKey: [...adminKeys.businesses, "detail", row.id],
    queryFn: () => api<AdminBusinessDetail>(`/admin/businesses/${row.id}`),
  });
  const d = detail.data;
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="relative h-[120px]">
        <BusinessImage src={d?.coverUrl} seed={row.name} alt="" className="absolute inset-0" />
      </div>
      <div className="flex flex-col gap-3 px-[18px] pb-[18px]">
        <div className="flex items-end gap-3">
          <div className="relative -mt-8 size-16 shrink-0 overflow-hidden rounded-[15px] border-4 border-white bg-white">
            <BusinessImage src={d?.logoUrl} seed={row.name} alt="" kind="logo" className="absolute inset-0" />
          </div>
          <div className="min-w-0 pt-2">
            <div className="flex items-center gap-1.5">
              <b className="truncate text-[17px]">{row.name}</b>
              <Badge tone="accent" size="sm">
                NOVO
              </Badge>
            </div>
            <div className="text-xs text-muted">
              {BUSINESS_TYPE_LABEL[row.type]} · {row.neighborhood}
              {row.submittedAt ? ` · enviado ${formatAgo(row.submittedAt)}` : ""}
            </div>
          </div>
        </div>
        {detail.isPending ? (
          <Skeleton className="h-20" />
        ) : detail.isError ? (
          <ErrorState message={errorMessage(detail.error)} onRetry={() => detail.refetch()} />
        ) : d ? (
          <dl className="m-0 grid gap-1.5 text-[13px] leading-snug">
            <div>
              <dt className="inline text-muted">Responsável: </dt>
              <dd className="inline">
                {d.owner.name} · {d.owner.email} {d.owner.emailVerified ? "✓" : "(e-mail não verificado)"} ·{" "}
                {formatPhone(d.whatsapp)}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted">Endereço: </dt>
              <dd className="inline">
                {[d.address, d.neighborhood, `${d.city.name}-${d.city.state}`].filter(Boolean).join(", ")}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted">Categorias: </dt>
              <dd className="inline">{d.categories.map((c) => c.name).join(", ")}</dd>
            </div>
            <div>
              <dt className="inline text-muted">Horários: </dt>
              <dd className="inline">{hoursSummary(d)}</dd>
            </div>
            <div>
              <dt className="inline text-muted">Serviços: </dt>
              <dd className="inline">
                {d.services
                  .map((s) => `${s.name} (${formatDuration(s.durationMinutes)}, ${formatMoney(s.priceCents)})`)
                  .join(" · ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted">Profissionais: </dt>
              <dd className="inline">{d.professionals.map((p) => p.name).join(", ") || "—"}</dd>
            </div>
            {d.description ? <p className="m-0 mt-1 rounded-lg bg-bg p-2.5 text-ink-2">{d.description}</p> : null}
          </dl>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button variant="danger-outline" size="sm" onClick={() => onReject(row)}>
            Recusar
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={action.isPending && action.variables?.action === "approve"}
            onClick={() => action.mutate({ id: row.id, action: "approve" })}
          >
            Aprovar e publicar
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function ApprovalsPage() {
  const action = useBusinessAction();
  const [rejecting, setRejecting] = useState<AdminBusinessRow | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();
  const q = useQuery({
    queryKey: [...adminKeys.businesses, "PENDING", "list"],
    queryFn: () => api<Page<AdminBusinessRow>>("/admin/businesses", { query: { status: "PENDING", pageSize: 50 } }),
  });

  const confirmReject = () => {
    const r = rejectSchema.safeParse({ reason });
    if (!r.success) {
      setReasonError(r.error.issues[0].message);
      return;
    }
    action.mutate(
      { id: rejecting!.id, action: "reject", body: r.data },
      {
        onSuccess: () => {
          setRejecting(null);
          setReason("");
          setReasonError(undefined);
        },
      },
    );
  };

  return (
    <>
      <PageTitle sub="Todo novo estabelecimento só aparece no marketplace depois de aprovado aqui.">
        Aprovações
      </PageTitle>
      <div className="mt-5">
        {q.isPending ? (
          <ListSkeleton rows={2} />
        ) : q.isError ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : q.data.items.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,420px),1fr))] gap-4">
            {q.data.items.map((row) => (
              <ApprovalCard key={row.id} row={row} onReject={setRejecting} />
            ))}
          </div>
        ) : (
          <EmptyState icon="task_alt" title="Fila vazia" description="Novos cadastros aparecem aqui." />
        )}
      </div>
      <Modal
        open={Boolean(rejecting)}
        onOpenChange={(o) => !o && setRejecting(null)}
        title="Recusar cadastro"
        description={rejecting ? `${rejecting.name} — o dono recebe o motivo e pode reenviar.` : undefined}
      >
        <Field label="Motivo" error={reasonError}>
          {(p) => (
            <Textarea
              {...p}
              rows={4}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: a foto de capa não mostra o estabelecimento; confira o WhatsApp."
            />
          )}
        </Field>
        <Button
          variant="danger"
          onClick={confirmReject}
          loading={action.isPending && action.variables?.action === "reject"}
        >
          Recusar e avisar o dono
        </Button>
      </Modal>
    </>
  );
}
