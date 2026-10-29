import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "belezaOur — beleza e bem-estar",
    short_name: "belezaOur",
    description: "Encontre salões, barbearias e profissionais perto de você e agende em poucos toques.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f7f5",
    theme_color: "#14242b",
    categories: ["lifestyle", "beauty"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Explorar", url: "/explore", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Meus agendamentos", url: "/appointments", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      {
        name: "Minha agenda (profissional)",
        url: "/my-schedule",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
