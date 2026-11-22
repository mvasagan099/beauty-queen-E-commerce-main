"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi, cartApi } from "@/lib/api";
import { useAuthStore, useGuestCartStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const setUser = useAuthStore((s) => s.setUser);
  const guestItems = useGuestCartStore((s) => s.items);
  const clearGuestCart = useGuestCartStore((s) => s.clear);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || typeof window === "undefined") return;

    const initGoogle = () => {
      const gsi = (window as any).google?.accounts?.id;
      if (!gsi || !googleBtnRef.current) return;
      gsi.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential?: string }) => {
          if (!response?.credential) return;
          setLoading(true);
          setError("");
          try {
            const res = await authApi.googleSignIn(response.credential);
            if (res?.user) {
              setUser(res.user);
            }
            if (guestItems.length > 0) {
              for (const item of guestItems) {
                await cartApi.add(item.productId, item.size, item.quantity).catch(() => undefined);
              }
              clearGuestCart();
            }
            toast.success("Signed in with Google");
            router.push("/");
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Google sign-in failed");
          } finally {
            setLoading(false);
          }
        },
      });
      gsi.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 340,
        text: "continue_with",
      });
    };

    if ((window as any).google?.accounts?.id) {
      initGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
  }, [router, setUser, guestItems, clearGuestCart]);

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError("");
    try {
      await authApi.sendOtp(data.email);
      localStorage.setItem("otp-email", data.email);
      router.push("/verify");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email to receive a one-time password
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                aria-describedby={errors.email ? "email-error" : undefined}
                autoComplete="email"
                disabled={loading}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  Continue with Email
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <div className="mt-5">
              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-border w-full" />
                <span className="bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider">
                  or
                </span>
                <div className="border-t border-border w-full" />
              </div>
              <div ref={googleBtnRef} className="flex justify-center" />
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
