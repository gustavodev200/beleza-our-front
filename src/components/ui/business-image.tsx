"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { stripes } from "@/lib/colors";
import { initials } from "@/lib/format";

/**
 * Capa/logo enviadas pelo dono (Cloudinary já entrega f_auto,q_auto). Sem
 * imagem — ou se ela falhar — cai nas listras do protótipo, com a matiz do nome.
 */
export function BusinessImage({
  src,
  seed,
  alt,
  className,
  kind = "cover",
  priority,
}: {
  src: string | null | undefined;
  seed: string;
  alt: string;
  className?: string;
  kind?: "cover" | "logo";
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const show = src && !failed;
  return (
    <div className={cn("relative overflow-hidden", className)} style={show ? undefined : { background: stripes(seed) }}>
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL externa já otimizada pela CDN
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : kind === "logo" ? (
        <span className="absolute inset-0 grid place-items-center text-lg font-extrabold text-ink/70">
          {initials(seed)}
        </span>
      ) : null}
    </div>
  );
}
