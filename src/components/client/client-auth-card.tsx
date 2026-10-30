import { Icon } from "@/components/ui/icon";

/** Cartão das telas de conta da cliente (entrar, criar conta, recuperar senha). */
export function ClientAuthCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[440px] px-4 pt-8 pb-12 sm:pt-14">
      <div className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <Icon name="spa" size={34} className="text-primary-strong" />
        <div>
          <h1 className="m-0 text-[30px] leading-[1.05] font-bold sm:text-[34px]">{title}</h1>
          {sub ? <p className="mt-1.5 mb-0 text-sm text-muted">{sub}</p> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
