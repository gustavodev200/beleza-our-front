import Link from "next/link";
import { CompactCard, FeaturedCard, bookingHref } from "@/components/client/business-cards";
import { buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatRelativeDay, formatTime, localDate } from "@/lib/format";
import { POPULAR_SEARCHES } from "@/lib/labels";
import { serverGetOr } from "@/lib/server-api";
import type { BusinessCard, Category } from "@/lib/types";

function SearchBox({ compact }: { compact?: boolean }) {
  // Formulário GET puro: funciona sem JavaScript e cai direto em /explorar?q=.
  return (
    <form
      action="/explorar"
      role="search"
      className={
        compact
          ? "flex items-center gap-2 rounded-xl bg-white px-3"
          : "flex flex-wrap items-center gap-2 rounded-2xl border border-[#e1e5e7] bg-white py-1.5 pr-1.5 pl-4 shadow-search"
      }
    >
      <Icon name="search" size={20} className="text-muted" />
      <label htmlFor={compact ? "q-m" : "q"} className="sr-only">
        Qual serviço você procura?
      </label>
      <input
        id={compact ? "q-m" : "q"}
        name="q"
        maxLength={80}
        placeholder={compact ? "O que você procura?" : "Qual serviço você procura?"}
        className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none sm:text-[15px]"
      />
      {compact ? null : (
        <span className="hidden items-center gap-1 border-l border-line px-3 text-[13px] font-semibold text-ink-2 sm:flex">
          <Icon name="location_on" size={17} />
          Goiânia - GO
        </span>
      )}
      <button type="submit" className={buttonVariants({ variant: "ink", size: compact ? "sm" : "md" })}>
        Buscar
      </button>
    </form>
  );
}

