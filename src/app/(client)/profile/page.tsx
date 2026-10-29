"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, Toggle } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/overlay";
import { Notice, Spinner } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { formatPhone, initials } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";
import { nameSchema } from "@/lib/schemas";
import { meKey, useMe, useSignOut } from "@/lib/session";
import type { Me } from "@/lib/types";

function Row({
  href,
  icon,
  label,
  onClick,
  danger,
}: {
  href?: string;
  icon: string;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const cls = `flex min-h-[52px] w-full items-center gap-3 border-b border-line-soft px-0.5 text-left text-sm last:border-0 ${danger ? "text-danger" : ""}`;
  const inner = (
    <>
      <Icon name={icon} size={20} />
      <span className="flex-1">{label}</span>
      {danger ? null : <Icon name="chevron_right" size={20} className="text-subtle" />}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function Profile({ me }: { me: Me }) {
  const qc = useQueryClient();
  const signOut = useSignOut();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me.name);
  const [nameError, setNameError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const update = useMutation({
    mutationFn: (body: { name?: string; whatsappConsent?: boolean }) => api<Me>("/me", { method: "PATCH", body }),
    onSuccess: (data) => {
      qc.setQueryData(meKey, data);
      toast("Dados atualizados");
      setEditing(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const exportData = useMutation({
    mutationFn: () => api<unknown>("/me/export"),
    onSuccess: (data) => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "meus-dados-belezaour.json";
      a.click();
      URL.revokeObjectURL(url);
      toast("Exportação gerada");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: () => api("/me", { method: "DELETE" }),
    onSuccess: async () => {
      toast("Conta excluída. Seus dados pessoais foram removidos.");
      await signOut("/");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const saveName = (e: React.FormEvent) => {
    e.preventDefault();
    const r = nameSchema.safeParse(name);
    if (!r.success) {
      setNameError(r.error.issues[0].message);
      return;
    }
    setNameError(undefined);
    update.mutate({ name: r.data });
  };

  const isOwner = me.role === "BUSINESS_OWNER";
  const canDelete = me.role !== "SUPER_ADMIN";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3.5">
        <div className="grid size-[60px] place-items-center rounded-full bg-[oklch(0.92_0.04_20)] text-lg font-extrabold text-[oklch(0.38_0.1_20)]">
          {initials(me.name)}
        </div>
        <div>
          <b className="text-[17px]">{me.name}</b>
          <div className="text-xs text-muted">
            {ROLE_LABEL[me.role]}
            {me.phoneNumber ? ` · ${formatPhone(me.phoneNumber)}` : me.email ? ` · ${me.email}` : ""}
          </div>
        </div>
      </div>

      {isOwner ? (
        <Link href="/my-schedule" className="flex items-center gap-3 rounded-[14px] bg-ink p-3.5 text-left text-white">
          <Icon name="storefront" size={22} />
          <span className="flex-1">
            <span className="block text-sm font-bold">Área do profissional</span>
            <span className="block text-[11px] text-sidebar-fg">
              {me.business?.name ?? "Meu estabelecimento"} · agenda de hoje
            </span>
          </span>
          <Icon name="chevron_right" size={20} />
        </Link>
      ) : null}

      <Card className="p-4">
        {editing ? (
          <form onSubmit={saveName} className="flex flex-col gap-3">
            <Field label="Nome" error={nameError}>
              {(p) => (
                <Input
                  {...p}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  autoComplete="name"
                />
              )}
            </Field>
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={update.isPending}>
                Salvar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  setName(me.name);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <Row icon="person" label="Meus dados" onClick={() => setEditing(true)} />
        )}
        {me.role === "CLIENT" ? (
          <>
            <Row href="/appointments" icon="event" label="Meus agendamentos" />
            <Row href="/favorites" icon="favorite" label="Favoritos" />
          </>
        ) : null}
        <Row href="/notifications" icon="notifications" label="Notificações" />
        {me.role === "CLIENT" ? (
          <div className="flex min-h-[52px] items-center gap-3 border-b border-line-soft px-0.5 text-sm">
            <Icon name="chat" size={20} />
            <span className="flex-1">Mensagens no WhatsApp</span>
            <Toggle
              checked={me.whatsappConsent}
              onChange={(v) => update.mutate({ whatsappConsent: v })}
              label="Receber mensagens no WhatsApp"
              disabled={update.isPending}
            />
          </div>
        ) : null}
        <Row href="mailto:suporte@belezaour.app" icon="help" label="Ajuda e suporte" />
        {!isOwner && me.role === "CLIENT" ? (
          <Row href="/dashboard/sign-in" icon="storefront" label="Sou profissional" />
        ) : null}
      </Card>

      <Card className="p-4">
        <div className="mb-1 text-xs font-bold tracking-[.06em] text-muted uppercase">Privacidade (LGPD)</div>
        <Row icon="download" label="Exportar meus dados" onClick={() => exportData.mutate()} />
        {canDelete ? <Row icon="delete" label="Excluir minha conta" onClick={() => setDeleting(true)} danger /> : null}
      </Card>

      <Button variant="danger-outline" icon="logout" onClick={() => signOut("/")}>
        Sair
      </Button>

      <Modal
        open={deleting}
        onOpenChange={setDeleting}
        title="Excluir conta"
        description="Esta ação não pode ser desfeita."
      >
        <Notice tone="danger">
          Seus dados pessoais serão removidos e você sairá de todos os aparelhos.
          {isOwner ? " O estabelecimento sai do marketplace." : " Agendamentos futuros serão cancelados."}
        </Notice>
        <Field label='Digite "EXCLUIR" para confirmar'>
          {(p) => (
            <Input {...p} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          )}
        </Field>
        <Button
          variant="danger"
          disabled={confirmText.trim().toUpperCase() !== "EXCLUIR"}
          loading={remove.isPending}
          onClick={() => remove.mutate()}
        >
          Excluir definitivamente
        </Button>
      </Modal>
    </div>
  );
}

export default function ProfilePage() {
  const { data: me, isPending } = useMe();
  return (
    <div className="mx-auto max-w-[560px] px-4 pt-5 sm:px-6 md:pt-7">
      <h1 className="mt-0 mb-4 text-[30px] font-bold md:text-[40px]">Perfil</h1>
      {isPending ? (
        <Spinner />
      ) : me ? (
        <Profile me={me} />
      ) : (
        <Notice>
          Sua sessão expirou.{" "}
          <Link href="/sign-in?next=/profile" className="font-bold underline">
            Entrar novamente
          </Link>
        </Notice>
      )}
    </div>
  );
}
