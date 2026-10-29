"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { chooseServedCity } from "@/app/welcome/actions";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { cityLabel, type SelectedCity } from "@/lib/city";

/** Estado vazio do catálogo quando a cidade escolhida ainda não tem estabelecimentos. */
export function UnservedCity({ city, served }: { city: SelectedCity; served: SelectedCity[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const pick = (c: SelectedCity) =>
    startTransition(async () => {
      try {
        if (!(await chooseServedCity(c.slug))) throw new Error();
        toast.success(`Mostrando ${cityLabel(c)}`);
        router.refresh();
      } catch {
        toast.error("Não foi possível trocar a cidade. Tente novamente.");
      }
    });

  return (
    <EmptyState
      icon="location_off"
      title={`${city.name} ainda não tem estabelecimentos no belezaOur`}
      description={
        served.length
          ? "Por enquanto estamos nas cidades abaixo. Logo chegamos na sua!"
          : "Logo chegamos na sua cidade!"
      }
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {served.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={pending}
              onClick={() => pick(c)}
              className={buttonVariants({ variant: "outline-ink", size: "sm" })}
            >
              Ver {cityLabel(c)}
            </button>
          ))}
          <Link href="/welcome?next=/explore" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Trocar cidade
          </Link>
        </div>
      }
    />
  );
}
