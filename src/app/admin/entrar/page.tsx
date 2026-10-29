"use client";

import { useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/states";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { safeRedirect } from "@/lib/safe-redirect";
import { emailSchema, totpSchema } from "@/lib/schemas";
import { meKey, useSignOut } from "@/lib/session";
import type { Me } from "@/lib/types";
import { authErrorMessage } from "@/lib/use-otp";

type Step = "password" | "totp" | "enroll";

const REASONS: Record<string, string> = {
  expirada: "Sessão administrativa expirada (8h). Entre novamente.",
  bloqueada: "Conta bloqueada.",
  papel: "Acesso restrito a administradores.",
  "2fa": "Ative a verificação em duas etapas: entre com sua senha para cadastrar o app autenticador.",
};

function AdminLogin() {
  const params = useSearchParams();
  const next = safeRedirect(params.get("next"), "/admin");
  const router = useRouter();
  const qc = useQueryClient();
  const signOut = useSignOut();
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(REASONS[params.get("motivo") ?? ""] ?? null);
  const [loading, setLoading] = useState(false);

  const afterSession = async () => {
    const profile = await qc.fetchQuery({ queryKey: meKey, queryFn: () => api<Me>("/me"), staleTime: 0 });
    if (profile.role !== "SUPER_ADMIN") {
      await signOut("/admin/entrar?motivo=papel");
      return;
    }
    if (!profile.twoFactorEnabled) {
      await startEnroll();
      return;
    }
    router.replace(next.startsWith("/admin") ? next : "/admin");
  };

  const startEnroll = async () => {
    const { data, error: err } = await authClient.twoFactor.enable({ password });
    if (err || !data || !("totpURI" in data)) {
      setError(authErrorMessage(err, "Não foi possível iniciar a verificação em duas etapas. Entre novamente."));
      setStep("password");
      return;
    }
    const uri = data.totpURI;
    setSecret(new URL(uri).searchParams.get("secret"));
    setQr(await QRCode.toDataURL(uri, { margin: 1, width: 220 }));
    setBackupCodes(data.backupCodes ?? []);
    setStep("enroll");
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = emailSchema.safeParse(email);
    if (!em.success || !password) {
      setError("Informe e-mail e senha.");
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await authClient.signIn.email({ email: em.data, password });
    setLoading(false);
    if (err) {
      setError(err.status === 401 ? "E-mail ou senha incorretos." : authErrorMessage(err, "Não foi possível entrar."));
      return;
    }
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      setStep("totp");
      setTimeout(() => document.getElementById("totp")?.focus(), 50);
      return;
    }
    setLoading(true);
    await afterSession();
    setLoading(false);
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = totpSchema.safeParse(code);
    if (!c.success) {
      setError(c.error.issues[0].message);
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await authClient.twoFactor.verifyTotp({ code: c.data });
    setLoading(false);
    if (err) {
      setError(
        err.status === 429
          ? "Muitas tentativas. Aguarde 15 minutos."
          : "Código inválido. Confira o horário do seu celular e tente de novo.",
      );
      return;
    }
    setLoading(true);
    await qc.invalidateQueries({ queryKey: meKey });
    await afterSession();
    setLoading(false);
  };

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-4 rounded-3xl border border-line bg-surface p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <Icon name="spa" size={24} />
        <b className="text-lg">belezaOur</b>
        <span className="rounded-[5px] bg-accent px-1.5 py-0.5 text-[10px] font-extrabold text-white">SUPER_ADMIN</span>
      </div>
      <h1 className="m-0 text-[30px] font-bold">Acesso restrito</h1>
      {error ? <Notice tone="danger">{error}</Notice> : null}

      {step === "password" ? (
        <form onSubmit={submitPassword} className="flex flex-col gap-3.5" noValidate>
          <Field label="E-mail corporativo">
            {(p) => (
              <Input
                {...p}
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          <Field label="Senha">
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
          <Button type="submit" size="lg" loading={loading}>
            Continuar
          </Button>
        </form>
      ) : null}

      {step === "totp" || step === "enroll" ? (
        <form onSubmit={submitCode} className="flex flex-col gap-3.5" noValidate>
          {step === "enroll" ? (
            <>
              <p className="m-0 text-sm text-ink-2">
                Ative a verificação em duas etapas: escaneie o QR code no seu app autenticador (Google Authenticator,
                1Password, Authy…) e digite o código de 6 dígitos.
              </p>
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element -- QR gerado localmente como data URL
                <img
                  src={qr}
                  alt="QR code para o app autenticador"
                  width={220}
                  height={220}
                  className="self-center rounded-xl border border-line"
                />
              ) : null}
              {secret ? (
                <div className="text-center text-xs text-muted">
                  Ou digite a chave: <code className="font-mono text-ink select-all">{secret}</code>
                </div>
              ) : null}
              {backupCodes.length ? (
                <details className="rounded-xl bg-bg p-3 text-xs">
                  <summary className="cursor-pointer font-semibold">
                    Códigos de recuperação (guarde em local seguro)
                  </summary>
                  <div className="mt-2 grid grid-cols-2 gap-1 font-mono">
                    {backupCodes.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </div>
                </details>
              ) : null}
            </>
          ) : (
            <p className="m-0 text-sm text-ink-2">
              Verificação em duas etapas: digite o código de 6 dígitos do seu app autenticador.
            </p>
          )}
          <Field label="Código">
            {(p) => (
              <Input
                {...p}
                id="totp"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="text-center text-2xl tracking-[.4em]"
              />
            )}
          </Field>
          <Button type="submit" size="lg" loading={loading}>
            {step === "enroll" ? "Ativar e entrar" : "Entrar"}
          </Button>
          <Button variant="ghost" onClick={() => signOut("/admin/entrar")}>
            Voltar
          </Button>
        </form>
      ) : null}

      <div className="flex items-center gap-2 text-xs text-muted">
        <Icon name="shield" size={16} />
        Todas as ações de administrador ficam registradas em auditoria.
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink px-4 py-10">
      <Suspense>
        <AdminLogin />
      </Suspense>
    </div>
  );
}
