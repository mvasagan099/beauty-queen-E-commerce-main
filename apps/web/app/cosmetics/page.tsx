import { Metadata } from "next";
import CategoryPage from "@/app/category-layout";

export const metadata: Metadata = {
  title: "Cosmetics",
  description:
    "Premium beauty and cosmetic products for your daily routine. Shop foundation, lipstick, kajal and more at Beauty Queen.",
  openGraph: {
    title: "Cosmetics | Beauty Queen",
    description: "Premium beauty and cosmetic products for your daily routine.",
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
