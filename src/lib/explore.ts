import type { ExploreParams } from "./schemas";

export const EXPLORE_PAGE_SIZE = 12;

/** Filtros da URL (nomes em português) → query da API. */
export function exploreApiQuery(
  p: ExploreParams,
  coords?: { lat: number; lng: number },
  citySlug?: string,
): URLSearchParams {
  const q = new URLSearchParams({ pageSize: String(EXPLORE_PAGE_SIZE), page: String(p.page ?? 1) });
  // Slug (não id): cidade ainda sem cadastro também filtra e volta vazia.
  if (citySlug) q.set("citySlug", citySlug);
  if (p.q) q.set("q", p.q);
  if (p.category) q.set("categoryId", p.category);
  if (p.neighborhood) q.set("neighborhood", p.neighborhood);
  if (p.today) q.set("availableToday", "true");
  if (p.sort === "distance") {
    if (coords) {
      q.set("sort", "distance");
      q.set("lat", coords.lat.toFixed(4));
      q.set("lng", coords.lng.toFixed(4));
    }
  } else if (p.sort) {
    q.set("sort", p.sort);
  }
  return q;
}

/** Monta a URL de /explore mantendo só filtros não vazios. */
export function exploreHref(p: ExploreParams): string {
  const q = new URLSearchParams();
  if (p.q) q.set("q", p.q);
  if (p.category) q.set("category", p.category);
  if (p.neighborhood) q.set("neighborhood", p.neighborhood);
  if (p.today) q.set("today", "1");
  if (p.sort && p.sort !== "relevance") q.set("sort", p.sort);
  if (p.page && p.page > 1) q.set("page", String(p.page));
  const s = q.toString();
  return `/explore${s ? `?${s}` : ""}`;
}
