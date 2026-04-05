"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Plain anchor (not next/link) so Turbopack/HMR doesn’t tie this route to `link.js`,
 * and SSR markup matches the client (no prefetch/ref churn).
 */
export function ForgotPasswordLink({ className }: { className?: string }) {
  return (
    <a
      href="/forgot-password"
      suppressHydrationWarning
      className={cn(
        "text-sm font-medium text-foreground/90 transition-colors hover:text-foreground",
        className,
      )}
    >
      Forgot password?
    </a>
  );
}
