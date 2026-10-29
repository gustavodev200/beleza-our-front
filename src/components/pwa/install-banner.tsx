"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "belezaour:install-dismissed";

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** "Instale o belezaOur" (§4.1): só quando o navegador oferece a instalação. */
export function InstallBanner() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (wasDismissed()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!event) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage bloqueado: só esconde nesta visita */
    }
    setEvent(null);
  };

  return (
    <div
      className="mx-4 mt-3 flex items-center gap-2.5 rounded-[14px] bg-primary-soft p-3 md:hidden"
      role="region"
      aria-label="Instalar aplicativo"
    >
      <Icon name="install_mobile" size={24} className="text-primary-strong" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-bold">Instale o belezaOur</div>
        <div className="text-xs text-[#5d6a71]">Acesso rápido pela tela inicial</div>
      </div>
      <button
        type="button"
        onClick={async () => {
          await event.prompt();
          await event.userChoice.catch(() => undefined);
          setEvent(null);
        }}
        className="min-h-9 rounded-lg bg-primary-strong px-3 text-xs font-bold text-white"
      >
        Instalar
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dispensar"
        className="grid size-9 place-items-center text-muted"
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
