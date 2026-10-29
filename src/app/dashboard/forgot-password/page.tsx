"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCardTitle, OwnerAuthShell } from "@/components/owner/owner-auth-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Notice } from "@/components/ui/states";
import { authClient } from "@/lib/auth-client";
import { emailSchema } from "@/lib/schemas";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = emailSchema.safeParse(email);
    if (!r.success) {
      setError(r.error.issues[0].message);
      return;
    }
    setError(undefined);
    setLoading(true);
    // A API responde igual exista ou não a conta (não revela e-mails cadastrados).
    await authClient.requestPasswordReset({
      email: r.data,
      redirectTo: `${window.location.origin}/dashboard/reset-password`,
    });
    setLoading(false);
    setSent(true);
  };

  return (
    <OwnerAuthShell>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <AuthCardTitle
          eyebrow="Área do estabelecimento"
          title="Esqueci minha senha"
          sub="Enviamos um link para criar uma nova senha."
        />
        {sent ? (
          <Notice tone="ok">
            Se houver uma conta com {email}, você vai receber o link em instantes. Ele vale por 30 minutos.
          </Notice>
        ) : (
          <>
            <Field label="E-mail" error={error}>
              {(p) => (
                <Input
                  {...p}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>
            <Button type="submit" loading={loading} size="lg">
              Enviar link
            </Button>
          </>
        )}
        <Link href="/dashboard/sign-in" className="text-sm font-semibold text-primary-strong">
          ← Voltar para o login
        </Link>
      </form>
    </OwnerAuthShell>
  );
}
