"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { BusinessImage } from "@/components/ui/business-image";
import { Icon } from "@/components/ui/icon";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ownerKeys } from "@/lib/owner-queries";
import type { OwnerBusiness } from "@/lib/types";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Capa (1600×600) e logo (512×512) com prévia do perfil. O tipo real do
 * arquivo é validado de novo na API (magic bytes); aqui é só para avisar cedo.
 */
export function BusinessImagesEditor({ business }: { business: OwnerBusiness }) {
  const qc = useQueryClient();
  const coverInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: ({ slot, file }: { slot: "cover" | "logo"; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      return api<OwnerBusiness>(`/owner/business/${slot}`, { method: "POST", body: form });
    },
    onSuccess: (data, { slot }) => {
      qc.setQueryData(ownerKeys.business, data);
      toast(slot === "cover" ? "Capa atualizada" : "Logo atualizada");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const pick = (slot: "cover" | "logo") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      toast.error("Envie uma imagem JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("A imagem pode ter no máximo 5 MB.");
      return;
    }
    upload.mutate({ slot, file });
  };

  const busy = (slot: "cover" | "logo") => upload.isPending && upload.variables?.slot === slot;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => coverInput.current?.click()}
        className="group relative block h-[140px] w-full sm:h-[180px]"
        aria-label="Trocar capa"
      >
        <BusinessImage src={business.coverUrl} seed={business.name} alt="" className="absolute inset-0" />
        <span className="absolute right-3 bottom-3 inline-flex min-h-9 items-center gap-1.5 rounded-[9px] bg-white/95 px-3 text-xs font-bold shadow-sm">
          <Icon
            name={busy("cover") ? "progress_activity" : "photo_camera"}
            size={16}
            className={cn(busy("cover") && "animate-spin")}
          />
          {business.coverUrl ? "Trocar capa" : "Adicionar capa"}
        </span>
      </button>
      <div className="flex items-end gap-3.5 px-5 pb-[18px]">
        <button
          type="button"
          onClick={() => logoInput.current?.click()}
          className="relative -mt-11 size-[88px] shrink-0 overflow-hidden rounded-[22px] border-4 border-white bg-white shadow-sm"
          aria-label="Trocar logo"
        >
          <BusinessImage src={business.logoUrl} seed={business.name} alt="" kind="logo" className="absolute inset-0" />
          <span className="absolute inset-x-0 bottom-0 grid h-6 place-items-center bg-ink/70 text-white">
            <Icon
              name={busy("logo") ? "progress_activity" : "photo_camera"}
              size={14}
              className={cn(busy("logo") && "animate-spin")}
            />
          </span>
        </button>
        <div className="min-w-0 pt-2.5">
          <b className="text-[17px]">{business.name}</b>
          <div className="text-xs text-muted">
            Capa e logo aparecem no perfil, nas buscas e no link compartilhado. JPEG, PNG ou WebP até 5 MB.
          </div>
        </div>
      </div>
      <input ref={coverInput} type="file" accept={TYPES.join(",")} hidden onChange={pick("cover")} />
      <input ref={logoInput} type="file" accept={TYPES.join(",")} hidden onChange={pick("logo")} />
    </div>
  );
}
