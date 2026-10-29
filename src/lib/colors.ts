/** Matiz estável derivada de um texto (nome da profissional, do estabelecimento). */
export function hueOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Cores de avatar/agenda por pessoa, como no protótipo. */
export function personColors(name: string) {
  const h = hueOf(name);
  return {
    bg: `oklch(0.92 0.04 ${h})`,
    fg: `oklch(0.38 0.1 ${h})`,
    strong: `oklch(0.58 0.15 ${h})`,
    soft: `oklch(0.95 0.03 ${h})`,
    text: `oklch(0.32 0.09 ${h})`,
  };
}

/** Listras diagonais usadas como capa quando não há imagem. */
export function stripes(seed: string): string {
  const h = hueOf(seed);
  return `repeating-linear-gradient(135deg, oklch(0.9 0.035 ${h}) 0 12px, oklch(0.875 0.042 ${h}) 12px 24px)`;
}
