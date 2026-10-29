import type { MetadataRoute } from "next";
import { serverGetOr } from "@/lib/server-api";
import { SITE_URL } from "@/lib/site";
import type { BusinessCard, Page } from "@/lib/types";

export const revalidate = 3600;

/** Home, Explorar e perfis ativos (até 20 páginas da busca pública). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/explorar`, changeFrequency: "daily", priority: 0.8 },
  ];
  for (let page = 1; page <= 20; page += 1) {
    const res = await serverGetOr<Page<BusinessCard> | null>(`/businesses?page=${page}&pageSize=20`, null, 3600);
    if (!res) break;
    for (const b of res.items) pages.push({ url: `${SITE_URL}/${b.slug}`, changeFrequency: "weekly", priority: 0.7 });
    if (page * res.pageSize >= res.total) break;
  }
  return pages;
}
