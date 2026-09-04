import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const CONTACT_CONFIG = {
  address: process.env.NEXT_PUBLIC_STORE_ADDRESS || "Beauty Queen Fashion Store, 123 Main Street, Near City Mall, Chennai, Tamil Nadu 600001, India",
  phones: (process.env.NEXT_PUBLIC_STORE_PHONES || "+91 98765 43210,+91 98765 43211").split(","),
  emails: (process.env.NEXT_PUBLIC_STORE_EMAILS || "support@beautyqueen.in,orders@beautyqueen.in").split(","),
  hours: process.env.NEXT_PUBLIC_STORE_HOURS || "Mon - Sat: 10:00 AM - 8:00 PM | Sunday: 11:00 AM - 6:00 PM",
};

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Beauty Queen. Visit our store, call us, or send an email. We are here to help you.",
  openGraph: {
    title: "Contact Us | Beauty Queen",
    description: "Get in touch with Beauty Queen. We are here to help you.",
  },
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
};

export default function ContactPage() {
  const addressLines = CONTACT_CONFIG.address.split(", ");

  return (
    <div className="page-container max-w-3xl">
      <h1 className="page-title text-center">Contact Us</h1>
      <p className="text-muted-foreground text-center mb-10">
        We&apos;d love to hear from you. Reach out to us through any of the following channels.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Store Address</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {addressLines.map((line, i) => (
                <span key={i}>
                  {line}
                  {i < addressLines.length - 1 && <br />}
                </span>
              ))}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Phone</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {CONTACT_CONFIG.phones.map((phone) => {
                const clean = phone.replace(/\s/g, "");
                return (
                  <p key={phone} className="text-sm text-muted-foreground">
                    <a href={`tel:${clean}`} className="hover:text-primary transition-colors">
                      {phone.trim()}
                    </a>
                  </p>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Email</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {CONTACT_CONFIG.emails.map((email) => (
                <p key={email} className="text-sm text-muted-foreground">
                  <a href={`mailto:${email.trim()}`} className="hover:text-primary transition-colors">
                    {email.trim()}
                  </a>
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Store Hours</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm text-muted-foreground">
              {CONTACT_CONFIG.hours.split(" | ").map((h) => (
                <p key={h}>
                  <span className="font-medium text-foreground">{h.split(":")[0]}:</span>
                  {h.split(":").slice(1).join(":")}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
