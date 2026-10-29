import { NextResponse } from "next/server";

/**
 * Proxy da API de localidades do IBGE (gratuita, sem chave). A CSP só permite
 * `connect-src 'self'`, então o navegador conversa com esta rota e o servidor
 * com o IBGE — e o resultado fica em cache por um dia.
 */
export async function GET() {
  try {
    const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome", {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { sigla: string; nome: string }[];
    return NextResponse.json(data.map((e) => ({ uf: e.sigla, name: e.nome })), {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    });
  } catch {
    return NextResponse.json({ message: "IBGE indisponível" }, { status: 502 });
  }
}
