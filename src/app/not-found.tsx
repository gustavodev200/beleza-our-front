import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <Icon name="explore_off" size={44} className="text-subtle" />
      <h1 className="m-0 text-[26px] font-bold">Página não encontrada</h1>
      <p className="m-0 text-[15px] text-muted">O endereço pode estar errado ou a página saiu do ar.</p>
      <Link
        href="/"
        className="mt-2 inline-flex min-h-11 items-center rounded-[11px] bg-ink px-5 text-sm font-bold text-white"
      >
        Ir para o início
      </Link>
    </main>
  );
}
