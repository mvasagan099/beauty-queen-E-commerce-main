import { Metadata } from "next";
import CategoryPage from "@/app/category-layout";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Leggin Collection",
  description:
    "Comfortable and stylish leggings for every occasion. Shop cotton, jeggings, palazzo and more at Beauty Queen.",
  openGraph: {
    title: "Leggin Collection | Beauty Queen",
    description: "Comfortable and stylish leggings for every occasion.",
  },
  alternates: {
    canonical: `${SITE_URL}/leggin`,
  },
};

export default function LegginPage() {
  return (
    <CategoryPage
      category="leggin"
      title="Leggin Collection"
      description="Comfortable and stylish leggings for every occasion."
    />
  );
}
