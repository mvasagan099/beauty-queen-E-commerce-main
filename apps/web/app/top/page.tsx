import { Metadata } from "next";
import CategoryPage from "@/app/category-layout";

export const metadata: Metadata = {
  title: "Top Collection",
  description:
    "Find the perfect tops to complete your wardrobe. Shop crop tops, peplum tops, blouse and more at Beauty Queen.",
  openGraph: {
    title: "Top Collection | Beauty Queen",
    description: "Find the perfect tops to complete your wardrobe.",
  },
};

export default function TopPage() {
  return (
    <CategoryPage
      category="top"
      title="Top Collection"
      description="Find the perfect tops to complete your wardrobe."
    />
  );
}
