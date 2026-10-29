import { ClientShell } from "@/components/client/client-shell";
import { getSelectedCity } from "@/lib/city-server";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientShell city={await getSelectedCity()}>{children}</ClientShell>;
}
