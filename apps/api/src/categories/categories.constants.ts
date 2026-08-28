export interface Category {
  name: string;
  label: string;
  slug: string;
  description: string;
}

export const CATEGORIES: Category[] = [
  {
    name: 'saree',
    label: 'Saree',
    slug: 'saree',
    description: 'Discover our exquisite range of sarees for every occasion.',
  },
  {
    name: 'kurthi',
    label: 'Kurthi',
    slug: 'kurthi',
    description: 'Explore our beautiful range of kurtis for everyday elegance.',
  },
  {
    name: 'top',
    label: 'Top',
    slug: 'top',
    description: 'Find the perfect tops to complete your wardrobe.',
  },
  {
    name: 'leggin',
    label: 'Leggin',
    slug: 'leggin',
    description: 'Comfortable and stylish leggings for every occasion.',
  },
  {
    name: 'cosmetics',
    label: 'Cosmetics',
    slug: 'cosmetics',
    description: 'Premium beauty and cosmetic products for your daily routine.',
  },
];