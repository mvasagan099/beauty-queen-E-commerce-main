import CategoryPage from "@/app/category-layout";

interface CollectionRouteProps {
  params: Promise<{ slug: string }>;
}

function formatSlugTitle(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function DynamicCollectionPage({ params }: CollectionRouteProps) {
  const { slug } = await params;
  const cleanSlug = decodeURIComponent(slug).toLowerCase();
  const title = formatSlugTitle(cleanSlug);

  return (
    <CategoryPage
      category={cleanSlug}
      title={title}
      description={`Explore our curated ${title.toLowerCase()} collection at Beauty Queen.`}
    />
  );
}
