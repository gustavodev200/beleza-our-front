"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { ClientAuthCard } from "@/components/client/client-auth-card";
import { TermsCheckbox } from "@/components/shared/terms-checkbox";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/states";
import { authClient } from "@/lib/auth-client";
import { safeRedirect } from "@/lib/safe-redirect";
import { clientSignUpSchema } from "@/lib/schemas";
import { authErrorMessage } from "@/lib/use-otp";

function SignUpForm() {
  const params = useSearchParams();
  const next = safeRedirect(params.get("next"), "/appointments");
  const signInHref = next === "/appointments" ? "/sign-in" : `/sign-in?next=${encodeURIComponent(next)}`;
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<typeof clientSignUpSchema>, unknown, z.output<typeof clientSignUpSchema>>({
    resolver: zodResolver(clientSignUpSchema),
    defaultValues: { name: "", email: "", password: "", confirm: "", acceptedTerms: false },
  });
  // Ao confirmar o e-mail a cliente volta já logada para onde estava indo.
  const callbackURL = () => `${window.location.origin}${next}`;

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    const { error: err } = await authClient.signUp.email({
      name: v.name,
      email: v.email,
      password: v.password,
      // Não são campos do usuário: a API usa para definir o papel e gravar o aceite.
      ...({ accountType: "client", acceptedTerms: v.acceptedTerms } as object),
      callbackURL: callbackURL(),
    });
    if (err) {
      setError(
        err.status === 422 || err.code === "USER_ALREADY_EXISTS" || err.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
          ? "Já existe uma conta com este e-mail. Entre ou recupere a senha."
          : authErrorMessage(err, "Não foi possível criar a conta."),
      );
      return;
    }
    setSentTo(v.email);
  });

  const resend = async () => {
    if (!sentTo) return;
    setResending(true);
    const { error: err } = await authClient.sendVerificationEmail({ email: sentTo, callbackURL: callbackURL() });
    setResending(false);
    if (err) toast.error(authErrorMessage(err, "Não foi possível reenviar."));
    else toast("Link de confirmação reenviado. Confira seu e-mail.");
  };

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid size-14 place-items-center rounded-full bg-primary-soft">
          <Icon name="mark_email_unread" size={30} className="text-primary-strong" />
        </div>
        <p className="m-0 text-sm text-ink-2">
          Enviamos um link para <b>{sentTo}</b>. Ao clicar, você entra na sua conta e pode agendar.
        </p>
        <Notice tone="info">
          Não chegou? Confira o spam ou{" "}
          <button type="button" onClick={resend} disabled={resending} className="font-bold underline">
            reenvie o link
          </button>
          .
        </Notice>
        <Link href={signInHref} className="text-sm font-semibold text-primary-strong">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Field label="Nome completo" error={form.formState.errors.name?.message}>
        {(p) => <Input {...p} autoComplete="name" maxLength={80} {...form.register("name")} />}
      </Field>
      <Field label="E-mail" error={form.formState.errors.email?.message}>
        {(p) => <Input {...p} type="email" autoComplete="email" {...form.register("email")} />}
      </Field>
      <Field label="Senha" error={form.formState.errors.password?.message} hint="Mínimo de 8 caracteres">
        {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register("password")} />}
      </Field>
      <Field label="Confirmar senha" error={form.formState.errors.confirm?.message}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register("confirm")} />}
      </Field>
      <TermsCheckbox field={form.register("acceptedTerms")} error={form.formState.errors.acceptedTerms?.message} />
      <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
        Criar conta
      </Button>
      <p className="m-0 text-sm text-muted">
        Já tem conta?{" "}
        <Link href={signInHref} className="font-bold text-ink">
          Entrar
        </Link>
      </p>
    </form>
  );
}

export default function ClientSignUpPage() {
  return (
    <ClientAuthCard title="Criar conta" sub="Agende em segundos e acompanhe tudo em um só lugar.">
      <Suspense>
        <SignUpForm />
      </Suspense>
    </ClientAuthCard>
  );
}
