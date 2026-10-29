"use client";

import { Toaster } from "sonner";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/** Círculo tingido com o ícone do tipo, como nos toasts de referência. */
function ToastIcon({ name, tone }: { name: string; tone: string }) {
  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", tone)}>
      <Icon name={name} size={20} fill />
    </span>
  );
}

/** Toasts no canto superior direito; cor suave por tipo (sucesso, erro, alerta, info). */
export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      icons={{
        success: <ToastIcon name="check_circle" tone="bg-ok-bg text-ok" />,
        error: <ToastIcon name="error" tone="bg-danger-bg text-danger" />,
        warning: <ToastIcon name="warning" tone="bg-warn-bg text-warn" />,
        info: <ToastIcon name="info" tone="bg-info-bg text-info" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "!gap-3 !rounded-full !border-0 !bg-white !px-4 !py-3 !pr-11 !font-semibold !shadow-[0_8px_28px_rgba(20,36,43,.14)]",
          title: "!text-sm",
          description: "!text-muted !font-normal",
          default: "!text-ink",
          success: "!text-ok",
          error: "!text-danger",
          warning: "!text-warn",
          info: "!text-info",
          closeButton:
            "!left-auto !right-3 !top-1/2 !size-6 !-translate-y-1/2 !translate-x-0 !border-0 !bg-transparent !text-subtle hover:!text-ink",
        },
      }}
    />
  );
}
