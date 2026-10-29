/**
 * Aceita só caminhos internos ("/agendamentos?x=1"). Bloqueia URLs absolutas,
 * protocol-relative ("//evil.com"), barras invertidas e esquemas — evita open
 * redirect no parâmetro `next` dos logins.
 */
export function safeRedirect(value: string | null | undefined, fallback = "/"): string {
  if (!value || typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  try {
    const url = new URL(value, "http://local.invalid");
    if (url.origin !== "http://local.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
