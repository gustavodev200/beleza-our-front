"use client";

import { useEffect } from "react";

/** Registra o SW só em produção (em dev ele atrapalharia o HMR). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* sem SW o app funciona normalmente, só sem offline */
    });
  }, []);
  return null;
}
