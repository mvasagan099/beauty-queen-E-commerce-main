import { Metadata } from "next";
import CategoryPage from "@/app/category-layout";

export const metadata: Metadata = {
  title: "Saree Collection",
  description:
    "Discover our exquisite range of sarees for every occasion. Shop Banarasi, Kanjivaram, Chanderi and more at Beauty Queen.",
  openGraph: {
    title: "Saree Collection | Beauty Queen",
    description: "Discover our exquisite range of sarees for every occasion.",
  },
};

export default function SareePage() {
  return (
    <CategoryPage
      category="saree"
      title="Saree Collection"
      description="Discover our exquisite range of sarees for every occasion."
    />
  );
}
