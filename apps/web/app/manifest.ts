import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Beauty Queen — Your Beauty, Our Priority",
    short_name: "Beauty Queen",
    description:
      "Shop handpicked Kanjeevaram sarees, embroidered kurthis, tops, leggings, and velvet cosmetics.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF7F2",
    theme_color: "#1A0B10",
    orientation: "portrait-primary",
    categories: ["shopping", "lifestyle", "beauty"],
    icons: [
      {
        src: "/images/editorial/saree.jpg",
        sizes: "512x512",
        type: "image/jpeg",
      },
    ],
  };
}
