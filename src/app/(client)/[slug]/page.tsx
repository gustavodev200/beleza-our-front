import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ProfileView } from "@/components/client/profile-view";
import { BUSINESS_TYPE_LABEL } from "@/lib/labels";
import { NotFoundError, serverGet } from "@/lib/server-api";
import type { BusinessProfile } from "@/lib/types";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** null = indisponível (pendente, recusado, suspenso ou inexistente — a API não distingue). */
const loadProfile = cache(async (slug: string): Promise<BusinessProfile | null> => {
  if (!SLUG.test(slug) || slug.length > 120) return null;
  try {
    return await serverGet<BusinessProfile>(`/businesses/${slug}`, 60);
  } catch (e) {
    if (e instanceof NotFoundError) return null;
    throw e;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = await loadProfile(slug).catch(() => null);
  if (!b) return { title: "Estabelecimento indisponível", robots: { index: false } };
  const title = `${b.name} — ${BUSINESS_TYPE_LABEL[b.type]} em ${b.neighborhood}`;
  const description =
    b.description?.slice(0, 155) ??
    `Agende online no ${b.name}, ${b.neighborhood} · ${b.city.name}. Horários reais e confirmação no WhatsApp.`;
  const images = b.coverUrl ? [{ url: b.coverUrl, width: 1600, height: 600 }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: `/${b.slug}` },
    openGraph: { title, description, url: `/${b.slug}`, images, type: "website" },
    twitter: { card: images ? "summary_large_image" : "summary", title, description },
  };
}

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await loadProfile(slug);
  if (!profile) notFound();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: profile.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: profile.address ?? undefined,
      addressLocality: profile.city.name,
      addressRegion: profile.city.state,
      addressCountry: "BR",
    },
    image: profile.coverUrl ?? undefined,
    aggregateRating: profile.ratingCount
      ? { "@type": "AggregateRating", ratingValue: profile.ratingAvg, reviewCount: profile.ratingCount }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        // JSON escapado: "<" vira sequência unicode para não fechar a tag script.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ProfileView profile={profile} />
    </>
  );
}
