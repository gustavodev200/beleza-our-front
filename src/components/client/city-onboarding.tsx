"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { chooseCity, chooseServedCity } from "@/app/welcome/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Notice, Skeleton } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import { cityLabel, type SelectedCity } from "@/lib/city";

interface UF {
  uf: string;
  name: string;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
}

export function CityOnboarding({
  served,
  current,
  next,
}: {
  served: SelectedCity[];
  current: SelectedCity | null;
  next: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const listId = useId();
  const [uf, setUf] = useState(current?.state ?? served[0]?.state ?? "");
  const [city, setCity] = useState(current?.name ?? "");
  const [query, setQuery] = useState(current?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);

  const states = useQuery({
    queryKey: ["ibge", "estados"],
    queryFn: () => getJson<UF[]>("/locations/states"),
    staleTime: Infinity,
    retry: 1,
  });
  const cities = useQuery({
    queryKey: ["ibge", "municipios", uf],
    queryFn: () => getJson<string[]>(`/locations/cities/${uf}`),
    enabled: Boolean(uf),
    staleTime: Infinity,
    retry: 1,
  });

  const servedNames = useMemo(() => new Set(served.map((c) => `${c.state}:${norm(c.name)}`)), [served]);
  const matches = useMemo(() => {
    const q = norm(query.trim());
    const all = cities.data ?? [];
    const list = q ? all.filter((n) => norm(n).includes(q)) : all;
    // Cidades atendidas primeiro; o resto segue a ordem alfabética do IBGE.
    return [...list]
      .sort((a, b) => Number(servedNames.has(`${uf}:${norm(b)}`)) - Number(servedNames.has(`${uf}:${norm(a)}`)))
      .slice(0, 40);
  }, [cities.data, query, servedNames, uf]);

  const finish = (to = next) => {
    startTransition(() => {
      router.replace(to);
      router.refresh();
    });
  };

  const pick = (name: string) => {
    setCity(name);
    setQuery(name);
    setOpen(false);
  };

  const submit = async () => {
    if (!uf || !city) return;
    setFailed(false);
    try {
      // Cidade ainda não atendida vai direto ao catálogo, que mostra o aviso e as cidades disponíveis.
      const served = await chooseCity(city, uf);
      finish(served || next !== "/" ? next : "/explore");
    } catch {
      setFailed(true);
    }
  };

  const pickServed = async (slug: string) => {
    setFailed(false);
    try {
      if (await chooseServedCity(slug)) return finish();
    } catch {
      /* cai no aviso abaixo */
    }
    setFailed(true);
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Painel de marca */}
      <aside
        aria-hidden
        className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12"
      >
        <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,#24363d_0_14px,#1e2f35_14px_28px)] opacity-60" />
        <div className="relative flex items-center gap-2 text-white">
          <Icon name="spa" size={30} />
          <span className="text-2xl font-extrabold tracking-[-0.02em]">belezaOur</span>
        </div>
        <div className="relative max-w-[440px] text-white">
          <h2 className="m-0 text-[44px] leading-[1.05] font-bold">
            Seu estilo, <em className="text-accent-soft">na sua cidade</em>
          </h2>
          <p className="mt-4 mb-0 text-base leading-relaxed text-sidebar-fg">
            Mostramos só o que está perto de você: salões, barbearias e profissionais com horários livres.
          </p>
        </div>
        <ul className="relative m-0 flex list-none flex-col gap-3 p-0 text-sm text-sidebar-fg">
          {[
            ["location_on", "Resultados da sua cidade"],
            ["event_available", "Horários livres em tempo real"],
            ["verified", "Avaliações de clientes reais"],
          ].map(([icon, text]) => (
            <li key={icon} className="flex items-center gap-2.5">
              <Icon name={icon} size={20} className="text-accent-soft" />
              {text}
            </li>
          ))}
        </ul>
      </aside>

      {/* Formulário */}
      <main className="flex flex-col px-5 py-6 sm:px-10 lg:px-16 lg:py-12">
        <div className="flex items-center justify-between lg:justify-end">
          <span className="flex items-center gap-2 lg:hidden">
            <Icon name="spa" size={26} />
            <span className="text-xl font-extrabold tracking-[-0.02em]">belezaOur</span>
          </span>
          {current ? (
            <Link href={next} className="text-[13px] font-semibold text-ink-2 hover:text-ink">
              Continuar em {cityLabel(current)}
            </Link>
          ) : null}
        </div>

        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center gap-6 py-8">
          <div className="flex flex-col gap-2">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary-strong">
              <Icon name="location_on" size={26} />
            </span>
            <h1 className="m-0 text-[30px] leading-tight font-bold sm:text-[36px]">Onde você quer se cuidar?</h1>
            <p className="m-0 text-[15px] leading-relaxed text-muted">
              Escolha seu estado e sua cidade. Você pode trocar quando quiser.
            </p>
          </div>

          {served.length ? (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold tracking-[.06em] text-muted uppercase">Disponível agora</div>
              <div className="flex flex-wrap gap-2">
                {served.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={pending}
                    onClick={() => void pickServed(c.slug)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold hover:border-ink disabled:opacity-50"
                  >
                    <Icon name="near_me" size={18} className="text-primary-strong" />
                    {cityLabel(c)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-3 text-xs text-subtle">
            <span className="h-px flex-1 bg-line" />
            ou escolha outra
            <span className="h-px flex-1 bg-line" />
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (open && !city && matches[active]) return pick(matches[active]);
              void submit();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="uf" className="text-[13px] font-semibold">
                Estado
              </label>
              {states.isPending ? (
                <Skeleton className="h-[50px] rounded-[10px]" />
              ) : (
                <Select
                  id="uf"
                  value={uf}
                  onChange={(e) => {
                    setUf(e.target.value);
                    setCity("");
                    setQuery("");
                  }}
                >
                  <option value="">Selecione o estado</option>
                  {(states.data ?? []).map((s) => (
                    <option key={s.uf} value={s.uf}>
                      {s.name} ({s.uf})
                    </option>
                  ))}
                </Select>
              )}
            </div>

            <div className="relative flex flex-col gap-1.5">
              <label htmlFor="cidade" className="text-[13px] font-semibold">
                Cidade
              </label>
              <div className="relative">
                <Icon
                  name="search"
                  size={20}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                />
                <input
                  id="cidade"
                  role="combobox"
                  aria-expanded={open}
                  aria-controls={listId}
                  aria-autocomplete="list"
                  autoComplete="off"
                  disabled={!uf}
                  value={query}
                  maxLength={60}
                  placeholder={uf ? "Digite o nome da cidade" : "Escolha o estado primeiro"}
                  onFocus={() => setOpen(true)}
                  onBlur={() => setTimeout(() => setOpen(false), 120)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCity("");
                    setActive(0);
                    setOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActive((i) => Math.min(i + 1, matches.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActive((i) => Math.max(i - 1, 0));
                    } else if (e.key === "Escape") setOpen(false);
                  }}
                  className="min-h-[50px] w-full rounded-[10px] border-[1.5px] border-[#dde2e4] bg-surface py-3 pr-3 pl-10 text-base text-ink outline-none transition-colors placeholder:text-subtle focus:border-primary disabled:bg-soft disabled:text-muted sm:text-[15px]"
                />
              </div>
              {open && uf ? (
                <ul
                  id={listId}
                  role="listbox"
                  className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-line-strong bg-surface p-1 shadow-card"
                >
                  {cities.isPending ? (
                    <li className="px-3 py-2.5 text-sm text-muted">Carregando cidades…</li>
                  ) : cities.isError ? (
                    <li className="px-3 py-2.5 text-sm text-danger">
                      Não foi possível carregar as cidades.{" "}
                      <button type="button" className="font-bold underline" onMouseDown={() => void cities.refetch()}>
                        Tentar de novo
                      </button>
                    </li>
                  ) : matches.length ? (
                    matches.map((name, i) => {
                      const isServed = servedNames.has(`${uf}:${norm(name)}`);
                      return (
                        <li
                          key={name}
                          role="option"
                          aria-selected={i === active}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            pick(name);
                          }}
                          onMouseEnter={() => setActive(i)}
                          className={cn(
                            "flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-sm font-medium",
                            i === active && "bg-soft",
                          )}
                        >
                          {name}
                          {isServed ? (
                            <span className="rounded-full bg-ok-bg px-2 py-0.5 text-[11px] font-bold text-ok">
                              Disponível
                            </span>
                          ) : null}
                        </li>
                      );
                    })
                  ) : (
                    <li className="px-3 py-2.5 text-sm text-muted">Nenhuma cidade encontrada.</li>
                  )}
                </ul>
              ) : null}
            </div>

            {states.isError ? (
              <Notice tone="danger">
                Não foi possível carregar a lista de estados.{" "}
                <button type="button" className="font-bold underline" onClick={() => void states.refetch()}>
                  Tentar de novo
                </button>
              </Notice>
            ) : null}

            {failed ? <Notice tone="danger">Algo deu errado. Tente novamente.</Notice> : null}

            <Button type="submit" size="lg" block loading={pending} disabled={!city} icon="arrow_forward">
              Ver estabelecimentos
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
