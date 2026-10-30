"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { ClientAuthCard } from "@/components/client/client-auth-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { safeRedirect } from "@/lib/safe-redirect";
import { signInSchema } from "@/lib/schemas";
import { meKey } from "@/lib/session";
import type { Me } from "@/lib/types";
import { authErrorMessage } from "@/lib/use-otp";

const REASONS: Record<string, string> = {
  blocked: "Sua conta está bloqueada. Fale com o suporte do belezaOur.",
  role: "Esta área é da conta de cliente. Entre com seu e-mail e senha.",
  "password-reset": "Senha redefinida. Entre com a nova senha.",
};

function SignInForm() {
  const params = useSearchParams();
  const next = safeRedirect(params.get("next"), "/appointments");
  const reasonKey = params.get("reason") ?? "";
  const reason = REASONS[reasonKey];
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const form = useForm<z.infer<typeof signInSchema>>({ resolver: zodResolver(signInSchema) });
  const withNext = (path: string) => (next === "/appointments" ? path : `${path}?next=${encodeURIComponent(next)}`);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    setUnverified(null);
    const { data, error: err } = await authClient.signIn.email({ email: values.email, password: values.password });
    if (err) {
      if (err.code === "EMAIL_NOT_VERIFIED") {
        setUnverified(values.email);
        return;
      }
      setError(err.status === 401 ? "E-mail ou senha incorretos." : authErrorMessage(err, "Não foi possível entrar."));
      return;
    }
    // Só admin tem 2FA; o login dele é em outra área.
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      setError("Admins entram pela área administrativa.");
      return;
    }
    const me = await qc.fetchQuery({ queryKey: meKey, queryFn: () => api<Me>("/me"), staleTime: 0 });
    if (me.role !== "CLIENT") {
      await authClient.signOut();
      qc.clear();
      setError(
        me.role === "BUSINESS_OWNER"
          ? "Esta é uma conta de estabelecimento. Entre pelo painel do dono."
          : "Esta conta não é de cliente.",
      );
      return;
    }
    toast(`Olá, ${me.name.split(" ")[0]}!`);
    router.replace(next);
    router.refresh();
  });

  const resend = async () => {
    if (!unverified) return;
    setResending(true);
    const { error: err } = await authClient.sendVerificationEmail({
      email: unverified,
      callbackURL: `${window.location.origin}${next}`,
    });
    setResending(false);
    if (err) toast.error(authErrorMessage(err, "Não foi possível reenviar."));
    else toast("Link de confirmação reenviado. Confira seu e-mail.");
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {reason ? <Notice tone={reasonKey === "password-reset" ? "ok" : "danger"}>{reason}</Notice> : null}
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
      <Link href="/forgot-password" className="self-start text-sm font-semibold text-primary-strong">
        Esqueci minha senha
      </Link>
      <div className="mt-2 border-t border-line pt-4 text-sm text-muted">
        Ainda não tem conta?
        <Link
          href={withNext("/sign-up")}
          className={buttonVariants({ variant: "outline-ink", block: true, className: "mt-2" })}
        >
          Criar conta
        </Link>
      </div>
    </form>
  );
}

export default function ClientSignInPage() {
  return (
    <ClientAuthCard title="Entrar" sub="Acesse seus agendamentos e favoritos.">
      <Suspense>
        <SignInForm />
      </Suspense>
    </ClientAuthCard>
  );
}
