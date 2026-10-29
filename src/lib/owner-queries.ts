"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, api } from "./api";
import type { Category, City, OwnerBusiness, OwnerProfessional, OwnerService } from "./types";

export const ownerKeys = {
  business: ["owner", "business"] as const,
  services: ["owner", "services"] as const,
  professionals: ["owner", "professionals"] as const,
  overview: ["owner", "overview"] as const,
  agenda: ["owner", "agenda"] as const,
};

/** Estabelecimento do dono logado; null quando ainda não criou (404). */
export function useOwnerBusiness(enabled = true) {
  return useQuery({
    queryKey: ownerKeys.business,
    queryFn: async () => {
      try {
        return await api<OwnerBusiness>("/owner/business");
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    enabled,
  });
}

export function useOwnerServices(enabled = true) {
  return useQuery({ queryKey: ownerKeys.services, queryFn: () => api<OwnerService[]>("/owner/services"), enabled });
}

export function useOwnerProfessionals(enabled = true) {
  return useQuery({
    queryKey: ownerKeys.professionals,
    queryFn: () => api<OwnerProfessional[]>("/owner/professionals"),
    enabled,
  });
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => api<Category[]>("/categories"), staleTime: 300_000 });
}

export function useCities() {
  return useQuery({ queryKey: ["cities"], queryFn: () => api<City[]>("/cities"), staleTime: 300_000 });
}

/** Prévia do slug (o definitivo é gerado e garantido único pela API). */
export function slugPreview(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "nome-do-negocio"
  );
}
