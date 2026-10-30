"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { ClientAuthCard } from "@/components/client/client-auth-card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";
import { authClient } from "@/lib/auth-client";
import { resetPasswordSchema } from "@/lib/schemas";
import { authErrorMessage } from "@/lib/use-otp";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const router = useRouter();
  const [error, setError] = useState<string | null>(
    params.get("error") ? "Link inválido ou expirado. Peça um novo." : null,
  );
  const form = useForm<z.infer<typeof resetPasswordSchema>>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    if (!token) return;
    const { error: err } = await authClient.resetPassword({ newPassword: password, token });
    if (err) {
      setError(
        err.status === 400
          ? "Link inválido ou expirado. Peça um novo."
          : authErrorMessage(err, "Não foi possível redefinir."),
      );
      return;
    }
    router.replace("/sign-in?reason=password-reset");
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error || !token ? (
        <Notice tone="danger">
          {error ?? "Link incompleto."}{" "}
          <Link href="/forgot-password" className="font-bold underline">
            Pedir novo link
          </Link>
        </Notice>
      ) : null}
      <Field label="Nova senha" error={form.formState.errors.password?.message}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register("password")} />}
      </Field>
      <Field label="Confirmar senha" error={form.formState.errors.confirm?.message}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register("confirm")} />}
      </Field>
      <Button type="submit" size="lg" loading={form.formState.isSubmitting} disabled={!token}>
        Salvar nova senha
      </Button>
    </form>
  );
}

export default function ClientResetPasswordPage() {
  return (
    <ClientAuthCard title="Nova senha" sub="Use no mínimo 8 caracteres. Você sairá dos outros aparelhos.">
      <Suspense>
        <ResetForm />
      </Suspense>
    </ClientAuthCard>
  );
}
