"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage } from "./api";
import type { AdminCity, PlatformSettings } from "./types";

export const adminKeys = {
  dashboard: ["admin", "dashboard"] as const,
  businesses: ["admin", "businesses"] as const,
  users: ["admin", "users"] as const,
  categories: ["admin", "categories"] as const,
  cities: ["admin", "cities"] as const,
  settings: ["admin", "settings"] as const,
};

export function useAdminCities() {
  return useQuery({ queryKey: adminKeys.cities, queryFn: () => api<AdminCity[]>("/admin/cities") });
}

export function useSettings() {
  return useQuery({ queryKey: adminKeys.settings, queryFn: () => api<PlatformSettings>("/admin/settings") });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Omit<PlatformSettings, "approvalRequired">>) =>
      api<PlatformSettings>("/admin/settings", { method: "PATCH", body: patch }),
    onSuccess: (data) => {
      qc.setQueryData(adminKeys.settings, data);
      toast("Configuração salva");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/** Ações de moderação de estabelecimento (aprovar, recusar, suspender, reativar, destaque). */
export function useBusinessAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      body,
    }: {
      id: string;
      action: "approve" | "reject" | "suspend" | "reactivate" | "featured";
      body?: unknown;
    }) =>
      action === "featured"
        ? api(`/admin/businesses/${id}/featured`, { method: "PATCH", body })
        : api(`/admin/businesses/${id}/${action}`, { method: "POST", body }),
    onSuccess: (_d, { action, body }) => {
      const msg: Record<string, string> = {
        approve: "Publicado no marketplace — dono avisado",
        reject: "Cadastro recusado — dono avisado com o motivo",
        suspend: "Estabelecimento suspenso",
        reactivate: "Estabelecimento reativado",
        featured: (body as { featured?: boolean })?.featured ? "Em destaque na home" : "Removido dos destaques",
      };
      toast(msg[action]);
      void qc.invalidateQueries({ queryKey: adminKeys.businesses });
      void qc.invalidateQueries({ queryKey: adminKeys.dashboard });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
