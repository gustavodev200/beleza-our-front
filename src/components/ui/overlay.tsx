"use client";

import { Dialog as D } from "radix-ui";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/**
 * Modal acessível (Radix): foco preso, Esc fecha, foco volta ao gatilho.
 * No mobile vira folha que sobe da base.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[90] animate-fade-in bg-[rgba(20,36,43,.45)]" />
        <D.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[91] flex max-h-[92dvh] animate-slide-up flex-col gap-4 overflow-y-auto rounded-t-[22px] bg-surface p-5 pb-safe shadow-modal outline-none",
            "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[calc(100%-40px)] sm:max-w-[520px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[22px] sm:p-6",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <D.Title className="m-0 text-2xl font-bold tracking-[-0.02em] sm:text-[26px]">{title}</D.Title>
              {description ? (
                <D.Description className="mt-1 text-sm text-muted">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">{typeof title === "string" ? title : "Janela"}</D.Description>
              )}
            </div>
            <D.Close
              className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-soft"
              aria-label="Fechar"
            >
              <Icon name="close" size={22} />
            </D.Close>
          </div>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** Gaveta lateral (detalhes do agendamento). Em telas pequenas ocupa a largura toda. */
export function Drawer({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[90] animate-fade-in bg-[rgba(20,36,43,.3)]" />
        <D.Content className="fixed inset-y-0 right-0 z-[91] flex w-full max-w-[380px] animate-slide-left flex-col gap-4 overflow-y-auto border-l border-line bg-surface p-5 outline-none">
          <div className="flex items-center justify-between">
            <D.Title className="m-0 text-base font-bold">{title}</D.Title>
            <D.Close className="grid size-10 place-items-center rounded-full hover:bg-soft" aria-label="Fechar">
              <Icon name="close" size={20} />
            </D.Close>
          </div>
          <D.Description className="sr-only">Detalhes e ações</D.Description>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
