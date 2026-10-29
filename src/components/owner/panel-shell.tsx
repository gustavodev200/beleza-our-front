"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { BusinessImage } from "@/components/ui/business-image";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/states";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { BUSINESS_TYPE_LABEL } from "@/lib/labels";
import { ownerKeys, useOwnerBusiness } from "@/lib/owner-queries";
import { RequireRole, useMe, useSignOut } from "@/lib/session";
import type { Overview } from "@/lib/types";
import { BlockModal } from "./block-modal";
import { CounterModal } from "./counter-modal";

const NAV = [
  { href: "/dashboard", label: "Visão geral", short: "Início", icon: "space_dashboard", exact: true },
  { href: "/dashboard/schedule", label: "Agenda", short: "Agenda", icon: "calendar_month" },
  { href: "/dashboard/services", label: "Serviços", short: "Serviços", icon: "design_services" },
  { href: "/dashboard/professionals", label: "Profissionais", short: "Equipe", icon: "groups" },
  { href: "/dashboard/hours", label: "Horários", short: "Horários", icon: "schedule" },
  { href: "/dashboard/profile", label: "Perfil público", short: "Perfil", icon: "storefront" },
];
// Barra inferior do celular: 4 itens fixos + "Mais" com o restante.
const MOBILE_MAIN = NAV.slice(0, 4);
const MOBILE_MORE = NAV.slice(4);

interface PanelActions {
  openNew: (preset?: { professionalId?: string; date?: string }) => void;
  openBlock: (preset?: { professionalId?: string; date?: string }) => void;
}

const PanelContext = createContext<PanelActions>({ openNew: () => undefined, openBlock: () => undefined });
export const usePanel = () => useContext(PanelContext);

