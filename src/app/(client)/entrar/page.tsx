"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/states";
import { api } from "@/lib/api";
import { formatPhone, maskPhoneInput } from "@/lib/format";
import { safeRedirect } from "@/lib/safe-redirect";
import { nameSchema, otpSchema, phoneSchema } from "@/lib/schemas";
import { meKey } from "@/lib/session";
import type { Me } from "@/lib/types";
import { useOtp } from "@/lib/use-otp";

const REASONS: Record<string, string> = {
  bloqueada: "Sua conta está bloqueada. Fale com o suporte do belezaOur.",
  papel: "Esta área é da conta de cliente. Entre com seu WhatsApp.",
};

function LoginForm() {
  const params = useSearchParams();
  const next = safeRedirect(params.get("next"), "/agendamentos");
  const reason = REASONS[params.get("motivo") ?? ""];
  const router = useRouter();
  const qc = useQueryClient();
  const otp = useOtp();
  const [tab, setTab] = useState<"entrar" | "criar">("entrar");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string; code?: string }>({});
  const isSignup = tab === "criar";

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const n = nameSchema.safeParse(name);
    const p = phoneSchema.safeParse(phone);
    const errs = {
      name: isSignup && !n.success ? n.error.issues[0].message : undefined,
      phone: p.success ? undefined : p.error.issues[0].message,
    };
    setErrors(errs);
    if (errs.name || errs.phone || !p.success) return;
    if (await otp.send(p.data)) {
      setCode("");
      setTimeout(() => document.getElementById("codigo")?.focus(), 50);
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = otpSchema.safeParse(code);
    if (!c.success) {
      setErrors({ code: c.error.issues[0].message });
      return;
    }
    setErrors({});
    if (!(await otp.verify(c.data))) return;
    const me = await qc.fetchQuery({ queryKey: meKey, queryFn: () => api<Me>("/me") });
    if (me.role !== "CLIENT") {
      toast("Esta conta não é de cliente.");
    } else if (isSignup && nameSchema.safeParse(name).success && me.name !== name.trim()) {
      await api("/me", { method: "PATCH", body: { name: name.trim() } }).catch(() => undefined);
      void qc.invalidateQueries({ queryKey: meKey });
    }
    toast(isSignup ? "Conta criada! Bem-vinda ao belezaOur" : "Você entrou");
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6 sm:p-8">
      <Icon name="spa" size={34} className="text-primary-strong" />
      <Segmented
        stretch
        value={tab}
        onChange={(v) => {
          setTab(v);
          otp.reset();
          setErrors({});
        }}
        options={[
          { value: "entrar", label: "Entrar" },
          { value: "criar", label: "Criar conta" },
        ]}
      />
      <h1 className="m-0 text-[30px] leading-[1.05] font-bold sm:text-[34px]">
        {isSignup ? "Crie sua conta" : "Entre com seu WhatsApp"}
      </h1>
      {reason ? <Notice tone="danger">{reason}</Notice> : null}

      {!otp.sentTo ? (
        <form onSubmit={requestCode} className="flex flex-col gap-3.5" noValidate>
          <div className="text-sm text-muted">
            {isSignup ? "Só nome e WhatsApp — sem senha." : "Enviamos um código de 4 números para o seu WhatsApp."}
          </div>
          {isSignup ? (
            <Field label="Seu nome" error={errors.name}>
              {(p) => (
                <Input
                  {...p}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={80}
                />
              )}
            </Field>
          ) : null}
          <Field label="WhatsApp" error={errors.phone ?? otp.error ?? undefined}>
            {(p) => (
              <Input
                {...p}
                value={phone}
                onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
                placeholder="(62) 99999-0000"
                inputMode="tel"
                autoComplete="tel-national"
              />
            )}
          </Field>
          <Button type="submit" loading={otp.sending}>
            Receber código
          </Button>
        </form>
      ) : (
        <form onSubmit={confirm} className="flex flex-col gap-3.5" noValidate>
          <Field
            label={`Digite o código enviado para ${formatPhone(otp.sentTo)}`}
            error={errors.code ?? otp.error ?? undefined}
          >
            {(p) => (
              <Input
                {...p}
                id="codigo"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="0000"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="text-center text-[28px] tracking-[.5em]"
              />
            )}
          </Field>
          <Button type="submit" loading={otp.verifying}>
            {isSignup ? "Criar conta" : "Entrar"}
          </Button>
          <div className="flex items-center justify-between text-[13px] font-semibold">
            <button type="button" className="min-h-10" onClick={() => otp.reset()}>
              Trocar número
            </button>
            <button
              type="button"
              className="min-h-10 text-primary-strong disabled:text-muted"
              disabled={otp.cooldown > 0}
              onClick={() => requestCode()}
            >
              {otp.cooldown > 0 ? `Reenviar em ${otp.cooldown}s` : "Reenviar código"}
            </button>
          </div>
        </form>
      )}
      <div className="text-xs text-subtle">
        Você também pode agendar sem conta — ela é criada automaticamente no primeiro agendamento.
      </div>
    </div>
  );
}

export default function ClientLoginPage() {
  return (
    <div className="mx-auto max-w-[440px] px-4 pt-8 sm:pt-14">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
