"use client";

import { useEffect, useState } from "react";
import { authClient } from "./auth-client";

const RESEND_SECONDS = 30;

interface AuthErr {
  status?: number;
  message?: string;
}

/** Mensagens do Better Auth/hooks do backend → texto para a cliente. */
export function authErrorMessage(error: AuthErr | null | undefined, fallback: string): string {
  if (!error) return fallback;
  if (error.status === 429) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (error.status === 403) return "Conta indisponível. Fale com o suporte.";
  return error.message || fallback;
}

/**
 * Envio e verificação do código de 4 dígitos por WhatsApp. O backend limita
 * 3 envios/10 min e 30 s entre envios; o contador aqui só espelha isso.
 */
export function useOtp() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async (phoneE164: string): Promise<boolean> => {
    setSending(true);
    setError(null);
    const { error: err } = await authClient.phoneNumber.sendOtp({ phoneNumber: phoneE164 });
    setSending(false);
    if (err) {
      setError(authErrorMessage(err, "Não foi possível enviar o código."));
      return false;
    }
    setSentTo(phoneE164);
    setCooldown(RESEND_SECONDS);
    return true;
  };

  const verify = async (code: string): Promise<boolean> => {
    if (!sentTo) return false;
    setVerifying(true);
    setError(null);
    const { error: err } = await authClient.phoneNumber.verify({ phoneNumber: sentTo, code });
    setVerifying(false);
    if (err) {
      setError(
        err.status === 400 || err.status === 401
          ? "Código incorreto ou expirado. Confira e tente de novo."
          : authErrorMessage(err, "Não foi possível verificar o código."),
      );
      return false;
    }
    return true;
  };

  const reset = () => {
    setSentTo(null);
    setError(null);
  };

  return { sentTo, cooldown, sending, verifying, error, send, verify, reset, setError };
}
