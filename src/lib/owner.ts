import type { Me } from "./types";

/** Para onde o dono vai depois do login, conforme o status do cadastro. */
export function ownerHome(me: Me, next?: string): string {
  if (!me.business || me.business.status === "DRAFT") return "/dashboard/sign-up";
  if (me.business.status === "ACTIVE")
    return next && (next.startsWith("/dashboard") || next === "/my-schedule") ? next : "/dashboard";
  return "/dashboard/status";
}
