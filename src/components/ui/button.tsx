import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-bold transition-[background,color,border-color,box-shadow,filter] disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
  {
    variants: {
      variant: {
        ink: "bg-ink text-white hover:bg-[#1f333a]",
        primary: "bg-primary text-white hover:bg-primary-strong",
        outline: "border border-line-strong bg-surface font-semibold text-ink hover:border-ink",
        "outline-ink": "border border-ink bg-surface text-ink hover:bg-ink hover:text-white",
        ghost: "bg-transparent font-semibold text-ink-2 hover:bg-soft",
        link: "bg-transparent px-0 text-primary-strong hover:text-[oklch(0.38_0.08_210)]",
        danger: "bg-danger text-white hover:brightness-95",
        "danger-outline": "border border-danger-line bg-surface font-semibold text-danger hover:bg-danger-bg",
        white: "bg-white text-ink hover:bg-soft",
        "dark-outline": "border border-ink-2 bg-transparent font-semibold text-white hover:bg-white/10",
      },
      size: {
        xs: "min-h-8 rounded-md px-2.5 text-xs",
        sm: "min-h-9 rounded-[9px] px-3.5 text-[13px]",
        md: "min-h-11 rounded-[11px] px-[18px] text-sm",
        lg: "min-h-12 rounded-xl px-5 text-[15px]",
        icon: "size-11 rounded-[10px]",
        "icon-sm": "size-9 rounded-[9px]",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "ink", size: "md" },
  },
);

type Variants = VariantProps<typeof buttonVariants>;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, Variants {
  loading?: boolean;
  icon?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, loading, icon, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Icon name="progress_activity" size={18} className="animate-spin" />
      ) : icon ? (
        <Icon name={icon} size={18} />
      ) : null}
      {children}
    </button>
  );
});

interface ButtonLinkProps extends React.ComponentProps<typeof Link>, Variants {
  icon?: string;
}

export function ButtonLink({ className, variant, size, block, icon, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonVariants({ variant, size, block }), className)} {...props}>
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </Link>
  );
}
