import type { Metadata, Viewport } from "next";
import { Noto_Sans } from "next/font/google";
import { headers } from "next/headers";
import { Providers } from "@/components/providers/providers";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const noto = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "belezaOur — beleza e bem-estar perto de você", template: "%s · belezaOur" },
  description:
    "Compare salões, barbearias e profissionais em Goiânia e agende seu horário em poucos cliques, sem trocar mensagens.",
  applicationName: "belezaOur",
  appleWebApp: { capable: true, title: "belezaOur", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: { type: "website", locale: "pt_BR", siteName: "belezaOur" },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#14242b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lê os headers da requisição: força render dinâmico, condição para o Next
  // aplicar o nonce da CSP (montada em src/proxy.ts) aos scripts.
  await headers();
  return (
    <html lang="pt-BR" className={noto.variable}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
