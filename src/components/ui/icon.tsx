import { cn } from "@/lib/cn";

interface IconProps {
  name: string;
  size?: number;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Só passe quando o ícone sozinho carrega significado (sem texto ao lado). */
  label?: string;
}

/** Material Symbols Outlined (identidade visual §10), self-hosted. */
export function Icon({ name, size = 20, fill, className, style, label }: IconProps) {
  return (
    <span
      className={cn("material-symbols-outlined shrink-0 leading-none", fill && "icon-fill", className)}
      style={{ fontSize: size, ...style }}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {name}
    </span>
  );
}
