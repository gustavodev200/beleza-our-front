import type { Me } from "./types";

/** Para onde o dono vai depois do login, conforme o status do cadastro. */
export function ownerHome(me: Me, next?: string): string {
  if (!me.business || me.business.status === "DRAFT") return "/painel/cadastro";
  if (me.business.status === "ACTIVE")
    return next && (next.startsWith("/painel") || next === "/minha-agenda") ? next : "/painel";
  return "/painel/status";
}
