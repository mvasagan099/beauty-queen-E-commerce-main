export const AtelierTheme = {
  colors: {
    plum: "#1A0B10",
    plumSoft: "#2D1B22",
    silk: "#FBF7F2",
    silkCard: "#FFFFFF",
    silkMuted: "#F2EAE0",
    crimson: "#A81C44",
    crimsonDark: "#861536",
    zari: "#D4A353",
    zariSoft: "#F6EBCE",
    ink: "#26141B",
    muted: "#6B535B",
    border: "#E6DAD0",
    success: "#1F7A4D",
    successSoft: "#E6F4EC",
    danger: "#C62828",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 18,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 22,
    xl: 30,
  },
} as const;

export function formatPrice(amount: number | null | undefined): string {
  const num = Number(amount || 0);
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
}

export const EDITORIAL_COLLECTIONS = [
  {
    slug: "saree",
    title: "Sarees",
    subtitle: "Kanjeevaram & Zari",
    image: require("../../assets/editorial/saree.jpg"),
  },
  {
    slug: "kurthi",
    title: "Kurthis",
    subtitle: "Embroidered Silk-Cotton",
    image: require("../../assets/editorial/kurthi.jpg"),
  },
  {
    slug: "top",
    title: "Tops",
    subtitle: "Draped Blouses",
    image: require("../../assets/editorial/top.jpg"),
  },
  {
    slug: "leggin",
    title: "Leggings",
    subtitle: "4-Way Stretch Modal",
    image: require("../../assets/editorial/leggin.jpg"),
  },
  {
    slug: "cosmetics",
    title: "Cosmetics",
    subtitle: "Velvet Pigments",
    image: require("../../assets/editorial/cosmetics.jpg"),
  },
] as const;
