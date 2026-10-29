"use client";

import Link from "next/link";
import { bookingHref } from "@/components/client/business-cards";
import { FavoriteButton, useFavorites } from "@/components/client/favorite-button";
import { BusinessImage } from "@/components/ui/business-image";
import { buttonVariants } from "@/components/ui/button";
import { Rating } from "@/components/ui/controls";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { errorMessage } from "@/lib/api";
import { BUSINESS_TYPE_LABEL } from "@/lib/labels";
import { RequireRole } from "@/lib/session";

function Favorites() {
  const q = useFavorites(true);
  if (q.isPending) return <ListSkeleton rows={2} />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data.length) {
    return (
      <EmptyState
        icon="favorite"
        title="Salve seus lugares preferidos"
        description="Toque no coração de qualquer estabelecimento."
        action={
          <Link href="/explorar" className={buttonVariants({ size: "sm" })}>
            Explorar
          </Link>
        }
      />
    );
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
      {q.data.map((b) => (
        <article
          key={b.id}
          className="relative overflow-hidden rounded-2xl border border-line bg-surface hover:shadow-card"
        >
          <div className="relative h-[150px]">
            <BusinessImage src={b.coverUrl} seed={b.name} alt="" className="absolute inset-0" />
            <FavoriteButton businessId={b.id} className="absolute top-2.5 right-2.5 z-10" />
          </div>
          <div className="flex flex-col gap-1.5 px-4 pt-3.5 pb-4">
            <h2 className="m-0 text-base font-bold tracking-normal">
              <Link href={`/${b.slug}`} className="after:absolute after:inset-0">
                {b.name}
              </Link>
            </h2>
            <div className="text-[13px] text-muted">
              {BUSINESS_TYPE_LABEL[b.type]} · {b.neighborhood}
            </div>
            <Rating value={b.ratingAvg} count={b.ratingCount} />
            <Link
              href={bookingHref(b.slug)}
              className={buttonVariants({ size: "sm", className: "relative z-10 mt-1.5" })}
            >
              Agendar
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-5 sm:px-6 md:pt-7">
      <h1 className="mt-0 mb-[18px] text-[30px] font-bold md:text-[40px]">Favoritos</h1>
      <RequireRole role="CLIENT">
        <Favorites />
      </RequireRole>
    </div>
  );
}