export default async function HomePage() {
  const [categories, featured] = await Promise.all([
    serverGetOr<Category[]>("/categories", [], 300),
    serverGetOr<BusinessCard[]>("/businesses/featured", [], 30),
  ]);
  const heroNext = featured.find((b) => b.nextSlots.length);

  return (
    <>
      {/* Hero web */}
      <section className="mx-auto hidden max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-10 px-6 pt-10 md:grid">
        <div className="flex flex-col gap-5">
          <div className="text-[13px] font-semibold text-primary-strong">
            Salões, barbearias e profissionais em Goiânia
          </div>
          <h1 className="m-0 text-[clamp(40px,5vw,62px)] leading-[1.05] font-bold">
            Beleza e bem-estar, <em className="text-accent">mais perto</em> de você
          </h1>
          <p className="m-0 max-w-[480px] text-[17px] leading-relaxed text-[#5d6a71]">
            Compare serviços, preços e avaliações e marque seu horário em poucos cliques — sem trocar mensagens com
            vários profissionais.
          </p>
          <SearchBox />
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
            Populares:
            {POPULAR_SEARCHES.map((p) => (
              <Link
                key={p}
                href={`/explorar?q=${encodeURIComponent(p)}`}
                className="inline-flex min-h-8 items-center rounded-full border border-[#e1e5e7] bg-white px-3 text-ink hover:border-ink"
              >
                {p}
              </Link>
            ))}
          </div>
        </div>
        <div className="relative grid h-[480px] min-w-0 grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-3.5">
          <div className="h-[440px] rounded-[28px] bg-[repeating-linear-gradient(135deg,oklch(0.9_0.035_20)_0_12px,oklch(0.875_0.042_20)_12px_24px)]" />
          <div className="mt-20 h-[400px] rounded-[28px] bg-[repeating-linear-gradient(135deg,oklch(0.9_0.035_210)_0_12px,oklch(0.875_0.042_210)_12px_24px)]" />
          {heroNext ? (
            <Link
              href={bookingHref(heroNext.slug, {
                serviceId: heroNext.nextSlots[0].serviceId,
                startsAt: heroNext.nextSlots[0].startsAt,
              })}
              className="absolute bottom-2 left-3 flex max-w-[calc(100%-24px)] items-center gap-3 rounded-[18px] bg-white px-3.5 py-3 shadow-float"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-primary-soft">
                <Icon name="event_available" size={22} className="text-primary-strong" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] text-muted">Próximo horário · {heroNext.name}</span>
                <span className="block text-sm font-bold">
                  {formatRelativeDay(localDate(heroNext.nextSlots[0].startsAt))},{" "}
                  {formatTime(heroNext.nextSlots[0].startsAt)}
                </span>
              </span>
              <span className="ml-1.5 rounded-[9px] bg-ink px-3 py-2 text-xs font-bold text-white">Agendar</span>
            </Link>
          ) : null}
        </div>
      </section>

      {/* Hero mobile */}
      <section className="px-4 pt-3 md:hidden">
        <div className="relative overflow-hidden rounded-[22px] bg-ink px-4 pt-5 pb-4">
          <div className="absolute top-0 right-0 bottom-[70px] w-[46%] bg-[repeating-linear-gradient(135deg,#24363d_0_10px,#1e2f35_10px_20px)]" />
          <div className="relative max-w-[62%] text-white">
            <h1 className="m-0 text-[32px] leading-none font-bold">
              Seu estilo, <em className="text-accent-soft">seu momento</em>
            </h1>
            <p className="mt-2 mb-0 text-xs text-sidebar-fg">Salões, barbearias e autônomas perto de você.</p>
          </div>
          <div className="relative mt-4">
            <SearchBox compact />
          </div>
        </div>
      </section>

      {/* Categorias */}
      {categories.length ? (
        <section aria-label="Categorias" className="mx-auto max-w-[1200px] px-4 pt-6 sm:px-6 md:pt-9">
          <div className="grid grid-cols-4 gap-x-1.5 gap-y-3.5 md:grid-cols-[repeat(auto-fill,minmax(118px,1fr))] md:gap-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/explorar?categoria=${c.id}`}
                className="flex flex-col items-center gap-1.5 text-[11px] font-semibold transition md:rounded-[14px] md:border md:border-line md:bg-white md:px-2 md:py-[18px] md:text-[13px] md:hover:-translate-y-0.5"
              >
                <span className="grid size-[54px] place-items-center rounded-2xl bg-primary-soft text-primary-strong md:size-auto md:bg-transparent md:text-ink">
                  <Icon name={c.icon} size={26} />
                </span>
                <span className="text-center">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Destaques */}
      <section className="mx-auto max-w-[1200px] px-4 pt-7 sm:px-6 md:pt-11">
        <div className="mb-3 flex items-baseline justify-between gap-3 md:mb-4">
          <h2 className="m-0 text-base font-bold md:text-[32px]">Em destaque em Goiânia</h2>
          <Link href="/explorar" className="text-[13px] font-bold text-primary-strong md:text-sm">
            Ver todos →
          </Link>
        </div>
        {featured.length ? (
          <>
            <div className="hidden grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5 md:grid">
              {featured.slice(0, 8).map((b, i) => (
                <FeaturedCard key={b.id} business={b} priority={i < 4} />
              ))}
            </div>
            <div className="flex flex-col gap-2.5 md:hidden">
              {featured.slice(0, 8).map((b) => (
                <CompactCard key={b.id} business={b} />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d3dadd] bg-white p-8 text-center text-sm text-muted">
            Em breve, os melhores lugares de Goiânia aparecem aqui.{" "}
            <Link href="/explorar" className="font-bold">
              Explorar agora
            </Link>
          </div>
        )}
      </section>

      {/* Para profissionais */}
      <section className="mx-auto mt-10 max-w-[1200px] px-4 sm:px-6 md:mt-14">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-center gap-8 rounded-3xl bg-ink p-6 text-white sm:p-10">
          <div className="flex flex-col gap-4">
            <div className="text-[13px] font-semibold text-accent-soft">Para quem oferece serviços</div>
            <h2 className="m-0 text-[28px] leading-[1.15] font-bold sm:text-[40px]">
              Organize sua agenda e conquiste novos clientes na sua cidade.
            </h2>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/painel/cadastro" className={buttonVariants({ variant: "white" })}>
                Cadastrar meu negócio
              </Link>
              <Link href="/painel/entrar" className={buttonVariants({ variant: "dark-outline" })}>
                Entrar no painel
              </Link>
            </div>
          </div>
          <ul className="m-0 grid list-none gap-3.5 p-0 text-[15px] text-[#d3dadd]">
            {[
              ["event_available", "Agendamentos online, sem conflito de horário"],
              ["calendar_month", "Agenda por profissional, folgas e bloqueios"],
              ["link", "Link próprio para Instagram e WhatsApp"],
              ["person_pin_circle", "Do salão completo à profissional autônoma"],
            ].map(([icon, text]) => (
              <li key={icon} className="flex items-center gap-3">
                <Icon name={icon} size={22} className="text-white" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
