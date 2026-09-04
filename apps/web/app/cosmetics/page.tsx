import { Metadata } from "next";
import CategoryPage from "@/app/category-layout";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Cosmetics",
  description:
    "Premium beauty and cosmetic products for your daily routine. Shop foundation, lipstick, kajal and more at Beauty Queen.",
  openGraph: {
    title: "Cosmetics | Beauty Queen",
    description: "Premium beauty and cosmetic products for your daily routine.",
  },
  alternates: {
    canonical: `${SITE_URL}/cosmetics`,
  },
};

export default function CosmeticsPage() {
  return (
    <CategoryPage
      category="cosmetics"
      title="Cosmetics"
      description="Premium beauty and cosmetic products for your daily routine."
    />
  );
}
