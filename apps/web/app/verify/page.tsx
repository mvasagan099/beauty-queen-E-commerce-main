"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";

const verifySchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

type VerifyFormData = z.infer<typeof verifySchema>;

export default function VerifyPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const stored = localStorage.getItem("otp-email");
    if (stored) setEmail(stored);
    else router.push("/login");
  }, [router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
  });

  const onSubmit = async (data: VerifyFormData) => {
    if (!email) {
      setError("No email found. Please go back to login.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authApi.verifyOtp(email, data.otp);
      if (res?.user) {
        setUser(res.user);
      }
      localStorage.removeItem("otp-email");
      router.push("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid OTP. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || countdown > 0) return;
    setResendLoading(true);
    setResendSuccess(false);
    try {
      await authApi.sendOtp(email);
      setResendSuccess(true);
      setCountdown(30);
    } catch {
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the 6-digit code sent to your email
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {email && (
            <div className="text-center mb-4 p-3 rounded-md bg-muted">
              <p className="text-sm text-muted-foreground">OTP sent to</p>
              <p className="text-sm font-semibold text-foreground">{email}</p>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">One-Time Password</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                {...register("otp")}
                aria-describedby={errors.otp ? "otp-error" : undefined}
                autoComplete="one-time-code"
                disabled={loading}
                autoFocus
              />
              {errors.otp && (
                <p id="otp-error" className="text-sm text-destructive text-center">{errors.otp.message}</p>
              )}
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive text-center">{error}</p>
              </div>
            )}
            {resendSuccess && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-700 text-center">OTP resent successfully!</p>
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
                  Verifying...
                </>
              ) : (
                "Verify & Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Didn&apos;t receive the code?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || resendLoading}
                className="text-primary font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
              </button>
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
