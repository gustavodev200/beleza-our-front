// belezaOur service worker.
//
// Escopo deliberadamente pequeno:
//   - Só GET da própria origem. /api/* NUNCA passa pelo cache (dados pessoais,
//     sessão e disponibilidade em tempo real).
//   - HTML nunca é armazenado, exceto /offline (sem dado de usuário).
//     Navegação é network-only com fallback para /offline.
//   - /_next/static, /icons e fontes: cache-first (URLs versionadas por hash).
//   - Imagens: stale-while-revalidate com limite de itens e expiração.
//   - Resposta com Cache-Control no-store/private nunca entra em cache.
//   - Sem skipWaiting automático.
//   - Push (Web Push/VAPID): mostra a notificação e, ao tocar, foca uma aba
//     aberta do app ou abre a rota enviada pela API (só caminhos internos).
//
// Ao mudar a lógica, incremente VERSION — caches antigos são apagados no activate.

const VERSION = "v2";
const PREFIX = "belezaour-";
const STATIC_CACHE = `${PREFIX}static-${VERSION}`;
const IMAGE_CACHE = `${PREFIX}images-${VERSION}`;
const PAGES_CACHE = `${PREFIX}pages-${VERSION}`;
const CURRENT = [STATIC_CACHE, IMAGE_CACHE, PAGES_CACHE];

const OFFLINE_URL = "/offline";
const PRECACHE = ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon.svg"];
const STATIC_MAX = 300;
const IMAGE_MAX = 80;
const IMAGE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const IMAGE_EXT = /\.(?:png|jpe?g|gif|webp|avif|svg|ico)$/i;
const FONT_EXT = /\.(?:woff2?|ttf|otf)$/i;

const FALLBACK_HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Sem conexão — belezaOur</title></head>
<body style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;margin:0;align-items:center;justify-content:center;text-align:center;padding:24px;background:#f7f7f5;color:#14242b">
<div><h1 style="font-size:22px">Você está sem internet</h1><p style="font-size:16px;color:#66737a">Verifique sua conexão e tente de novo.</p>
<a href="" style="display:inline-block;margin-top:12px;padding:14px 24px;border-radius:11px;background:#14242b;color:#fff;text-decoration:none;font-weight:700">Tentar novamente</a></div>
</body></html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGES_CACHE);
      await pages.add(new Request(OFFLINE_URL, { cache: "reload" }));
      const statics = await caches.open(STATIC_CACHE);
      await statics.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" })));
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith(PREFIX) && !CURRENT.includes(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.origin && event.origin !== self.location.origin) return;
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (request.headers.has("range")) return;

  if (request.mode === "navigate") {
    event.respondWith(navigation(request));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || FONT_EXT.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.pathname === "/_next/image" || IMAGE_EXT.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, request));
  }
  // Resto (payload RSC, manifest, sw.js) vai direto para a rede.
});

async function navigation(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(OFFLINE_URL, { cacheName: PAGES_CACHE });
    return (
      cached ||
      new Response(FALLBACK_HTML, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } })
    );
  }
}

function cacheable(response) {
  if (!response || !response.ok || response.type !== "basic") return false;
  const cc = (response.headers.get("Cache-Control") || "").toLowerCase();
  return !cc.includes("no-store") && !cc.includes("private");
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (cacheable(response)) {
    await cache.put(request, response.clone());
    await trim(cache, STATIC_MAX);
  }
  return response;
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(IMAGE_CACHE);
  const hit = await cache.match(request);
  const fresh = hit && Date.now() - Date.parse(hit.headers.get("Date") || "") < IMAGE_MAX_AGE_MS;
  const network = fetch(request)
    .then(async (response) => {
      if (cacheable(response)) {
        await cache.put(request, response.clone());
        await trim(cache, IMAGE_MAX);
      }
      return response;
    })
    .catch(() => undefined);
  if (fresh) {
    event.waitUntil(network);
    return hit;
  }
  return (await network) || hit || Response.error();
}

// cache.keys() vem em ordem de inserção: apaga os mais antigos primeiro.
async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = typeof data.title === "string" && data.title ? data.title : "belezaOur";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: typeof data.tag === "string" ? data.tag : undefined,
      renotify: Boolean(data.tag),
      lang: "pt-BR",
      data: { url: safePath(data.url) },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(safePath(event.notification.data && event.notification.data.url), self.location.origin);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((c) => new URL(c.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        if ("navigate" in open) await open.navigate(target.href).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(target.href);
    })(),
  );
});

// Só caminho interno ("/x", nunca "//host" nem URL absoluta): o push não vira redirecionamento aberto.
function safePath(url) {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//") ? url : "/";
}
