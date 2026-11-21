export type AtelierDepartmentId = "saree" | "kurthi" | "cosmetics" | "top" | "leggin";

export interface AtelierDepartment {
  id: AtelierDepartmentId;
  name: string;
  href: string;
  headline: string;
  tagline: string;
  image: string;
  featuredTitle: string;
  fabricNote: string;
  price: number;
  mrp: number;
  sizes: string[];
  accentHex: string;
  secondaryHex: string;
  sculptureLabel: string;
}

export const ATELIER_DEPARTMENTS: AtelierDepartment[] = [
  {
    id: "saree",
    name: "Saree",
    href: "/saree",
    headline: "Heirloom silk, woven to move with light",
    tagline:
      "Handpicked Kanjeevaram weaves, pure zari borders, and fluid festive drapes curated for weddings and evenings.",
    image: "/images/editorial/saree.jpg",
    featuredTitle: "Kumkum Temple-Border Kanjeevaram",
    fabricNote: "Pure mulberry silk with antique gold zari pallu",
    price: 4899,
    mrp: 6499,
    sizes: ["Free Size (5.5m + Blouse)"],
    accentHex: "#B51E48",
    secondaryHex: "#D9A958",
    sculptureLabel: "3D Woven Silk Drape",
  },
  {
    id: "kurthi",
    name: "Kurthi",
    href: "/kurthi",
    headline: "Delicate mirror-work on breathable silk-cotton",
    tagline:
      "Tailored festive and workwear kurthis finished with rose-gold resham embroidery and airy silhouettes.",
    image: "/images/editorial/kurthi.jpg",
    featuredTitle: "Ivory Resham Mirror-Work Kurthi",
    fabricNote: "Hand-finished chanderi silk-cotton blend",
    price: 1899,
    mrp: 2599,
    sizes: ["S", "M", "L", "XL", "XXL"],
    accentHex: "#DFC3A6",
    secondaryHex: "#D4A353",
    sculptureLabel: "3D Embroidered Medallion",
  },
  {
    id: "cosmetics",
    name: "Cosmetics",
    href: "/cosmetics",
    headline: "Velvet pigments and botanical gold radiance",
    tagline:
      "Rich Indian-skin-tone lipsticks, smudge-proof kajal, and luminous saffron-gold facial elixirs for daily rituals.",
    image: "/images/editorial/cosmetics.jpg",
    featuredTitle: "Royal Velvet Lip & Saffron Glow Duo",
    fabricNote: "Matte rose-crimson pigment + 24K botanical serum",
    price: 1299,
    mrp: 1750,
    sizes: ["Standard Ritual Set"],
    accentHex: "#9F1D3D",
    secondaryHex: "#E3B864",
    sculptureLabel: "3D Crystal Flacon & Lip",
  },
  {
    id: "top",
    name: "Top",
    href: "/top",
    headline: "Liquid satin pleats for effortless dressing",
    tagline:
      "Draped cowl blouses, softly tailored silhouettes, and everyday essentials designed to pair with skirts or denim.",
    image: "/images/editorial/top.jpg",
    featuredTitle: "Dusty Rose Pleated Satin Blouse",
    fabricNote: "Fluid satin weave with antique brass detailing",
    price: 1149,
    mrp: 1599,
    sizes: ["S", "M", "L", "XL"],
    accentHex: "#C98990",
    secondaryHex: "#D4A353",
    sculptureLabel: "3D Draped Satin Ribbon",
  },
  {
    id: "leggin",
    name: "Leggin",
    href: "/leggin",
    headline: "Four-way modal stretch that holds its grace",
    tagline:
      "Ultra-soft cotton-modal churidar and ankle leggings dyed in rich jewel tones for all-day comfort without sagging.",
    image: "/images/editorial/leggin.jpg",
    featuredTitle: "Jewel-Tone Modal Churidar Pair",
    fabricNote: "95% combed cotton-modal with gold-trimmed hem",
    price: 699,
    mrp: 999,
    sizes: ["S", "M", "L", "XL", "XXL"],
    accentHex: "#8C1E3E",
    secondaryHex: "#E6C282",
    sculptureLabel: "3D Sculpted Contour Rings",
  },
];

export const HOUSE_PROMISES = [
  {
    title: "Curated Indian Textiles",
    detail: "Every saree, kurthi, and cosmetic batch is inspected by our house before dispatch.",
  },
  {
    title: "Razorpay UPI & COD",
    detail: "Instant UPI, cards, and cash-on-delivery protected by server-verified checkout.",
  },
  {
    title: "Pan-India Dispatch",
    detail: "Tracked doorstep delivery from Tamil Nadu to every serviceable Indian pincode.",
  },
  {
    title: "Simple 7-Day Returns",
    detail: "Transparent return requests and swift refund tracking directly in your account.",
  },
];
