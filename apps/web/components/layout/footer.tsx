import Link from "next/link";
import { Heart, Mail, Phone } from "lucide-react";

const categories = [
  { name: "Saree", href: "/saree" },
  { name: "Kurthi", href: "/kurthi" },
  { name: "Top", href: "/top" },
  { name: "Leggin", href: "/leggin" },
  { name: "Cosmetics", href: "/cosmetics" },
];

export default function Footer() {
  return (
    <footer className="border-t bg-gray-50 mt-auto" role="contentinfo">
      <div className="container-page py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="text-xl font-bold text-primary tracking-tight">
              Beauty Queen
            </Link>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Your Beauty, Our Priority. Shop the finest collection of sarees,
              kurtis, tops, leggings, and cosmetics at affordable prices.
            </p>
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <Heart className="h-4 w-4 text-primary" />
              <span>Mrs. Mahadevi Elaiyaraja</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
              Categories
            </h3>
            <ul className="space-y-2.5" aria-label="Product categories">
              {categories.map((cat) => (
                <li key={cat.href}>
                  <Link
                    href={cat.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/orders"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  My Orders
                </Link>
              </li>
              <li>
                <Link
                  href="/wishlist"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Wishlist
                </Link>
              </li>
              <li>
                <Link
                  href="/cart"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Cart
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
              My Account
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Login
                </Link>
              </li>
              <li>
                <Link
                  href="/account"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  My Account
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/signup"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Become a Seller
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Beauty Queen. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Designed and Developed by V scripts
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
