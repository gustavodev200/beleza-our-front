"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { disablePush, enablePush, publicKey, pushState, type PushState } from "@/lib/push";

const COPY: Record<"client" | "owner", string> = {
  client: "Avisamos 15 minutos antes e na hora do seu horário, além de confirmações e mudanças.",
  owner: "Avisamos 15 minutos antes e na hora de cada atendimento, e quando chega um agendamento novo.",
};

/** Card "Ativar notificações neste aparelho" (Web Push). Some se o servidor não tiver push. */
export function PushOptIn({ audience, className }: { audience: "client" | "owner"; className?: string }) {
  const [key, setKey] = useState<string | null>(null);
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([publicKey(), pushState()])
      .then(([k, s]) => {
        if (!alive) return;
        setKey(k);
        setState(s);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!key || !state || state === "unsupported") return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (state === "on") {
        await disablePush();
        setState("off");
        toast.success("Notificações desativadas neste aparelho.");
      } else {
        const next = await enablePush(key);
        setState(next);
        if (next === "on") toast.success("Notificações ativadas neste aparelho.");
        else if (next === "denied")
          toast.error("Permissão negada. Libere as notificações nas configurações do navegador.");
      }
    } catch (e) {
      toast.error(errorMessage(e, "Não foi possível ativar as notificações."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-[14px] border border-line px-4 py-3.5",
        state === "on" ? "bg-surface" : "bg-primary-soft",
        className,
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white">
        <Icon
          name={state === "on" ? "notifications_active" : "notifications"}
          size={19}
          className="text-primary-strong"
        />
      </span>
      <div className="min-w-[180px] flex-1">
        <div className="text-sm font-bold">
          {state === "on" ? "Notificações ativas neste aparelho" : "Receba lembretes neste aparelho"}
        </div>
        <div className="text-[13px] leading-snug text-ink-2">
          {state === "ios-install"
            ? "No iPhone, adicione o belezaOur à Tela de Início (Compartilhar → Adicionar à Tela de Início) e abra por lá para ativar."
            : state === "denied"
              ? "As notificações estão bloqueadas. Libere nas configurações do navegador para este site."
              : COPY[audience]}
        </div>
      </div>
      {state === "on" || state === "off" ? (
        <Button variant={state === "on" ? "outline" : "primary"} size="sm" loading={busy} onClick={toggle}>
          {state === "on" ? "Desativar" : "Ativar"}
        </Button>
      ) : null}
    </div>
  );
}
