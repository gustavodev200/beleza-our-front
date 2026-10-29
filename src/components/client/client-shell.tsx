"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { InstallBanner } from "@/components/pwa/install-banner";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { useMe } from "@/lib/session";

const NAV = [
  { href: "/", label: "Início", icon: "home", match: (p: string) => p === "/" },
  { href: "/explorar", label: "Explorar", icon: "search", match: (p: string) => p.startsWith("/explorar") },
  { href: "/agendamentos", label: "Agendamentos", icon: "event", match: (p: string) => p.startsWith("/agendamentos") },
  { href: "/favoritos", label: "Favoritos", icon: "favorite", match: (p: string) => p.startsWith("/favoritos") },
];

export function useUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => api<{ count: number }>("/me/notifications/unread-count"),
    enabled,
    refetchInterval: 60_000,
    select: (d) => d.count,
  });
}

function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)} aria-label="belezaOur — início">
      <Icon name="spa" size={26} />
      <span className="text-xl font-extrabold tracking-[-0.02em]">belezaOur</span>
    </Link>
  );
}

function Bell({ hasUnread }: { hasUnread: boolean }) {
  return (
    <Link
      href="/notificacoes"
      className="relative grid size-11 place-items-center rounded-full hover:bg-soft"
      aria-label={hasUnread ? "Notificações (há novas)" : "Notificações"}
    >
      <Icon name="notifications" size={23} />
      {hasUnread ? (
        <span className="absolute top-2 right-2 size-[9px] rounded-full border-2 border-white bg-accent" />
      ) : null}
    </Link>
  );
}

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: me } = useMe();
  const { data: unread = 0 } = useUnreadCount(Boolean(me));
  const isOwner = me?.role === "BUSINESS_OWNER";

  const tabs = [
    ...NAV,
    {
      href: "/perfil",
      label: "Perfil",
      icon: "person",
      match: (p: string) => p.startsWith("/perfil") || p.startsWith("/entrar"),
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="scrollbar-none hidden min-w-0 flex-1 gap-0.5 overflow-x-auto md:flex" aria-label="Principal">
            {NAV.map((n) => {
              const active = n.match(pathname);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap",
                    active ? "bg-soft text-ink" : "text-ink-2 hover:bg-soft",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex-1 md:hidden" />
          <span className="hidden items-center gap-1 rounded-full border border-line-strong px-2.5 py-1 text-xs font-semibold max-sm:flex md:hidden">
            <Icon name="location_on" size={15} />
            Goiânia
          </span>
          <Link
            href={isOwner ? "/painel" : "/painel/entrar"}
            className="hidden min-h-10 items-center rounded-[10px] border border-ink bg-surface px-3.5 text-[13px] font-bold whitespace-nowrap hover:bg-ink hover:text-white lg:inline-flex"
          >
            {isOwner ? "Meu painel" : "Para profissionais"}
          </Link>
          {me ? <Bell hasUnread={unread > 0} /> : null}
          {me ? (
            <Link
              href="/perfil"
              title={me.name}
              aria-label="Meu perfil"
              className="hidden size-9 place-items-center rounded-full bg-[oklch(0.92_0.04_20)] text-[13px] font-bold text-[oklch(0.38_0.1_20)] md:grid"
            >
              {initials(me.name)}
            </Link>
          ) : (
            <Link
              href={`/entrar?next=${encodeURIComponent(pathname)}`}
              className="inline-flex min-h-10 items-center rounded-[10px] bg-ink px-3.5 text-[13px] font-bold whitespace-nowrap text-white"
            >
              <span className="sm:hidden">Entrar</span>
              <span className="hidden sm:inline">Entrar / Criar conta</span>
            </Link>
          )}
        </div>
      </header>

      <InstallBanner />

      <main id="conteudo" className="flex-1 pb-24 md:pb-0">
        {children}
      </main>

      <footer className="mx-auto mt-16 hidden w-full max-w-[1200px] flex-wrap justify-between gap-3 border-t border-line px-6 py-6 text-[13px] text-muted md:flex">
        <span className="flex items-center gap-1.5 font-bold text-ink">
          <Icon name="spa" size={18} />
          belezaOur
        </span>
        <span>Beleza, bem-estar e praticidade em um só lugar · Goiânia</span>
        <Link href="/painel/entrar" className="font-semibold text-ink-2 hover:text-ink">
          Área do profissional
        </Link>
      </footer>

      <nav
        aria-label="Navegação inferior"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-soft bg-white px-1.5 pt-2 pb-safe md:hidden"
      >
        {tabs.map((t) => {
          const active = t.match(pathname);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 flex-col items-center gap-0.5 py-1 text-[10px]",
                active ? "font-bold text-ink" : "font-medium text-subtle",
              )}
            >
              <Icon name={t.icon} size={24} fill={active} />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
