import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Beauty Queen - Your Beauty, Our Priority",
    template: "%s | Beauty Queen",
  },
  description:
    "Shop the finest collection of sarees, kurtis, tops, leggings, cosmetics, and more. Quality fashion at affordable prices. Your Beauty, Our Priority.",
  keywords: [
    "beauty queen",
    "sarees",
    "kurtis",
    "tops",
    "leggings",
    "cosmetics",
    "online shopping",
    "fashion",
    "women's clothing",
    "traditional wear",
  ],
  authors: [{ name: "Beauty Queen" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Beauty Queen",
    title: "Beauty Queen - Your Beauty, Our Priority",
    description:
      "Shop the finest collection of sarees, kurtis, tops, leggings, cosmetics, and more.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Beauty Queen - Your Beauty, Our Priority",
    description:
      "Shop the finest collection of sarees, kurtis, tops, leggings, cosmetics, and more.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={inter.className}>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
