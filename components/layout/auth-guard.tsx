"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useAuthHydration } from "@/lib/auth-hydration";
import { AuthLoadingSkeleton } from "@/components/layout/auth-loading";

const PUBLIC_PATHS = new Set<string>(["/login"]);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthHydration();
  const accessToken = useAuthStore((s) => s.accessToken);

  React.useEffect(() => {
    if (!hydrated) return;
    if (PUBLIC_PATHS.has(pathname)) return;
    if (!accessToken) router.replace("/login");
  }, [hydrated, accessToken, pathname, router]);

  if (!hydrated) return <AuthLoadingSkeleton />;
  if (PUBLIC_PATHS.has(pathname)) return <>{children}</>;
  if (!accessToken) return <AuthLoadingSkeleton />;

  return <>{children}</>;
}
