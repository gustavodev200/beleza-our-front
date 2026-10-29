"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui/states";
import { apiSilent } from "./api";
import { authClient } from "./auth-client";
import type { Me, Role } from "./types";

export const meKey = ["me"] as const;

const LOGIN_BY_ROLE: Record<Role, string> = {
  CLIENT: "/sign-in",
  BUSINESS_OWNER: "/dashboard/sign-in",
  SUPER_ADMIN: "/admin/sign-in",
};

/**
 * Perfil do usuário logado, ou null. Fonte: GET /api/me, que relê papel e
 * bloqueio do banco — nunca o conteúdo do cookie.
 */
export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: () => apiSilent<Me>("/me"),
    staleTime: 60_000,
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  const router = useRouter();
  return async (to = "/") => {
    try {
      await authClient.signOut();
    } finally {
      qc.clear();
      // Remove páginas/imagens em cache do SW: o próximo usuário do aparelho
      // não deve ver nada desta sessão.
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith("belezaour-")).map((k) => caches.delete(k)));
      }
      router.replace(to);
      router.refresh();
    }
  };
}

/**
 * Bloqueia a renderização até confirmar o papel na API. Só UX: cada rota da
 * API valida papel e posse de novo (Princípio III).
 */
export function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const { data: me, isPending } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = me?.role === role;

  useEffect(() => {
    if (isPending || allowed) return;
    const login = LOGIN_BY_ROLE[role];
    router.replace(`${login}?next=${encodeURIComponent(pathname)}${me ? "&reason=role" : ""}`);
  }, [isPending, allowed, me, pathname, router, role]);

  if (!allowed) return <Spinner className="min-h-[50dvh]" />;
  return <>{children}</>;
}
