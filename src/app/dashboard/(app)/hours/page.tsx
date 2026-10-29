"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { HoursEditor, hoursToRows, rowsToPayload, type DayRow } from "@/components/owner/hours-editor";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/controls";
import { ErrorState, Spinner } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { ownerKeys, useOwnerBusiness } from "@/lib/owner-queries";
import type { OwnerBusiness } from "@/lib/types";

function HoursForm({ b }: { b: OwnerBusiness }) {
  const qc = useQueryClient();
  const [initial] = useState<DayRow[]>(() => hoursToRows(b.hours));
  const [rows, setRows] = useState<DayRow[]>(initial);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const dirty = JSON.stringify(rows) !== JSON.stringify(initial);
  const save = useMutation({
    mutationFn: (days: unknown) => api<OwnerBusiness>("/owner/business/hours", { method: "PUT", body: { days } }),
    onSuccess: (data) => {
      qc.setQueryData(ownerKeys.business, data);
      void qc.invalidateQueries({ queryKey: ownerKeys.agenda });
      toast("Horários atualizados");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="flex flex-col gap-3">
      <HoursEditor rows={rows} onChange={setRows} errors={errors} />
      {/* Fica acima da barra de navegação no celular, para salvar sem rolar até o fim. */}
      <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 shadow-[0_4px_16px_rgba(20,36,43,.08)] lg:bottom-4">
        <span className="pl-1 text-[13px] text-muted">
          {dirty ? "Alterações não salvas" : "Tudo salvo"}
        </span>
        <div className="flex gap-2">
          {dirty ? (
            <Button
              variant="ghost"
              onClick={() => {
                setRows(initial);
                setErrors({});
              }}
            >
              Desfazer
            </Button>
          ) : null}
          <Button
            loading={save.isPending}
            disabled={!dirty}
            onClick={() => {
              const { days, errors: errs, valid } = rowsToPayload(rows);
              setErrors(errs);
              if (!days.length) toast.error("Abra ao menos um dia.");
              else if (!valid) toast.error("Confira os horários destacados.");
              if (valid) save.mutate(days);
            }}
          >
            Salvar horários
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function HoursPage() {
  const q = useOwnerBusiness();
  if (q.isPending) return <Spinner />;
  if (q.isError || !q.data) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  return (
    <div className="flex max-w-[720px] flex-col gap-4">
      <PageTitle sub="Dias e horas em que seu estabelecimento recebe clientes. A agenda online usa esses horários.">
        Horário de funcionamento
      </PageTitle>
      {/* key: horários salvos em outro lugar recriam o formulário com os dados novos */}
      <HoursForm key={JSON.stringify(q.data.hours)} b={q.data} />
    </div>
  );
}
