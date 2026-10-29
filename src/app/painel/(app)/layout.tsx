import type { Metadata } from "next";
import { PanelShell } from "@/components/owner/panel-shell";

export const metadata: Metadata = { title: "Painel", robots: { index: false, follow: false } };

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <PanelShell>{children}</PanelShell>;
}
