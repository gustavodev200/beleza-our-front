import "server-only";
import { cookies } from "next/headers";
import { CITY_COOKIE, parseCity, type SelectedCity } from "./city";

export async function getSelectedCity(): Promise<SelectedCity | null> {
  return parseCity((await cookies()).get(CITY_COOKIE)?.value);
}
