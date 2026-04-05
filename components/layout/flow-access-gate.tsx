"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useAuthHydration } from "@/lib/auth-hydration";
import {
  canAccessMainApp,
  getPostAuthRedirectPath,
  isFlowPath,
  isSuperAdmin,
} from "@/lib/auth-routing";
import { AuthLoadingSkeleton } from "@/components/layout/auth-loading";

/** Routes onboarding, pending approval, rejection, and super-admin review flows. */
export function FlowAccessGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthHydration();
  const user = useAuthStore((s) => s.user);

  React.useEffect(() => {
    if (!hydrated || !user) return;

    if (isSuperAdmin(user)) {
      if (!pathname.startsWith("/super-admin")) {
        router.replace("/dashboard");
      }
      return;
    }

    if (canAccessMainApp(user) && isFlowPath(pathname)) {
      router.replace("/dashboard");
      return;
    }

    if (!canAccessMainApp(user)) {
      const target = getPostAuthRedirectPath(user);
      if (pathname !== target) router.replace(target);
    }
  }, [hydrated, user, pathname, router]);

  if (!hydrated || !user) return <AuthLoadingSkeleton />;

  return <>{children}</>;
}
