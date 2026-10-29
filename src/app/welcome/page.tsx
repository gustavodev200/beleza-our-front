import type { Metadata } from "next";
import { CityOnboarding } from "@/components/client/city-onboarding";
import type { SelectedCity } from "@/lib/city";
import { getSelectedCity } from "@/lib/city-server";
import { safeRedirect } from "@/lib/safe-redirect";
import { serverGetOr } from "@/lib/server-api";

export const metadata: Metadata = {
  title: "Escolha sua cidade",
  description: "Informe seu estado e cidade para ver só os salões, barbearias e profissionais perto de você.",
  robots: { index: false },
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const next = safeRedirect(typeof raw.next === "string" ? raw.next : undefined, "/");
  const [served, current] = await Promise.all([serverGetOr<SelectedCity[]>("/cities", [], 60), getSelectedCity()]);
  return <CityOnboarding served={served} current={current} next={next} />;
}
