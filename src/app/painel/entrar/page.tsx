"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthCardTitle, OwnerAuthShell } from "@/components/owner/owner-auth-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { ownerHome } from "@/lib/owner";
import { safeRedirect } from "@/lib/safe-redirect";
import { ownerSignInSchema } from "@/lib/schemas";
import { meKey } from "@/lib/session";
import type { Me } from "@/lib/types";
import { authErrorMessage } from "@/lib/use-otp";
import type { z } from "zod";

const REASONS: Record<string, string> = {
  bloqueada: "Sua conta está bloqueada. Fale com o suporte do belezaOur.",
  papel: "Entre com a conta do dono do estabelecimento.",
  senha: "Senha redefinida. Entre com a nova senha.",
};

function SignInForm() {
  const params = useSearchParams();
  const next = safeRedirect(params.get("next"), "/painel");
  const reason = REASONS[params.get("motivo") ?? ""];
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const form = useForm<z.infer<typeof ownerSignInSchema>>({ resolver: zodResolver(ownerSignInSchema) });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    setUnverified(null);
    const { error: err } = await authClient.signIn.email({ email: values.email, password: values.password });
    if (err) {
      if (err.code === "EMAIL_NOT_VERIFIED") {
        setUnverified(values.email);
        return;
      }
      setError(err.status === 401 ? "E-mail ou senha incorretos." : authErrorMessage(err, "Não foi possível entrar."));
      return;
    }
    const me = await qc.fetchQuery({ queryKey: meKey, queryFn: () => api<Me>("/me"), staleTime: 0 });
    if (me.role !== "BUSINESS_OWNER") {
      await authClient.signOut();
      qc.clear();
      setError(
        me.role === "SUPER_ADMIN"
          ? "Admins entram pela área administrativa."
          : "Esta conta não é de um estabelecimento.",
      );
      return;
    }
    toast(`Olá, ${me.name.split(" ")[0]}!`);
    router.replace(ownerHome(me, next));
  });

  const resend = async () => {
    if (!unverified) return;
    setResending(true);
    const { error: err } = await authClient.sendVerificationEmail({
      email: unverified,
      callbackURL: `${window.location.origin}/painel/cadastro`,
    });
    setResending(false);
    if (err) toast.error(authErrorMessage(err, "Não foi possível reenviar."));
    else toast("Link de confirmação reenviado. Confira seu e-mail.");
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <AuthCardTitle eyebrow="Área do estabelecimento" title="Entrar no painel" />
      {reason ? <Notice tone={params.get("motivo") === "senha" ? "ok" : "danger"}>{reason}</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {unverified ? (
        <Notice>
          Confirme seu e-mail para entrar. Enviamos um link para {unverified}.{" "}
          <button type="button" onClick={resend} disabled={resending} className="font-bold underline">
            Reenviar link
          </button>
        </Notice>
      ) : null}
      <Field label="E-mail" error={form.formState.errors.email?.message}>
        {(p) => <Input {...p} type="email" autoComplete="email" {...form.register("email")} />}
      </Field>
      <Field label="Senha" error={form.formState.errors.password?.message}>
        {(p) => <Input {...p} type="password" autoComplete="current-password" {...form.register("password")} />}
      </Field>
      <Button type="submit" loading={form.formState.isSubmitting} size="lg">
        Entrar
      </Button>
      <Link href="/painel/esqueci-senha" className="self-start text-sm font-semibold text-primary-strong">
        Esqueci minha senha
      </Link>
      <div className="mt-2 border-t border-line pt-4 text-sm text-muted">
        Ainda não tem conta?
        <Link
          href="/painel/cadastro"
          className={buttonVariants({ variant: "outline-ink", block: true, className: "mt-2" })}
        >
          Cadastrar meu estabelecimento
        </Link>
      </div>
    </form>
  );
}

export default function OwnerSignInPage() {
  return (
    <OwnerAuthShell>
      <Suspense>
        <SignInForm />
      </Suspense>
    </OwnerAuthShell>
  );
}
