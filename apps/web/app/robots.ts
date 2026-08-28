import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/account",
          "/account/",
          "/orders",
          "/orders/",
          "/cart",
          "/checkout",
          "/wishlist",
          "/seller",
          "/seller/",
          "/admin",
          "/admin/",
          "/login",
          "/verify",
          "/payment",
          "/confirmation",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
