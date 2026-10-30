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
          "/dashboard",
          "/admin",
          "/appointments",
          "/favorites",
          "/notifications",
          "/profile",
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/reset-password",
          "/my-schedule",
          "/*/book",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
