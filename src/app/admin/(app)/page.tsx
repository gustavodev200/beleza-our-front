"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/controls";
import { Select } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { adminKeys, useAdminCities, useBusinessAction } from "@/lib/admin-queries";
import { api, errorMessage } from "@/lib/api";
import { addDays, dayOfMonth, formatAgo, formatMoney, localDate, weekdayShort } from "@/lib/format";
import { BUSINESS_TYPE_LABEL } from "@/lib/labels";
import type { AdminDashboard } from "@/lib/types";

const PERIODS = [
  { days: 7, label: "Últimos 7 dias" },
  { days: 30, label: "Últimos 30 dias" },
  { days: 90, label: "Últimos 90 dias" },
];

function Kpi({
  icon,
  label,
  value,
  href,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  href?: string;
  tone?: "warn";
}) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-[13px] text-muted">
        <Icon name={icon} size={18} />
        {label}
      </span>
      <span
        className={`mt-1.5 block text-[26px] font-extrabold tracking-[-0.02em] ${tone === "warn" ? "text-warn" : ""}`}
      >
        {value}
      </span>
    </>
  );
  const cls = "rounded-2xl border border-line bg-surface p-4";
  return href ? (
    <Link href={href} className={`${cls} hover:border-ink`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export default function AdminDashboardPage() {
  const cities = useAdminCities();
  const [cityId, setCityId] = useState("");
  const [days, setDays] = useState(7);
  const to = localDate();
  const from = addDays(to, -(days - 1));
  const approve = useBusinessAction();
  const q = useQuery({
    queryKey: [...adminKeys.dashboard, cityId, from, to],
    queryFn: () => api<AdminDashboard>("/admin/dashboard", { query: { cityId: cityId || undefined, from, to } }),
  });

  const d = q.data;
  const maxDay = Math.max(1, ...(d?.appointmentsByDay.map((x) => x.count) ?? [1]));
  const maxCat = Math.max(1, ...(d?.appointmentsByCategory.map((x) => x.count) ?? [1]));
  const byDay = d && d.appointmentsByDay.length > 31 ? d.appointmentsByDay.slice(-31) : d?.appointmentsByDay;

  return (
    <>
      <PageTitle
        actions={
          <>
            <Select
              aria-label="Cidade"
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              className="min-w-[170px] py-2 text-sm"
            >
              <option value="">Todas as cidades</option>
              {(cities.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.state}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Período"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="min-w-[160px] py-2 text-sm"
            >
              {PERIODS.map((p) => (
                <option key={p.days} value={p.days}>
                  {p.label}
                </option>
              ))}
            </Select>
          </>
        }
      >
        Dashboard
      </PageTitle>

      {q.isPending ? (
        <Skeleton className="mt-5 h-[420px]" />
      ) : q.isError ? (
        <ErrorState className="mt-5" message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <>
          <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
            <Kpi
              icon="storefront"
              label="Estabelecimentos ativos"
              value={String(d!.kpis.activeBusinesses)}
              href="/admin/estabelecimentos"
            />
            <Kpi
              icon="verified_user"
              label="Aguardando aprovação"
              value={String(d!.kpis.pendingApprovals)}
              href="/admin/aprovacoes"
              tone={d!.kpis.pendingApprovals ? "warn" : undefined}
            />
            <Kpi icon="event_available" label="Agendamentos no período" value={String(d!.kpis.appointments)} />
            <Kpi icon="payments" label="Volume agendado" value={formatMoney(d!.kpis.bookedVolumeCents)} />
            <Kpi icon="group" label="Clientes" value={String(d!.kpis.clients)} />
            <Kpi icon="person_off" label="Taxa de ausência" value={`${Math.round(d!.kpis.noShowRate * 100)}%`} />
          </div>

          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-4">
            <section className="rounded-2xl border border-line bg-surface p-[18px]">
              <h2 className="m-0 mb-4 text-base font-bold tracking-normal">Agendamentos por dia</h2>
              <div className="flex h-[180px] items-end gap-1.5" role="img" aria-label="Gráfico de agendamentos por dia">
                {byDay!.map((x) => (
                  <div key={x.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[11px] font-bold">{x.count || ""}</span>
                    <span
                      className="w-full max-w-9 rounded-t-md"
                      style={{
                        height: `${(x.count / maxDay) * 100}%`,
                        minHeight: 2,
                        background: x.date === d!.period.today ? "var(--color-accent)" : "var(--color-primary)",
                      }}
                      title={`${x.date}: ${x.count}`}
                    />
                    {byDay!.length <= 14 ? (
                      <span className="text-[10px] text-muted">
                        {weekdayShort(x.date)} {dayOfMonth(x.date)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-[18px]">
              <h2 className="m-0 mb-4 text-base font-bold tracking-normal">Por categoria</h2>
              {d!.appointmentsByCategory.length ? (
                <div className="flex flex-col gap-2.5">
                  {d!.appointmentsByCategory.map((c) => (
                    <div key={c.id} className="flex items-center gap-2.5 text-[13px]">
                      <span className="w-28 shrink-0 truncate font-semibold">{c.name}</span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-soft">
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: `${(c.count / maxCat) * 100}%` }}
                        />
                      </span>
                      <b className="w-8 text-right">{c.count}</b>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="m-0 text-sm text-muted">Sem agendamentos no período.</p>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line-soft px-[18px] py-4">
                <h2 className="m-0 text-base font-bold tracking-normal">Fila de aprovação</h2>
                <Link href="/admin/aprovacoes" className="text-[13px] font-bold text-primary-strong">
                  Ver todos →
                </Link>
              </div>
              {d!.approvalQueue.length ? (
                d!.approvalQueue.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 border-b border-panel-bg px-[18px] py-3 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-sm">{b.name}</b>
                      <span className="text-xs text-muted">
                        {BUSINESS_TYPE_LABEL[b.type]} · {b.neighborhood}
                        {b.submittedAt ? ` · ${formatAgo(b.submittedAt)}` : ""}
                      </span>
                    </div>
                    <Button
                      variant="primary"
                      size="xs"
                      loading={approve.isPending && approve.variables?.id === b.id}
                      onClick={() => approve.mutate({ id: b.id, action: "approve" })}
                    >
                      Aprovar
                    </Button>
                  </div>
                ))
              ) : (
                <div className="px-[18px] py-7 text-center text-[13px] text-muted">Nenhum cadastro pendente.</div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-line bg-surface">
              <h2 className="m-0 border-b border-line-soft px-[18px] py-4 text-base font-bold tracking-normal">
                Mais agendados no período
              </h2>
              {d!.topBusinesses.length ? (
                d!.topBusinesses.map((b, i) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 border-b border-panel-bg px-[18px] py-3 last:border-0"
                  >
                    <span className="w-5 text-sm font-extrabold text-muted">{i + 1}</span>
                    <Link
                      href={`/${b.slug}`}
                      target="_blank"
                      className="min-w-0 flex-1 truncate text-sm font-bold hover:underline"
                    >
                      {b.name}
                    </Link>
                    <b className="text-sm">{b.count}</b>
                  </div>
                ))
              ) : (
                <div className="px-[18px] py-7 text-center text-[13px] text-muted">Sem dados no período.</div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
