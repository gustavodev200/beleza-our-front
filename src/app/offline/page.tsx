import type { Metadata } from "next";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Sem conexão", robots: { index: false } };

/** Fallback do service worker. Sem dados de usuário: pode ficar em cache. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <Icon name="wifi_off" size={44} className="text-subtle" />
      <h1 className="m-0 text-[26px] font-bold">Você está sem internet</h1>
      <p className="m-0 max-w-sm text-[15px] text-muted">
        Verifique sua conexão. Seus agendamentos continuam salvos — é só voltar quando a conexão voltar.
      </p>
      <a
        href=""
        className="mt-2 inline-flex min-h-11 items-center rounded-[11px] bg-ink px-5 text-sm font-bold text-white"
      >
        Tentar novamente
      </a>
    </main>
  );
}
