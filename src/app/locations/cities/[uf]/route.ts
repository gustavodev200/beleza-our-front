import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ uf: string }> }) {
  const { uf } = await params;
  if (!/^[A-Za-z]{2}$/.test(uf)) return NextResponse.json({ message: "UF inválida" }, { status: 400 });
  try {
    const res = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf.toUpperCase()}/municipios?orderBy=nome`,
      { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { nome: string }[];
    return NextResponse.json(data.map((m) => m.nome), {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    });
  } catch {
    return NextResponse.json({ message: "IBGE indisponível" }, { status: 502 });
  }
}
