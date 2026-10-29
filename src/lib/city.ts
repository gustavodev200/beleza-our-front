/** Cidade escolhida no onboarding (cookie `bo_city`, lido no servidor e no proxy). */
export const CITY_COOKIE = "bo_city";
export const CITY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export interface SelectedCity {
  /** Vazio quando a cidade ainda não é atendida (não existe na tabela da API). */
  id: string;
  name: string;
  state: string;
  slug: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida o formato do cookie; qualquer coisa estranha vira "sem cidade". */
export function parseCity(raw: string | undefined | null): SelectedCity | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<SelectedCity>;
    if (
      typeof v.id === "string" && (v.id === "" || UUID.test(v.id)) &&
      typeof v.name === "string" && v.name.length > 0 && v.name.length <= 80 &&
      typeof v.state === "string" && /^[A-Z]{2}$/.test(v.state) &&
      typeof v.slug === "string" && /^[a-z0-9-]{1,100}$/.test(v.slug)
    ) {
      return { id: v.id, name: v.name, state: v.state, slug: v.slug };
    }
  } catch {
    /* cookie corrompido */
  }
  return null;
}

/** "Goiânia" + "GO" → "goiania-go" (mesmo slug usado na tabela de cidades da API). */
export function citySlug(name: string, uf: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${uf.toLowerCase()}`;
}

export const isServed = (c: SelectedCity) => c.id !== "";

export const cityLabel = (c: Pick<SelectedCity, "name" | "state">) => `${c.name} - ${c.state}`;
