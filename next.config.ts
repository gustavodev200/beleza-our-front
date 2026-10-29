import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:3333";

// A Content-Security-Policy NÃO fica aqui: precisa de nonce por requisição,
// então é montada em src/proxy.ts. Aqui ficam só cabeçalhos independentes
// da requisição.
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // O navegador fala só com a própria origem: /api/* é repassado à API NestJS.
  // Assim o cookie httpOnly do Better Auth é same-origin e não há CORS com
  // credenciais nem token acessível por JavaScript.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // geolocation=(self): "Mais perto" pede a localização na própria origem.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
      // /sw.js não passa pelo proxy (tem ponto no caminho): a política dele vive
      // aqui, e no-store garante que uma versão nova chegue no próximo acesso.
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
