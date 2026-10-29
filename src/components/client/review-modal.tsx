"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/controls";
import { Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/overlay";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { REVIEW_TAGS } from "@/lib/labels";
import { reviewSchema } from "@/lib/schemas";
import type { ClientAppointment, ReviewTag } from "@/lib/types";

const RATING_LABEL = ["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"];

export function ReviewModal({ appointment, onClose }: { appointment: ClientAppointment | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<ReviewTag[]>([]);
  const [comment, setComment] = useState("");

  const submit = useMutation({
    mutationFn: () => {
      const body = reviewSchema.parse({ rating, tags, comment: comment.trim() || undefined });
      return api(`/me/appointments/${appointment!.id}/review`, { method: "POST", body });
    },
    onSuccess: () => {
      toast("Obrigado! Sua avaliação foi publicada");
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      setTags([]);
      setComment("");
      setRating(5);
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Modal
      open={Boolean(appointment)}
      onOpenChange={(o) => !o && onClose()}
      title="Como foi?"
      description={appointment ? `${appointment.serviceName} · ${appointment.business.name}` : undefined}
    >
      <div role="radiogroup" aria-label="Nota" className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
            onClick={() => setRating(n)}
            className="grid size-11 place-items-center"
          >
            <Icon name="star" fill={n <= rating} size={34} className={n <= rating ? "text-star" : "text-line-strong"} />
          </button>
        ))}
        <span className="ml-2 text-sm font-semibold text-muted">{RATING_LABEL[rating]}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {REVIEW_TAGS.map((t) => {
          const on = tags.includes(t.id);
          return (
            <Chip
              key={t.id}
              selected={on}
              onClick={() => setTags(on ? tags.filter((x) => x !== t.id) : [...tags, t.id])}
            >
              {t.label}
            </Chip>
          );
        })}
      </div>
      <label className="sr-only" htmlFor="comentario">
        Comentário
      </label>
      <Textarea
        id="comentario"
        rows={3}
        maxLength={500}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Conte como foi (opcional)"
      />
      <div className={cn("-mt-2 text-right text-xs", comment.length > 450 ? "text-warn" : "text-subtle")}>
        {comment.length}/500
      </div>
      <Button onClick={() => submit.mutate()} loading={submit.isPending} variant="primary">
        Publicar avaliação
      </Button>
    </Modal>
  );
}
