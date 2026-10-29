import type { ExploreParams } from "./schemas";

export const EXPLORE_PAGE_SIZE = 12;

/** Filtros da URL (nomes em português) → query da API. */
export function exploreApiQuery(p: ExploreParams, coords?: { lat: number; lng: number }): URLSearchParams {
  const q = new URLSearchParams({ pageSize: String(EXPLORE_PAGE_SIZE), page: String(p.pagina ?? 1) });
  if (p.q) q.set("q", p.q);
  if (p.categoria) q.set("categoryId", p.categoria);
  if (p.bairro) q.set("neighborhood", p.bairro);
  if (p.hoje) q.set("availableToday", "true");
  if (p.ordem === "distance") {
    if (coords) {
      q.set("sort", "distance");
      q.set("lat", coords.lat.toFixed(4));
      q.set("lng", coords.lng.toFixed(4));
    }
  } else if (p.ordem) {
    q.set("sort", p.ordem);
  }
  return q;
}

/** Monta a URL de /explorar mantendo só filtros não vazios. */
export function exploreHref(p: ExploreParams): string {
  const q = new URLSearchParams();
  if (p.q) q.set("q", p.q);
  if (p.categoria) q.set("categoria", p.categoria);
  if (p.bairro) q.set("bairro", p.bairro);
  if (p.hoje) q.set("hoje", "1");
  if (p.ordem && p.ordem !== "relevance") q.set("ordem", p.ordem);
  if (p.pagina && p.pagina > 1) q.set("pagina", String(p.pagina));
  const s = q.toString();
  return `/explorar${s ? `?${s}` : ""}`;
}
