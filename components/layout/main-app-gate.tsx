"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useAuthHydration } from "@/lib/auth-hydration";
import { canAccessMainApp, getPostAuthRedirectPath } from "@/lib/auth-routing";
import { AuthLoadingSkeleton } from "@/components/layout/auth-loading";

/** Restricts the main staff shell to users who may use the dashboard (active venue or super-admin). */
export function MainAppGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthHydration();
  const user = useAuthStore((s) => s.user);

  React.useEffect(() => {
    if (!hydrated || !user) return;
    if (canAccessMainApp(user)) return;
    router.replace(getPostAuthRedirectPath(user));
  }, [hydrated, user, router]);

  if (!hydrated || !user) return <AuthLoadingSkeleton />;
  if (!canAccessMainApp(user)) return <AuthLoadingSkeleton />;

  return <>{children}</>;
}
