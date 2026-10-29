import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/painel",
          "/admin",
          "/agendamentos",
          "/favoritos",
          "/notificacoes",
          "/perfil",
          "/entrar",
          "/minha-agenda",
          "/*/agendar",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
