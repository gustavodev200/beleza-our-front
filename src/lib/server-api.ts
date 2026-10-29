import "server-only";

/**
 * Chamadas públicas feitas no servidor (SSR das páginas do marketplace).
 * Vão direto à API interna; nunca carregam cookie do usuário.
 */
const API_URL = process.env.API_URL ?? "http://localhost:3333";

export class NotFoundError extends Error {}

export async function serverGet<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    next: { revalidate },
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) throw new NotFoundError(path);
  if (!res.ok) throw new Error(`API ${res.status} em ${path.split("?")[0]}`);
  return (await res.json()) as T;
}

/** Variante tolerante: devolve `fallback` se a API estiver fora — a página continua de pé. */
export async function serverGetOr<T>(path: string, fallback: T, revalidate = 60): Promise<T> {
  try {
    return await serverGet<T>(path, revalidate);
  } catch {
    return fallback;
  }
}
