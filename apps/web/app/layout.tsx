import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

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
      "Shop the finest collection of sarees, kurtis, tops, leggings, cosmetics, and more. Quality fashion at affordable prices.",
    url: SITE_URL,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Beauty Queen - Your Beauty, Our Priority",
      },
    ],
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
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:bg-pink-500 focus:text-white focus:px-4 focus:py-2 focus:rounded focus:top-4 focus:left-4"
        >
          Skip to main content
        </a>
        <Providers>
          <Header />
          <main id="main-content" tabIndex={-1}>{children}</main>
          <Footer />
          <Toaster
            position="top-center"
            richColors
            closeButton
            duration={4000}
            toastOptions={{
              className: "text-sm",
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
