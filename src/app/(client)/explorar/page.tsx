import type { Metadata } from "next";
import { ExploreView } from "@/components/client/explore-view";
import { exploreApiQuery } from "@/lib/explore";
import { exploreParamsSchema } from "@/lib/schemas";
import { serverGet, serverGetOr } from "@/lib/server-api";
import type { BusinessCard, Category, Page } from "@/lib/types";

export const metadata: Metadata = {
  title: "Explorar salões, barbearias e profissionais",
  description: "Busque por serviço, bairro ou nome e veja horários livres de hoje em Goiânia.",
  alternates: { canonical: "/explorar" },
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const params = exploreParamsSchema.parse(flat);

  const categories = await serverGetOr<Category[]>("/categories", [], 300);
  // "Mais perto" depende da localização do aparelho: buscado só no cliente,
  // sem colocar coordenadas na URL.
  let initial: Page<BusinessCard> | null = null;
  let failed = false;
  if (params.ordem !== "distance") {
    try {
      initial = await serverGet<Page<BusinessCard>>(`/businesses?${exploreApiQuery(params)}`, 30);
    } catch {
      failed = true;
    }
  }

  return <ExploreView params={params} categories={categories} initial={initial} serverFailed={failed} />;
}
