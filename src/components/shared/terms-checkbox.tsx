import Link from "next/link";
import type { UseFormRegisterReturn } from "react-hook-form";

/** Aceite dos Termos de Uso e da Política de Privacidade nos cadastros por e-mail. */
export function TermsCheckbox({ field, error }: { field: UseFormRegisterReturn; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-ink-2">
        <input
          type="checkbox"
          aria-invalid={Boolean(error)}
          className="mt-0.5 size-5 shrink-0 accent-[oklch(0.5_0.09_210)]"
          {...field}
        />
        <span>
          Li e concordo com os{" "}
          <Link href="/termos" target="_blank" className="font-bold text-ink underline">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" target="_blank" className="font-bold text-ink underline">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
