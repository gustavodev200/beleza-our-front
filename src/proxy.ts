import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * 1. CSP com nonce por requisição (scripts só com o nonce; nada de unsafe-inline).
 * 2. Checagem OTIMISTA de sessão: só olha se o cookie existe, para não mostrar
 *    tela protegida a quem nem está logado. Papel, bloqueio e validade da
 *    sessão são decididos pela API em toda requisição (Princípio III).
 */

const isDev = process.env.NODE_ENV !== "production";

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Estilos inline: valores dinâmicos (cores por profissional, posição na agenda)
    // usam o atributo style. Não executa código.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const CLIENT_PROTECTED = ["/agendamentos", "/favoritos", "/notificacoes", "/perfil"];
const OWNER_PUBLIC = ["/painel/entrar", "/painel/cadastro", "/painel/esqueci-senha", "/painel/redefinir-senha"];

function loginFor(pathname: string): string | null {
  if (pathname.startsWith("/admin")) return pathname.startsWith("/admin/entrar") ? null : "/admin/entrar";
  if (pathname === "/minha-agenda") return "/painel/entrar";
  if (pathname.startsWith("/painel")) {
    return OWNER_PUBLIC.some((p) => pathname.startsWith(p)) ? null : "/painel/entrar";
  }
  return CLIENT_PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ? "/entrar" : null;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const login = loginFor(pathname);
  if (login && !getSessionCookie(request, { cookiePrefix: "belezaour" })) {
    const url = request.nextUrl.clone();
    url.pathname = login;
    url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(url);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  // Páginas autenticadas nunca em cache compartilhado.
  if (login) response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  // Fora: API (rewrite), assets do Next, arquivos com extensão (sw.js, ícones, manifest).
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
