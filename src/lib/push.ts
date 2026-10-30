/**
 * Web Push do PWA. A chave pública VAPID vem da API (null = push desligado no
 * servidor). Só funciona com o service worker ativo, ou seja, em produção.
 */
import { api, apiSilent } from "./api";

export type PushState = "unsupported" | "ios-install" | "off" | "denied" | "on";

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || "standalone" in navigator;
}

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!("serviceWorker" in navigator)) return undefined;
  return navigator.serviceWorker.getRegistration("/");
}

export async function publicKey(): Promise<string | null> {
  const res = await apiSilent<{ publicKey: string | null }>("/push/public-key");
  return res?.publicKey ?? null;
}

/** Estado deste aparelho. No iPhone, push só existe com o app instalado na tela inicial. */
export async function pushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  if (!("PushManager" in window) || !("Notification" in window)) {
    return isIos() && !isStandalone() ? "ios-install" : "unsupported";
  }
  const reg = await registration();
  if (!reg) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const sub = await reg.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

/** Pede permissão, assina e registra na API. Devolve o novo estado. */
export async function enablePush(key: string): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) }));
  await api("/me/push-subscriptions", { method: "POST", body: sub.toJSON() });
  return "on";
}

/** Cancela no navegador e na API (melhor esforço: usado também ao sair da conta). */
export async function disablePush(): Promise<void> {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  // fetch direto: sessão já encerrada não deve levar ao login.
  await fetch("/api/me/push-subscriptions", {
    method: "DELETE",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => undefined);
  await sub.unsubscribe().catch(() => false);
}
