import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[760px] items-center px-4 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <Icon name="spa" size={24} />
            <b className="text-lg">belezaOur</b>
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-[760px] flex-col gap-4 px-4 py-8 text-[15px] leading-relaxed text-ink-2">
        {children}
      </main>
    </div>
  );
}
