import type { AuthUser, StaffRoleApi } from "@/types/auth";

export type NavIconKey =
  | "dashboard"
  | "tables"
  | "floorMap"
  | "menu"
  | "orders"
  | "shift"
  | "billing"
  | "kitchen"
  | "waiters"
  | "inventory"
  | "analytics"
  | "settings";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", iconKey: "dashboard" },
  { href: "/tables", label: "Tables", iconKey: "tables" },
  { href: "/floor-map", label: "Floor map", iconKey: "floorMap" },
  { href: "/menu", label: "Menu", iconKey: "menu" },
  { href: "/orders", label: "Orders", iconKey: "orders" },
  { href: "/shift", label: "Shift", iconKey: "shift" },
  { href: "/billing", label: "Billing", iconKey: "billing" },
  { href: "/kitchen", label: "Kitchen", iconKey: "kitchen" },
  { href: "/waiters", label: "Staffs", iconKey: "waiters" },
  { href: "/inventory", label: "Inventory", iconKey: "inventory" },
  { href: "/analytics", label: "Analytics", iconKey: "analytics" },
  { href: "/settings", label: "Settings", iconKey: "settings" },
] as const;

export const superAdminNavHrefs = ["/dashboard", "/super-admin", "/permissions"] as const;

export const memberNavByRole: Record<StaffRoleApi, ReadonlyArray<(typeof navItems)[number]["href"]>> = {
  /** Venue admin: floor shift UI is for waiters/managers only — omit `/shift` from nav. */
  Admin: navItems.map((item) => item.href).filter((href) => href !== "/shift"),
  Manager: ["/dashboard", "/orders", "/shift", "/tables", "/billing", "/kitchen"],
  /** Billing is manager/admin; waiters use Tables for payment + Orders for the queue. */
  Waiter: ["/orders", "/shift", "/tables"],
  Kitchen: ["/kitchen"],
};

/** Sidebar order for roles that should not follow the global `navItems` sequence. */
const NAV_ORDER_BY_ROLE: Partial<Record<StaffRoleApi, readonly string[]>> = {
  Waiter: ["/orders", "/shift", "/tables"],
};

export function getNavItemsForUser(user: AuthUser | null) {
  if (!user) return [];
  if (user.globalRole === "SuperAdmin") return [];
  if (!user.role) return [];

  const allowed = new Set(memberNavByRole[user.role]);
  const filtered = navItems.filter((item) => allowed.has(item.href));
  const order = NAV_ORDER_BY_ROLE[user.role];
  if (order?.length) {
    const rank = (href: string) => {
      const i = order.indexOf(href);
      return i === -1 ? 999 : i;
    };
    filtered.sort((a, b) => rank(a.href) - rank(b.href));
  }
  return filtered;
}

/** Shared route gate so page-level access mirrors sidebar visibility. */
export function canAccessRouteForUser(user: AuthUser | null, href: string): boolean {
  if (!user) return false;
  if (user.globalRole === "SuperAdmin") return superAdminNavHrefs.includes(href as (typeof superAdminNavHrefs)[number]);
  if (!user.role) return false;
  return memberNavByRole[user.role].includes(href as (typeof navItems)[number]["href"]);
}

