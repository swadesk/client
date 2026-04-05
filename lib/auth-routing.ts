import type { AuthUser } from "@/types/auth";

export function isSuperAdmin(user: AuthUser | null): boolean {
  return user?.globalRole === "SuperAdmin";
}

/** Main staff app (sidebar): active venue staff or platform super-admin. */
export function canAccessMainApp(user: AuthUser | null): boolean {
  if (!user) return false;
  if (user.globalRole === "SuperAdmin") return true;
  return user.canAccessDashboard;
}

/** Who may open table billing / record payments in the staff app. */
export function canCollectTablePayments(user: AuthUser | null): boolean {
  if (!user) return false;
  if (user.globalRole === "SuperAdmin") return true;
  const r = user.role;
  return r === "Admin" || r === "Manager" || r === "Waiter";
}

/**
 * Where to send the user right after login/register or when blocking main app.
 */
export function getPostAuthRedirectPath(user: AuthUser | null): string {
  if (!user) return "/login";
  if (user.globalRole === "SuperAdmin") return "/dashboard";
  if (user.canAccessDashboard) {
    if (user.role === "Kitchen") return "/kitchen";
    if (user.role === "Waiter") return "/orders";
    return "/dashboard";
  }
  if (user.requiresOnboarding) return "/onboarding";
  if (user.restaurantApprovalStatus === "PendingApproval") return "/pending-approval";
  if (user.restaurantApprovalStatus === "Rejected") return "/rejected";
  return "/onboarding";
}

/** Flow routes that do not use the main AppShell. */
export const FLOW_PATH_PREFIXES = [
  "/onboarding",
  "/pending-approval",
  "/rejected",
  "/super-admin",
] as const;

export function isFlowPath(pathname: string): boolean {
  return FLOW_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
