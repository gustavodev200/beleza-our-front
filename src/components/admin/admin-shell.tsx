"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/states";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { RequireRole, useMe, useSignOut } from "@/lib/session";
import type { AdminBusinessRow, Page } from "@/lib/types";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "space_dashboard", exact: true },
  { href: "/admin/approvals", label: "Aprovações", icon: "verified_user" },
  { href: "/admin/businesses", label: "Estabelecimentos", icon: "storefront" },
  { href: "/admin/users", label: "Usuários", icon: "group" },
  { href: "/admin/categories", label: "Categorias", icon: "category" },
  { href: "/admin/plans", label: "Planos", icon: "workspace_premium" },
  { href: "/admin/settings", label: "Configurações", icon: "settings" },
];

export const pendingKey = ["admin", "businesses", "PENDING"] as const; // prefixo de adminKeys.businesses

export function usePendingCount(enabled = true) {
  return useQuery({
    enabled,
    queryKey: [...pendingKey, "count"],
    queryFn: () => api<Page<AdminBusinessRow>>("/admin/businesses", { query: { status: "PENDING", pageSize: 1 } }),
    select: (d) => d.total,
    refetchInterval: 120_000,
  });
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useMe();
  const signOut = useSignOut();
  const mfaOk = Boolean(me?.twoFactorEnabled);
  const pending = usePendingCount(mfaOk);

  // Sem 2FA ativo a API recusa tudo (MFA_ENROLLMENT_REQUIRED): leva ao cadastro.
  useEffect(() => {
    if (me && !mfaOk) router.replace("/admin/sign-in?reason=2fa");
  }, [me, mfaOk, router]);
  if (!mfaOk) return <Spinner className="min-h-dvh" />;

  const isActive = (n: (typeof NAV)[number]) => (n.exact ? pathname === n.href : pathname.startsWith(n.href));
  const badge = pending.data ?? 0;

  return (
    <div className="flex min-h-dvh bg-bg">
      <aside className="sticky top-0 hidden h-dvh w-[236px] shrink-0 flex-col gap-5 bg-sidebar px-3.5 py-5 text-sidebar-fg lg:flex">
        <div className="flex items-center gap-2 px-1.5 text-white">
          <Icon name="spa" size={24} />
          <b className="text-lg">belezaOur</b>
          <span className="ml-auto rounded-[5px] bg-accent px-1.5 py-0.5 text-[10px] font-extrabold">ADMIN</span>
        </div>
        <nav className="flex flex-col gap-0.5" aria-label="Administração">
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
                {n.href === "/admin/approvals" && badge > 0 ? (
                  <span className="rounded-full bg-star px-[7px] py-px text-[11px] font-extrabold text-ink">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 rounded-[14px] bg-sidebar-2 p-3">
          <span className="grid size-[34px] place-items-center rounded-full bg-accent text-xs font-extrabold text-white">
            SA
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-white">{me?.name ?? "Super Admin"}</div>
            <div className="truncate text-[11px]">{me?.email}</div>
          </div>
          <button
            type="button"
            onClick={() => signOut("/admin/sign-in")}
            aria-label="Sair"
            className="grid size-9 place-items-center"
          >
            <Icon name="logout" size={20} />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-white lg:hidden">
          <div className="flex h-14 items-center gap-2 px-4">
            <Icon name="spa" size={22} />
            <b>belezaOur</b>
            <span className="rounded-[5px] bg-accent px-1.5 py-0.5 text-[10px] font-extrabold text-white">ADMIN</span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => signOut("/admin/sign-in")}
              aria-label="Sair"
              className="grid size-10 place-items-center text-muted"
            >
              <Icon name="logout" size={20} />
            </button>
          </div>
          <nav className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Administração">
            {NAV.map((n) => {
              const on = isActive(n);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold",
                    on ? "bg-ink text-white" : "bg-soft text-ink-2",
                  )}
                >
                  {n.label}
                  {n.href === "/admin/approvals" && badge > 0 ? (
                    <span className="rounded-full bg-star px-1.5 text-[10px] font-extrabold text-ink">{badge}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="SUPER_ADMIN">
      <Shell>{children}</Shell>
    </RequireRole>
  );
}
