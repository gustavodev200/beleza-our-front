"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ResultCard } from "@/components/client/business-cards";
import { UnservedCity } from "@/components/client/unserved-city";
import { buttonVariants } from "@/components/ui/button";
import { Chip, Toggle } from "@/components/ui/controls";
import { Select } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { EmptyState, ErrorState, ListSkeleton, Notice } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { cityLabel, isServed, type SelectedCity } from "@/lib/city";
import { EXPLORE_PAGE_SIZE, exploreApiQuery, exploreHref } from "@/lib/explore";
import type { ExploreParams } from "@/lib/schemas";
import type { BusinessCard, Category, Page } from "@/lib/types";

const SORTS = [
  { value: "relevance", label: "Relevância" },
  { value: "distance", label: "Mais perto" },
  { value: "rating", label: "Melhor avaliados" },
  { value: "price", label: "Menor preço" },
] as const;

type Coords = { lat: number; lng: number };

function useCoords(enabled: boolean) {
  const [state, setState] = useState<{ coords?: Coords; error?: string }>({});
  const unsupported = enabled && typeof navigator !== "undefined" && !("geolocation" in navigator);
  useEffect(() => {
    if (!enabled || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      () => setState({ error: "Permita o acesso à localização para ordenar por distância." }),
      { maximumAge: 300_000, timeout: 10_000 },
    );
  }, [enabled]);
  const error = unsupported ? "Seu navegador não informa a localização." : state.error;
  return { coords: state.coords, error, loading: enabled && !state.coords && !error };
}

