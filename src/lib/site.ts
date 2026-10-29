/** Origem pública do app (links compartilháveis, metadata, sitemap). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** "belezaour.app/studio-bella" — como o link aparece para o dono. */
export function publicLinkLabel(slug: string): string {
  return `${SITE_URL.replace(/^https?:\/\//, "")}/${slug}`;
}

export function publicLink(slug: string): string {
  return `${SITE_URL}/${slug}`;
}
