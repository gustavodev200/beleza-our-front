import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export default function BusinessUnavailable() {
  return (
    <div className="mx-auto max-w-[560px] px-4 pt-16">
      <EmptyState
        icon="storefront"
        title="Estabelecimento indisponível"
        description="Este perfil não está no ar no momento. Que tal procurar outro lugar perto de você?"
        action={
          <Link href="/explore" className={buttonVariants({ variant: "ink", size: "sm" })}>
            Explorar
          </Link>
        }
      />
    </div>
  );
}
