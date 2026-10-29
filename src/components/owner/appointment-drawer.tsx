"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, Badge } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Drawer } from "@/components/ui/overlay";
import { ErrorState, Spinner } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import {
  formatDuration,
  formatLongDate,
  formatMoney,
  formatPhone,
  formatTime,
  localDate,
  whatsappLink,
} from "@/lib/format";
import { STATUS_BADGE } from "@/lib/labels";
import { ownerKeys } from "@/lib/owner-queries";
import type { OwnerAction, OwnerAppointment } from "@/lib/types";

const ACTION_TOAST: Record<OwnerAction, string> = {
  confirm: "Agendamento confirmado — cliente avisada no WhatsApp",
  complete: "Marcado como concluído",
  cancel: "Agendamento cancelado — cliente avisada",
  "no-show": "Marcado como não compareceu",
  reopen: "Agendamento reaberto",
};

export function useOwnerAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: OwnerAction }) =>
      api<OwnerAppointment>(`/owner/appointments/${id}/${action}`, { method: "POST" }),
    onSuccess: (data, { action }) => {
      toast(ACTION_TOAST[action]);
      qc.setQueryData(["owner", "appointment", data.id], data);
      void qc.invalidateQueries({ queryKey: ownerKeys.agenda });
      void qc.invalidateQueries({ queryKey: ownerKeys.overview });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function AppointmentDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["owner", "appointment", id],
    queryFn: () => api<OwnerAppointment>(`/owner/appointments/${id}`),
    enabled: Boolean(id),
  });
  const act = useOwnerAction();
  const a = q.data;
  const run = (action: OwnerAction) => a && act.mutate({ id: a.id, action });
  const busy = (action: OwnerAction) => act.isPending && act.variables?.action === action;
  const started = a ? new Date(a.startsAt) <= new Date() : false;

  return (
    <Drawer open={Boolean(id)} onOpenChange={(o) => !o && onClose()} title="Detalhes do agendamento">
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : a ? (
        <>
          <div className="flex items-start justify-between gap-2">
            <div>
              <b className="text-[17px]">{a.serviceName}</b>
              <div className="mt-0.5 text-[13px] text-muted">
                {formatLongDate(localDate(a.startsAt))} · {formatTime(a.startsAt)}–{formatTime(a.endsAt)}
              </div>
            </div>
            <Badge tone={STATUS_BADGE[a.status].tone} size="sm">
              {STATUS_BADGE[a.status].label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-bg p-3">
            <Avatar name={a.client.name} size={40} />
            <div className="min-w-0 flex-1">
              <b className="text-sm">{a.client.name}</b>
              <div className="text-xs text-muted">{formatPhone(a.client.phoneNumber) || "Sem telefone"}</div>
            </div>
            {a.client.phoneNumber ? (
              <a
                href={whatsappLink(a.client.phoneNumber)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir WhatsApp da cliente"
                className="grid size-10 place-items-center rounded-full border border-line-strong bg-white"
              >
                <Icon name="chat" size={18} />
              </a>
            ) : null}
          </div>
          <dl className="m-0 flex flex-col gap-2.5 text-[13px]">
            {[
              ["Profissional", a.professional.name],
              ["Duração", formatDuration(a.durationMinutes)],
              ["Valor", formatMoney(a.priceCents)],
              ["Origem", a.origin === "APP" ? "App" : "Balcão"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="m-0 font-bold">{v}</dd>
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <dt className="text-muted">Observações</dt>
              <dd className="m-0">{a.notes || "—"}</dd>
            </div>
            {a.status === "CANCELED" && a.cancelledBy ? (
              <div className="text-muted">
                Cancelado pel{a.cancelledBy === "CLIENT" ? "a cliente" : "o estabelecimento"}.
              </div>
            ) : null}
          </dl>

          <div className="mt-1 flex flex-col gap-2">
            {a.status === "PENDING" ? (
              <Button variant="primary" onClick={() => run("confirm")} loading={busy("confirm")}>
                Confirmar agendamento
              </Button>
            ) : null}
            {a.status === "CONFIRMED" ? (
              <>
                <Button
                  onClick={() => run("complete")}
                  loading={busy("complete")}
                  disabled={!started}
                  title={started ? undefined : "Disponível após o início"}
                >
                  Marcar como concluído
                </Button>
                <Button
                  variant="danger-outline"
                  onClick={() => run("no-show")}
                  loading={busy("no-show")}
                  disabled={!started}
                >
                  Marcar como não compareceu
                </Button>
              </>
            ) : null}
            {a.status === "PENDING" || a.status === "CONFIRMED" ? (
              <Button variant="outline" onClick={() => run("cancel")} loading={busy("cancel")}>
                Cancelar agendamento
              </Button>
            ) : null}
            {a.status === "COMPLETED" || a.status === "CANCELED" || a.status === "NO_SHOW" ? (
              <Button variant="outline" onClick={() => run("reopen")} loading={busy("reopen")}>
                Reabrir agendamento
              </Button>
            ) : null}
            {a.status === "CONFIRMED" && !started ? (
              <p className="m-0 text-xs text-muted">Concluir e “não compareceu” liberam após o horário de início.</p>
            ) : null}
          </div>
        </>
      ) : null}
    </Drawer>
  );
}
