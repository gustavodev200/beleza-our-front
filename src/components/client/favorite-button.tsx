"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useMe } from "@/lib/session";
import type { FavoriteBusiness } from "@/lib/types";

export const favoritesKey = ["favorites"] as const;

export function useFavorites(enabled: boolean) {
  return useQuery({
    queryKey: favoritesKey,
    queryFn: () => api<FavoriteBusiness[]>("/me/favorites"),
    enabled,
  });
}

/** Coração de favoritar; sem sessão leva ao login e volta para a mesma página. */
export function useFavoriteToggle(businessId: string) {
  const { data: me } = useMe();
  const isClient = me?.role === "CLIENT";
  const { data: favorites } = useFavorites(isClient);
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const isFav = Boolean(favorites?.some((f) => f.id === businessId));

  const mutation = useMutation({
    mutationFn: (next: boolean) => api(`/me/favorites/${businessId}`, { method: next ? "PUT" : "DELETE" }),
    onSuccess: (_d, next) => {
      toast(next ? "Salvo nos favoritos" : "Removido dos favoritos");
      void qc.invalidateQueries({ queryKey: favoritesKey });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const toggle = () => {
    if (!me) {
      router.push(`/entrar?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!isClient) {
      toast("Favoritos são da conta de cliente.");
      return;
    }
    mutation.mutate(!isFav);
  };

  return { isFav, toggle, pending: mutation.isPending };
}

export function FavoriteButton({
  businessId,
  variant = "floating",
  className,
}: {
  businessId: string;
  variant?: "floating" | "plain" | "labeled";
  className?: string;
}) {
  const { isFav, toggle, pending } = useFavoriteToggle(businessId);
  const icon = (
    <Icon
      name="favorite"
      fill={isFav}
      size={variant === "plain" ? 22 : 19}
      className={isFav ? "text-heart" : "text-ink"}
    />
  );
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  };
  if (variant === "labeled") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={isFav}
        className={cn(
          "inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border border-line-strong bg-surface px-3.5 text-[13px] font-semibold",
          className,
        )}
      >
        {icon}
        {isFav ? "Salvo" : "Favoritar"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={isFav}
      aria-label={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
      className={cn(
        "grid place-items-center rounded-full",
        variant === "floating" ? "size-9 bg-white shadow-sm" : "size-10",
        className,
      )}
    >
      {icon}
    </button>
  );
}
