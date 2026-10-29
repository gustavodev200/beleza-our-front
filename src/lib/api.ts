/**
 * Cliente HTTP do navegador. Sempre mesma origem (/api → rewrite para a API),
 * com o cookie httpOnly do Better Auth. Nenhum token passa por JavaScript.
 */

export interface FieldIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
    readonly errors: FieldIssue[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const FALLBACK_MESSAGE = "Não foi possível concluir. Tente novamente.";

/** Mensagem segura para toast: a API já devolve texto em português sem detalhes internos. */
export function errorMessage(error: unknown, fallback = FALLBACK_MESSAGE): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Muitas tentativas. Aguarde um pouco e tente novamente.";
    if (error.status >= 500) return "Erro no servidor. Tente novamente em instantes.";
    return error.message || fallback;
  }
  if (error instanceof TypeError) return "Sem conexão com a internet.";
  return fallback;
}

type Query = Record<string, string | number | boolean | undefined | null | string[]>;

function toQueryString(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

async function parseError(res: Response): Promise<ApiError> {
  let body: { code?: string; message?: string | string[]; errors?: FieldIssue[] } = {};
  try {
    body = await res.json();
  } catch {
    /* corpo vazio ou não-JSON */
  }
  const message = Array.isArray(body.message) ? body.message[0] : body.message;
  return new ApiError(res.status, body.code, message ?? FALLBACK_MESSAGE, body.errors ?? []);
}

/** Área do app pela URL atual — define para qual login um 401 leva. */
export function loginPathFor(pathname: string): string {
  if (pathname.startsWith("/admin")) return "/admin/sign-in";
  if (pathname.startsWith("/dashboard") || pathname === "/my-schedule") return "/dashboard/sign-in";
  return "/sign-in";
}

let redirecting = false;

function handleAuthFailure(error: ApiError): void {
  if (typeof window === "undefined" || redirecting) return;
  const expired = error.status === 401;
  const blocked = error.status === 403 && error.code === "ACCOUNT_BLOCKED";
  const mfa = error.status === 403 && error.code === "MFA_ENROLLMENT_REQUIRED";
  if (!expired && !blocked && !mfa) return;
  const { pathname, search } = window.location;
  const login = loginPathFor(pathname);
  if (pathname.startsWith(login)) return;
  redirecting = true;
  const params = new URLSearchParams({ next: `${pathname}${search}` });
  if (error.code === "ADMIN_SESSION_EXPIRED") params.set("reason", "expired");
  if (blocked) params.set("reason", "blocked");
  if (mfa) params.set("reason", "2fa");
  // Recarga completa de propósito: descarta todo o estado em memória da sessão que caiu.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`${login}?${params.toString()}`);
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal } = options;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(`/api${path}${toQueryString(query)}`, {
    method,
    credentials: "same-origin",
    headers: body !== undefined && !isForm ? { "Content-Type": "application/json" } : undefined,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    signal,
    cache: "no-store",
  });
  if (!res.ok) {
    const error = await parseError(res);
    // Rotas públicas (marketplace) nunca levam ao login.
    if (!path.startsWith("/businesses") && !path.startsWith("/categories")) handleAuthFailure(error);
    throw error;
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Erros esperados que não devem disparar o redirecionamento global. */
export async function apiSilent<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
  const res = await fetch(`/api${path}${toQueryString(options.query)}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}
