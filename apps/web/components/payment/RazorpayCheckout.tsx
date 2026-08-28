"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { paymentsApi } from "@/lib/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayPrefill {
  name?: string;
  email?: string;
  contact?: string;
}

export interface RazorpayCheckoutOptions {
  checkoutId: string;
  amountPaise: number;
  keyId: string;
  orderId?: string;
  prefill?: RazorpayPrefill;
  notes?: Record<string, string>;
  description?: string;
}

export interface RazorpayCheckoutHandle {
  open: (options: RazorpayCheckoutOptions) => Promise<void>;
}

interface RazorpayCheckoutProps {
  onSuccess: (checkoutId: string) => void;
  onFailure: (checkoutId: string, message: string) => void;
}

const CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

/**
 * Headless Razorpay checkout wrapper.
 *
 * Exposes an imperative `open()` that:
 * 1. Loads the Razorpay SDK on demand (idempotent).
 * 2. Creates a Razorpay order via the backend when one is not provided,
 *    so the amount always comes from the backend.
 * 3. Opens the checkout modal and, on success, verifies the payment against
 *    the backend before calling onSuccess. The success screen is therefore
 *    only ever shown after the backend has confirmed the payment.
 */
export const RazorpayCheckout = forwardRef<
  RazorpayCheckoutHandle,
  RazorpayCheckoutProps
>(function RazorpayCheckout({ onSuccess, onFailure }, ref) {
  const scriptPromiseRef = useRef<Promise<boolean> | null>(null);

  const loadScript = useCallback((): Promise<boolean> => {
    if (scriptPromiseRef.current) return scriptPromiseRef.current;

    scriptPromiseRef.current = new Promise<boolean>((resolve) => {
      if (
        typeof document !== "undefined" &&
        document.querySelector(`script[src="${CHECKOUT_SCRIPT_URL}"]`)
      ) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = CHECKOUT_SCRIPT_URL;
      script.onload = () => resolve(true);
      script.onerror = () => {
        scriptPromiseRef.current = null;
        resolve(false);
      };
      document.body.appendChild(script);
    });

    return scriptPromiseRef.current;
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      open: async (options: RazorpayCheckoutOptions) => {
        const loaded = await loadScript();
        if (!loaded) {
          throw new Error("Failed to load the payment gateway. Please try again.");
        }

        let orderId = options.orderId;
        if (!orderId) {
          const orderRes = await paymentsApi.createOrder(options.checkoutId);
          orderId = orderRes.data?.razorpayOrderId;
          if (!orderId) {
            throw new Error("Could not create a payment order. Please try again.");
          }
        }

        await new Promise<void>((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: options.keyId,
            amount: options.amountPaise,
            currency: "INR",
            name: "Beauty Queen",
            description: options.description || "Order payment",
            order_id: orderId,
            handler: async (response: {
              razorpay_order_id: string;
              razorpay_payment_id: string;
              razorpay_signature: string;
            }) => {
              try {
                await paymentsApi.verify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                });
                onSuccess(options.checkoutId);
                resolve();
              } catch (err: unknown) {
                const message =
                  err instanceof Error
                    ? err.message
                    : "Payment verification failed";
                onFailure(options.checkoutId, message);
                reject(err);
              }
            },
            prefill: options.prefill,
            notes: options.notes,
            theme: { color: "#ec4899" },
            modal: {
              ondismiss: () => {
                reject(new Error("Payment cancelled"));
              },
            },
          });

          rzp.on("payment.failed", (response: { error?: { description?: string } }) => {
            const message =
              response.error?.description || "Payment failed";
            onFailure(options.checkoutId, message);
            reject(new Error(message));
          });

          rzp.open();
        });
      },
    }),
    [loadScript, onSuccess, onFailure]
  );

  return null;
});