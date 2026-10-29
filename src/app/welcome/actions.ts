"use server";

import { cookies } from "next/headers";
import { CITY_COOKIE, CITY_COOKIE_MAX_AGE, citySlug, type SelectedCity } from "@/lib/city";
import { serverGetOr } from "@/lib/server-api";

async function saveCity(city: SelectedCity) {
  (await cookies()).set(CITY_COOKIE, JSON.stringify(city), {
    maxAge: CITY_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Grava a cidade escolhida (IBGE). Se ela for atendida pela API, o cookie guarda
 * o id real; senão guarda id vazio e o catálogo mostra o aviso de "ainda não chegamos".
 * Retorna se a cidade é atendida.
 */
export async function chooseCity(name: string, uf: string): Promise<boolean> {
  const cleanName = String(name).trim().slice(0, 80);
  const cleanUf = String(uf).toUpperCase();
  if (!cleanName || !/^[A-Z]{2}$/.test(cleanUf)) throw new Error("Cidade inválida");
  const cities = await serverGetOr<SelectedCity[]>("/cities", [], 60);
  const slug = citySlug(cleanName, cleanUf);
  const city = cities.find((c) => c.slug === slug);
  await saveCity(city ?? { id: "", name: cleanName, state: cleanUf, slug });
  return Boolean(city);
}

/** Atalho para as cidades atendidas listadas na tela. */
export async function chooseServedCity(slug: string): Promise<boolean> {
  const cities = await serverGetOr<SelectedCity[]>("/cities", [], 60);
  const city = cities.find((c) => c.slug === slug);
  if (!city) return false;
  await saveCity(city);
  return true;
}
