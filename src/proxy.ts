import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { CITY_COOKIE, parseCity } from "@/lib/city";

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

const CLIENT_PROTECTED = ["/appointments", "/favorites", "/notifications", "/profile"];
const OWNER_PUBLIC = ["/dashboard/sign-in", "/dashboard/sign-up", "/dashboard/forgot-password", "/dashboard/reset-password"];

function loginFor(pathname: string): string | null {
  if (pathname.startsWith("/admin")) return pathname.startsWith("/admin/sign-in") ? null : "/admin/sign-in";
  if (pathname === "/my-schedule") return "/dashboard/sign-in";
  if (pathname.startsWith("/dashboard")) {
    return OWNER_PUBLIC.some((p) => pathname.startsWith(p)) ? null : "/dashboard/sign-in";
  }
  return CLIENT_PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ? "/sign-in" : null;
}

/** Páginas que exigem cidade escolhida; /welcome é o onboarding. Robôs passam direto (SEO). */
const CITY_GATED = ["/", "/explore"];
const BOT = /bot|crawl|spider|slurp|lighthouse|facebookexternalhit|whatsapp|preview/i;

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    CITY_GATED.includes(pathname) &&
    !parseCity(request.cookies.get(CITY_COOKIE)?.value) &&
    !BOT.test(request.headers.get("user-agent") ?? "")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(url);
  }

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
