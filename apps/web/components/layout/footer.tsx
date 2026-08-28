import Link from "next/link";

const categories = [
  { name: "Saree", href: "/saree" },
  { name: "Kurthi", href: "/kurthi" },
  { name: "Top", href: "/top" },
  { name: "Leggin", href: "/leggin" },
  { name: "Cosmetics", href: "/cosmetics" },
];

export default function Footer() {
  return (
    <footer className="border-t bg-gray-50" role="contentinfo">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold text-pink-500 mb-4">
              Beauty Queen
            </h3>
            <p className="text-sm text-gray-600">
              Your Beauty, Our Priority. Shop the finest collection of sarees,
              kurtis, tops, leggings, and cosmetics.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Categories</h4>
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li key={cat.href}>
                  <Link
                    href={cat.href}
                    className="text-sm text-gray-600 hover:text-pink-500"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-gray-600 hover:text-pink-500"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/orders"
                  className="text-sm text-gray-600 hover:text-pink-500"
                >
                  My Orders
                </Link>
              </li>
              <li>
                <Link
                  href="/wishlist"
                  className="text-sm text-gray-600 hover:text-pink-500"
                >
                  Wishlist
                </Link>
              </li>
              <li>
                <Link
                  href="/cart"
                  className="text-sm text-gray-600 hover:text-pink-500"
                >
                  Cart
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">My Account</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/login"
                  className="text-sm text-gray-600 hover:text-pink-500"
                >
                  Login
                </Link>
              </li>
              <li>
                <Link
                  href="/account"
                  className="text-sm text-gray-600 hover:text-pink-500"
                >
                  My Account
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/signup"
                  className="text-sm text-gray-600 hover:text-pink-500"
                >
                  Become a Seller
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Beauty Queen. All rights reserved
            by Mrs. Mahadevi Elaiyaraja.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Designed and Developed by V scripts
          </p>
        </div>
      </div>
    </footer>
  );
}