export function ExploreView({
  city,
  served,
  params,
  categories,
  initial,
  serverFailed,
}: {
  city: SelectedCity | null;
  /** Cidades atendidas, só preenchido quando `city` ainda não é atendida. */
  served: SelectedCity[];
  params: ExploreParams;
  categories: Category[];
  initial: Page<BusinessCard> | null;
  serverFailed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.q ?? "");
  const [bairro, setBairro] = useState(params.neighborhood ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const unserved = Boolean(city && !isServed(city));
  const byDistance = params.sort === "distance";
  // Cidade sem estabelecimentos: nem pede a localização.
  const geo = useCoords(byDistance && !unserved);

  const near = useQuery({
    queryKey: ["explore", "distance", params, geo.coords, city?.slug],
    queryFn: () => api<Page<BusinessCard>>(`/businesses?${exploreApiQuery(params, geo.coords, city?.slug)}`),
    enabled: byDistance && Boolean(geo.coords),
  });

  const go = (next: Partial<ExploreParams>) => {
    const merged: ExploreParams = { ...params, ...next, page: next.page ?? undefined };
    startTransition(() => router.push(exploreHref(merged), { scroll: false }));
  };

  const data = byDistance ? near.data : initial;
  const loading = pending || (byDistance && (geo.loading || near.isPending));
  const failed = byDistance ? near.isError : serverFailed;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / EXPLORE_PAGE_SIZE)) : 1;
  const page = params.page ?? 1;
  const hasFilters = Boolean(params.q || params.category || params.neighborhood || params.today || params.sort);

  const filters = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="mb-1.5 text-xs font-bold tracking-[.06em] text-muted uppercase">Categoria</div>
        {[{ id: undefined, name: "Todas", icon: "apps" }, ...categories].map((c) => {
          const active = params.category === c.id;
          return (
            <button
              key={c.id ?? "all"}
              type="button"
              aria-pressed={active}
              onClick={() => go({ category: c.id })}
              className={cn(
                "flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-semibold",
                active ? "bg-ink text-white" : "text-ink hover:bg-soft",
              )}
            >
              <Icon name={c.icon} size={18} />
              {c.name}
            </button>
          );
        })}
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          go({ neighborhood: bairro.trim().slice(0, 60) || undefined });
        }}
      >
        <label htmlFor="neighborhood" className="text-xs font-bold tracking-[.06em] text-muted uppercase">
          Bairro
        </label>
        <div className="flex gap-1.5">
          <input
            id="neighborhood"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            maxLength={60}
            placeholder="Ex.: Setor Bueno"
            className="min-h-10 min-w-0 flex-1 rounded-[10px] border border-line-strong bg-white px-3 text-base outline-none focus:border-primary sm:text-sm"
          />
          <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>
            OK
          </button>
        </div>
        {params.neighborhood ? (
          <Chip
            selected
            onClick={() => {
              setBairro("");
              go({ neighborhood: undefined });
            }}
            className="self-start"
          >
            {params.neighborhood}
            <Icon name="close" size={16} />
          </Chip>
        ) : null}
      </form>
      <div className="flex flex-col gap-2">
        <label htmlFor="sort" className="text-xs font-bold tracking-[.06em] text-muted uppercase">
          Ordenar por
        </label>
        <Select
          id="sort"
          value={params.sort ?? "relevance"}
          onChange={(e) => go({ sort: e.target.value as ExploreParams["sort"] })}
          className="py-2.5 text-sm"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center justify-between rounded-[10px] border border-line-strong bg-white px-3 py-1.5 text-sm font-semibold">
        Com horário hoje
        <Toggle
          checked={Boolean(params.today)}
          onChange={(v) => go({ today: v ? "1" : undefined })}
          label="Com horário hoje"
        />
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-5 sm:px-6 md:pt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="m-0 text-[30px] font-bold md:text-[40px]">Explorar estabelecimentos</h1>
        {data ? (
          <span className="flex items-center gap-2 text-sm text-muted">
            {data.total} em {city ? cityLabel(city) : "todas as cidades"}
            <Link href="/welcome?next=/explore" className="font-bold text-primary-strong">
              Trocar
            </Link>
          </span>
        ) : null}
      </div>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: q.trim().slice(0, 80) || undefined });
        }}
        className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#e1e5e7] bg-white pr-1.5 pl-3.5"
      >
        <Icon name="search" size={20} className="text-muted" />
        <label htmlFor="busca" className="sr-only">
          Buscar por nome, serviço ou bairro
        </label>
        <input
          id="busca"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={80}
          placeholder="Buscar por nome, serviço ou bairro…"
          className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none sm:text-[15px]"
        />
        <button type="submit" className={buttonVariants({ variant: "ink", size: "sm" })}>
          Buscar
        </button>
      </form>

      <button
        type="button"
        onClick={() => setFiltersOpen((v) => !v)}
        aria-expanded={filtersOpen}
        className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border border-line-strong bg-white px-3.5 text-sm font-semibold md:hidden"
      >
        <Icon name="tune" size={18} />
        Filtros{hasFilters ? " · ativos" : ""}
      </button>

      <div className="mt-5 flex flex-wrap items-start gap-7">
        <aside
          className={cn(
            "w-full md:sticky md:top-24 md:block md:max-w-[260px] md:flex-[1_1_220px]",
            filtersOpen ? "block" : "hidden",
          )}
        >
          {filters}
        </aside>
        <section aria-live="polite" aria-busy={loading} className="flex min-w-0 flex-[999_1_520px] flex-col gap-3.5">
          {byDistance && geo.error ? <Notice>{geo.error}</Notice> : null}
          {city && unserved ? (
            <UnservedCity city={city} served={served} />
          ) : loading ? (
            <ListSkeleton rows={4} />
          ) : failed ? (
            <ErrorState
              message={byDistance && near.error ? errorMessage(near.error) : "Não foi possível carregar os resultados."}
              onRetry={() => (byDistance ? near.refetch() : router.refresh())}
            />
          ) : data && data.items.length ? (
            <>
              {data.items.map((b) => (
                <ResultCard key={b.id} business={b} />
              ))}
              {totalPages > 1 ? (
                <nav aria-label="Paginação" className="flex items-center justify-center gap-2 pt-2">
                  {page > 1 ? (
                    <Link
                      href={exploreHref({ ...params, page: page - 1 })}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      ← Anterior
                    </Link>
                  ) : null}
                  <span className="px-2 text-sm text-muted">
                    Página {page} de {totalPages}
                  </span>
                  {page < totalPages ? (
                    <Link
                      href={exploreHref({ ...params, page: page + 1 })}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Próxima →
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </>
          ) : data || !byDistance ? (
            <EmptyState
              icon="search_off"
              title="Nenhum estabelecimento encontrado"
              description="Tente outra categoria ou bairro."
              action={
                <Link href="/explore" className={buttonVariants({ variant: "outline-ink", size: "sm" })}>
                  Limpar filtros
                </Link>
              }
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
