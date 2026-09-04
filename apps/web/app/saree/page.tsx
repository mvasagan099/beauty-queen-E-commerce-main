import { Metadata } from "next";
import CategoryPage from "@/app/category-layout";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Saree Collection",
  description:
    "Discover our exquisite range of sarees for every occasion. Shop Banarasi, Kanjivaram, Chanderi and more at Beauty Queen.",
  openGraph: {
    title: "Saree Collection | Beauty Queen",
    description: "Discover our exquisite range of sarees for every occasion.",
  },
  alternates: {
    canonical: `${SITE_URL}/saree`,
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
