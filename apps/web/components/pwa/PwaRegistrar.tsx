"use client";

import { useEffect } from "react";

/**
 * Registers the Beauty Queen PWA service worker (/sw.js) in supporting browsers.
 * Safe no-op in unsupported environments or during SSR.
 */
export function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // Non-fatal in environments without HTTPS or SW support
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
