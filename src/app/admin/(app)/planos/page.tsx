"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { ErrorState, Notice, Skeleton } from "@/components/ui/states";
import { useSettings, useUpdateSettings } from "@/lib/admin-queries";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";

const PLANS = [
  {
    name: "Grátis",
    price: "R$ 0",
    per: "para sempre",
    dark: false,
    feats: [
      "Vitrine no marketplace",
      "Agenda online e link próprio",
      "Profissionais até o limite abaixo",
      "Notificações in-app",
    ],
  },
  {
    name: "Pro",
    price: "R$ 49",
    per: "por mês",
    dark: true,
    feats: [
      "Tudo do Grátis",
      "Profissionais ilimitados",
      "Lembretes no WhatsApp",
      "Prioridade nos destaques locais",
      "Relatórios do mês",
    ],
  },
];

function LimitForm({ initial }: { initial: number }) {
  const update = useUpdateSettings();
  const [limit, setLimit] = useState(String(initial));
  const [error, setError] = useState<string>();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(limit);
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      setError("Use um número de 1 a 50");
      return;
    }
    setError(undefined);
    update.mutate({ maxActiveProfessionals: n });
  };

  return (
    <form onSubmit={save} className="flex flex-wrap items-end gap-3" noValidate>
      <Field label="Máximo de profissionais ativas" error={error} className="w-[220px]">
        {(p) => (
          <Input {...p} type="number" min={1} max={50} value={limit} onChange={(e) => setLimit(e.target.value)} />
        )}
      </Field>
      <Button type="submit" loading={update.isPending}>
        Salvar
      </Button>
    </form>
  );
}

export default function PlansPage() {
  const settings = useSettings();

  return (
    <>
      <PageTitle sub="Cobrança fica fora do MVP: no lançamento todos os estabelecimentos estão no Grátis.">
        Planos
      </PageTitle>
      <div className="mt-5 grid max-w-[820px] grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4">
        {PLANS.map((p) => (
          <section
            key={p.name}
            className={cn(
              "flex flex-col gap-3 rounded-2xl border p-5",
              p.dark ? "border-ink bg-ink text-white" : "border-line bg-surface",
            )}
          >
            <div className="flex items-center justify-between">
              <b className="text-lg">{p.name}</b>
              {!p.dark ? (
                <span className="rounded-full bg-ok-bg px-2.5 py-0.5 text-xs font-bold text-ok">Em uso</span>
              ) : (
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold">Em breve</span>
              )}
            </div>
            <div>
              <span className="text-[34px] font-extrabold tracking-[-0.02em]">{p.price}</span>
              <span className={cn("ml-1 text-sm", p.dark ? "text-sidebar-fg" : "text-muted")}>{p.per}</span>
            </div>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
              {p.feats.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Icon name="check" size={18} className={p.dark ? "text-accent-soft" : "text-ok"} />
                  {f}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-5 max-w-[820px] rounded-2xl border border-line bg-surface p-5">
        <h2 className="m-0 mb-1 text-base font-bold tracking-normal">Limite do plano Grátis</h2>
        <p className="mt-0 mb-3 text-sm text-muted">
          Profissionais ativas por estabelecimento. Vale na hora para novos cadastros e ativações.
        </p>
        {settings.isPending ? (
          <Skeleton className="h-12" />
        ) : settings.isError ? (
          <ErrorState message={errorMessage(settings.error)} onRetry={() => settings.refetch()} />
        ) : (
          <LimitForm initial={settings.data.maxActiveProfessionals} />
        )}
        <Notice tone="info" className="mt-4">
          Troca de plano e cobrança automática chegam numa próxima versão.
        </Notice>
      </section>
    </>
  );
}
