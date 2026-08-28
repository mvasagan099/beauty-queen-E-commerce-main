import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Beauty Queen. Visit our store, call us, or send an email. We are here to help you.",
  openGraph: {
    title: "Contact Us | Beauty Queen",
    description: "Get in touch with Beauty Queen. We are here to help you.",
  },
};

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        Contact Us
      </h1>

      <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-pink-500">Store Address</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Beauty Queen Fashion Store
              <br />
              123 Main Street, Near City Mall
              <br />
              Chennai, Tamil Nadu 600001
              <br />
              India
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-pink-500">Phone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              <a href="tel:+919876543210" className="hover:text-pink-500">
                +91 98765 43210
              </a>
              <br />
              <a href="tel:+919876543211" className="hover:text-pink-500">
                +91 98765 43211
              </a>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-pink-500">Email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              <a
                href="mailto:support@beautyqueen.in"
                className="hover:text-pink-500"
              >
                support@beautyqueen.in
              </a>
              <br />
              <a
                href="mailto:orders@beautyqueen.in"
                className="hover:text-pink-500"
              >
                orders@beautyqueen.in
              </a>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-pink-500">Store Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Monday - Saturday
              <br />
              10:00 AM - 8:00 PM
              <br />
              <br />
              Sunday
              <br />
              11:00 AM - 6:00 PM
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