export function useOverview(enabled = true) {
  return useQuery({
    queryKey: ownerKeys.overview,
    queryFn: () => api<Overview>("/owner/overview"),
    enabled,
    refetchInterval: 60_000,
  });
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useMe();
  const business = useOwnerBusiness();
  const signOut = useSignOut();
  const active = business.data?.status === "ACTIVE";
  const overview = useOverview(active);
  const pending = overview.data?.newAndPending.length ?? 0;
  const [modal, setModal] = useState<{ kind: "new" | "block"; professionalId?: string; date?: string } | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  // Painel operacional só depois da aprovação (§5.3).
  useEffect(() => {
    if (business.isPending) return;
    if (business.data === null || business.data?.status === "DRAFT") router.replace("/dashboard/sign-up");
    else if (business.data && !active) router.replace("/dashboard/status");
  }, [business.isPending, business.data, active, router]);

  if (!active || !business.data) return <Spinner className="min-h-dvh" />;
  const b = business.data;

  const isActive = (n: (typeof NAV)[number]) => (n.exact ? pathname === n.href : pathname.startsWith(n.href));
  const moreActive = MOBILE_MORE.some(isActive);
  const tabClass = (on: boolean) =>
    cn(
      "relative flex min-h-11 flex-col items-center gap-0.5 py-1 text-[10px]",
      on ? "font-bold text-ink" : "font-medium text-subtle",
    );

  return (
    <PanelContext.Provider
      value={{
        openNew: (p) => setModal({ kind: "new", ...p }),
        openBlock: (p) => setModal({ kind: "block", ...p }),
      }}
    >
      <div className="flex min-h-dvh bg-panel-bg">
        <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col gap-5 bg-sidebar px-3.5 py-5 text-sidebar-fg lg:flex">
          <Link href="/dashboard" className="flex items-center gap-2 px-1.5 text-white">
            <Icon name="spa" size={24} />
            <b className="text-lg tracking-[-0.02em]">belezaOur</b>
            <span className="ml-auto rounded-[5px] bg-[#2b4048] px-1.5 py-0.5 text-[10px] font-bold">PRO</span>
          </Link>
          <nav className="flex flex-col gap-0.5" aria-label="Painel">
            {NAV.map((n) => {
              const on = isActive(n);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-semibold",
                    on ? "bg-primary text-white" : "hover:bg-white/5",
                  )}
                >
                  <Icon name={n.icon} size={20} />
                  <span className="flex-1">{n.label}</span>
                  {n.exact && pending > 0 ? (
                    <span className="rounded-full bg-star px-[7px] py-px text-[11px] font-extrabold text-ink">
                      {pending}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto flex flex-col gap-2.5 rounded-[14px] bg-sidebar-2 p-3">
            <div className="flex items-center gap-2.5">
              <BusinessImage
                src={b.logoUrl}
                seed={b.name}
                alt=""
                kind="logo"
                className="size-[38px] shrink-0 rounded-[10px]"
              />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold text-white">{b.name}</div>
                <div className="text-[11px]">{BUSINESS_TYPE_LABEL[b.type]}</div>
              </div>
            </div>
            <Link href={`/${b.slug}`} target="_blank" className="text-xs font-semibold text-white">
              Ver perfil público →
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-4 sm:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
              <Icon name="spa" size={24} />
              <b className="text-base">belezaOur</b>
            </Link>
            <div className="flex-1" />
            <Link
              href="/dashboard"
              className="relative grid size-11 place-items-center rounded-full hover:bg-soft"
              aria-label={pending ? `${pending} agendamentos novos ou pendentes` : "Novos e pendentes"}
            >
              <Icon name="notifications" size={23} />
              {pending ? (
                <span className="absolute top-2 right-2 size-[9px] rounded-full border-2 border-white bg-accent" />
              ) : null}
            </Link>
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-full bg-[oklch(0.92_0.04_262)] text-[13px] font-extrabold text-[oklch(0.38_0.1_262)]">
                {initials(me?.name ?? "")}
              </span>
              <div className="hidden sm:block">
                <div className="text-[13px] font-bold">{me?.name}</div>
                <div className="text-[11px] text-muted">{b.name}</div>
              </div>
              <button
                type="button"
                onClick={() => signOut("/dashboard/sign-in")}
                title="Sair"
                aria-label="Sair"
                className="grid size-10 place-items-center rounded-full text-muted hover:bg-soft"
              >
                <Icon name="logout" size={20} />
              </button>
            </div>
          </header>
          <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 lg:pb-6">{children}</main>
        </div>

        {moreOpen ? (
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMoreOpen(false)}
            className="fixed inset-0 z-30 bg-ink/30 lg:hidden"
          />
        ) : null}
        {moreOpen ? (
          <div
            id="panel-more"
            className="fixed right-2 bottom-[calc(68px+env(safe-area-inset-bottom))] left-2 z-40 flex flex-col gap-0.5 rounded-2xl border border-line bg-white p-2 shadow-[0_8px_28px_rgba(20,36,43,.18)] lg:hidden"
          >
            {MOBILE_MORE.map((n) => {
              const on = isActive(n);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={on ? "page" : undefined}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold",
                    on ? "bg-soft text-ink" : "text-ink-2 hover:bg-soft",
                  )}
                >
                  <Icon name={n.icon} size={22} fill={on} />
                  {n.label}
                </Link>
              );
            })}
          </div>
        ) : null}

        <nav
          aria-label="Painel"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-soft bg-white px-1 pt-2 pb-safe lg:hidden"
        >
          {MOBILE_MAIN.map((n) => {
            const on = isActive(n) && !moreOpen;
            return (
              <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined} className={tabClass(on)}>
                <Icon name={n.icon} size={24} fill={on} />
                {n.short}
                {n.exact && pending > 0 ? (
                  <span className="absolute top-0 right-[22%] rounded-full bg-star px-1.5 text-[10px] font-extrabold text-ink">
                    {pending}
                  </span>
                ) : null}
              </Link>
            );
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="panel-more"
            onClick={() => setMoreOpen((v) => !v)}
            className={tabClass(moreActive || moreOpen)}
          >
            <Icon name={moreOpen ? "close" : "more_horiz"} size={24} />
            Mais
          </button>
        </nav>
      </div>

      <CounterModal
        open={modal?.kind === "new"}
        preset={modal?.kind === "new" ? modal : undefined}
        onClose={() => setModal(null)}
      />
      <BlockModal
        open={modal?.kind === "block"}
        preset={modal?.kind === "block" ? modal : undefined}
        onClose={() => setModal(null)}
      />
    </PanelContext.Provider>
  );
}

export function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="BUSINESS_OWNER">
      <Shell>{children}</Shell>
    </RequireRole>
  );
}
