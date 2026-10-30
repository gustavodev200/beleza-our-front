"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/controls";
import { SectionLabel, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { Notice } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { addDays, dayOfMonth, formatRelativeDay, formatTime, localDate } from "@/lib/format";
import { BLOCK_DURATIONS, BLOCK_REASONS } from "@/lib/labels";
import { ownerKeys, useOwnerProfessionals } from "@/lib/owner-queries";
import type { BlockReason, BlockResult } from "@/lib/types";

const STARTS = Array.from({ length: 34 }, (_, i) => {
  const m = 6 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${m % 60 ? "30" : "00"}`;
});

/** Bloquear horário (§5.7): some na hora da agenda online; conflitos viram aviso. */
export function BlockModal({
  open,
  preset,
  onClose,
}: {
  open: boolean;
  preset?: { professionalId?: string; date?: string };
  onClose: () => void;
}) {
  // O conteúdo do modal desmonta ao fechar: cada abertura começa do zero.
  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Pausa ou bloqueio"
      description="O período some na hora da agenda online das clientes."
    >
      <BlockForm preset={preset} onClose={onClose} />
    </Modal>
  );
}

function BlockForm({ preset, onClose }: { preset?: { professionalId?: string; date?: string }; onClose: () => void }) {
  const qc = useQueryClient();
  const pros = useOwnerProfessionals();
  const today = localDate();
  // Sem profissional = pausa do estabelecimento todo (fecha para todas).
  const [professionalId, setProfessionalId] = useState<string | null>(preset?.professionalId ?? null);
  const [date, setDate] = useState(preset?.date && preset.date >= today ? preset.date : today);
  const [start, setStart] = useState("13:00");
  const [duration, setDuration] = useState<(typeof BLOCK_DURATIONS)[number]["id"]>("2h");
  const [reason, setReason] = useState<BlockReason>(preset?.professionalId ? "APPOINTMENT" : "BREAK");
  const [conflicts, setConflicts] = useState<BlockResult["conflicts"]>([]);

  const save = useMutation({
    mutationFn: () =>
      api<BlockResult>("/owner/blocks", {
        method: "POST",
        body: {
          ...(professionalId ? { professionalId } : {}),
          date,
          duration,
          reason,
          ...(duration === "day" ? {} : { start }),
        },
      }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ownerKeys.agenda });
      void qc.invalidateQueries({ queryKey: ownerKeys.overview });
      if (res.conflicts.length) {
        setConflicts(res.conflicts);
        toast("Período bloqueado — há agendamentos nesse horário");
        return;
      }
      toast(professionalId ? "Período bloqueado na agenda online" : "Estabelecimento fechado nesse período");
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      {conflicts.length ? (
        <>
          <Notice>
            Há agendamentos nesse período — eles continuam na agenda. Remarque com a cliente se precisar.
            <ul className="mt-2 mb-0 pl-4">
              {conflicts.map((c) => (
                <li key={c.id}>
                  {formatTime(c.startsAt)} · {c.client.name} · {c.serviceName}
                </li>
              ))}
            </ul>
          </Notice>
          <Button onClick={onClose}>Entendi</Button>
        </>
      ) : (
        <>
          <SectionLabel>Quem para</SectionLabel>
          <div className="-mt-2 flex flex-wrap gap-1.5">
            <Chip selected={professionalId === null} onClick={() => setProfessionalId(null)}>
              Estabelecimento todo (fechar)
            </Chip>
            {(pros.data ?? [])
              .filter((p) => p.active)
              .map((p) => (
                <Chip key={p.id} selected={p.id === professionalId} onClick={() => setProfessionalId(p.id)}>
                  {p.name}
                </Chip>
              ))}
          </div>
          <SectionLabel>Dia</SectionLabel>
          <div className="-mx-1 -mt-2 scrollbar-none flex gap-1.5 overflow-x-auto px-1 pb-1">
            {Array.from({ length: 14 }, (_, i) => addDays(today, i)).map((d) => {
              const rel = formatRelativeDay(d, today);
              return (
                <Chip key={d} selected={d === date} onClick={() => setDate(d)} className="shrink-0">
                  {rel === "Hoje" || rel === "Amanhã" ? rel : `${rel.slice(0, 3)} ${dayOfMonth(d)}`}
                </Chip>
              );
            })}
          </div>
          <SectionLabel>Duração</SectionLabel>
          <div className="-mt-2 flex flex-wrap gap-1.5">
            {BLOCK_DURATIONS.map((d) => (
              <Chip key={d.id} selected={d.id === duration} onClick={() => setDuration(d.id)}>
                {d.label}
              </Chip>
            ))}
          </div>
          {duration !== "day" ? (
            <>
              <SectionLabel>Início</SectionLabel>
              <Select
                aria-label="Início"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="-mt-2 max-w-[160px]"
              >
                {STARTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </>
          ) : null}
          <SectionLabel>Motivo</SectionLabel>
          <div className="-mt-2 flex flex-wrap gap-1.5">
            {BLOCK_REASONS.map((r) => (
              <Chip key={r.id} selected={r.id === reason} onClick={() => setReason(r.id)}>
                {r.label}
              </Chip>
            ))}
          </div>
          <Button size="lg" onClick={() => save.mutate()} loading={save.isPending}>
            {professionalId ? "Bloquear período" : "Fechar nesse período"}
          </Button>
        </>
      )}
    </>
  );
}
