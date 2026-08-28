import { Metadata } from "next";
import CategoryPage from "@/app/category-layout";

export const metadata: Metadata = {
  title: "Kurthi Collection",
  description:
    "Explore our beautiful range of kurtis for everyday elegance. Shop Anarkali, A-Line, Designer kurtis at Beauty Queen.",
  openGraph: {
    title: "Kurthi Collection | Beauty Queen",
    description: "Explore our beautiful range of kurtis for everyday elegance.",
  },
};

export default function KurthiPage() {
  return (
    <CategoryPage
      category="kurthi"
      title="Kurthi Collection"
      description="Explore our beautiful range of kurtis for everyday elegance."
    />
  );
}
