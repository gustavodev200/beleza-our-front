import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

const fieldBase =
  "w-full min-w-0 rounded-[10px] border-[1.5px] border-[#dde2e4] bg-surface px-3 py-3 text-base text-ink outline-none transition-colors placeholder:text-subtle focus:border-primary aria-[invalid=true]:border-danger sm:text-[15px] disabled:bg-soft disabled:text-muted";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(fieldBase, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, "resize-y", className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(fieldBase, "appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <Icon
        name="expand_more"
        size={20}
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted"
      />
    </div>
  );
});

interface FieldProps {
  label: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode;
}

/** Rótulo + controle + erro, com os atributos de acessibilidade ligados. */
export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": error || hint ? msgId : undefined })}
      {error ? (
        <p id={msgId} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("text-xs font-bold tracking-[.06em] text-muted uppercase", className)}>{children}</div>;
}
