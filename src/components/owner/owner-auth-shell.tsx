import Link from "next/link";
import { Icon } from "@/components/ui/icon";

const POINTS = [
  ["event_available", "Agendamentos online sem conflito"],
  ["calendar_month", "Agenda por profissional, folgas e bloqueios"],
  ["link", "Link próprio para Instagram e WhatsApp"],
  ["verified_user", "Todo perfil é revisado antes de ir ao ar"],
];

/** Tela dividida da área do estabelecimento (§5.1): proposta de valor + formulário. */
export function OwnerAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-wrap bg-bg">
      <div className="flex flex-[1_1_380px] flex-col justify-between gap-8 bg-ink p-6 text-white sm:p-12">
        <Link href="/" className="flex items-center gap-2 self-start">
          <Icon name="spa" size={26} />
          <b className="text-xl">belezaOur</b>
        </Link>
        <div className="flex flex-col gap-5">
          <h1 className="m-0 text-[30px] leading-[1.05] font-bold sm:text-[44px]">
            Mais clientes para o seu negócio. Menos mensagens no WhatsApp.
          </h1>
          <ul className="m-0 hidden list-none flex-col gap-3.5 p-0 text-[15px] text-sidebar-fg sm:flex">
            {POINTS.map(([icon, text]) => (
              <li key={icon} className="flex items-center gap-3">
                <Icon name={icon} size={22} className="text-accent-soft" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="hidden text-xs text-subtle sm:block">Goiânia · {new Date().getFullYear()}</div>
      </div>
      <div className="flex flex-[1_1_420px] items-start justify-center px-4 py-8 sm:items-center sm:px-6 sm:py-10">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}

export function AuthCardTitle({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {eyebrow ? <div className="text-xs font-bold tracking-[.06em] text-muted uppercase">{eyebrow}</div> : null}
      <h2 className="m-0 text-[30px] leading-tight font-bold">{title}</h2>
      {sub ? <div className="text-sm text-muted">{sub}</div> : null}
    </div>
  );
}
