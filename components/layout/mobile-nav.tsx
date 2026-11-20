"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getNavItemsForUser, type NavIconKey } from "@/components/layout/nav-items";
import { useAuthStore } from "@/store/auth-store";
import { isSuperAdmin } from "@/lib/auth-routing";
import type { StaffRoleApi } from "@/types/auth";
import {
  AnalyticsIcon,
  BillingIcon,
  BuildingIcon,
  DashboardIcon,
  FloorMapIcon,
  InventoryIcon,
  KitchenIcon,
  MenuBookIcon,
  MenuIconGlyph,
  OrdersIcon,
  RoomsIcon,
  SettingsIcon,
  ShiftIcon,
  ShieldIcon,
  TablesIcon,
  WaitersIcon,
} from "./sidebar-icons";

const memberNavIcons: Record<NavIconKey, ComponentType<{ className?: string }>> = {
  dashboard: DashboardIcon,
  tables: TablesIcon,
  rooms: RoomsIcon,
  floorMap: FloorMapIcon,
  menu: MenuBookIcon,
  orders: OrdersIcon,
  shift: ShiftIcon,
  billing: BillingIcon,
  kitchen: KitchenIcon,
  waiters: WaitersIcon,
  inventory: InventoryIcon,
  analytics: AnalyticsIcon,
  settings: SettingsIcon,
};

const SHORT_LABEL: Record<string, string> = {
  "/dashboard": "Home",
  "/rooms": "Rooms",
  "/tables": "Tables",
  "/floor-map": "Floor",
  "/menu": "Menu",
  "/orders": "Orders",
  "/shift": "Shift",
  "/billing": "Bills",
  "/kitchen": "Kitchen",
  "/waiters": "Team",
  "/inventory": "Stock",
  "/analytics": "Stats",
  "/settings": "Settings",
  "/super-admin": "Venues",
  "/permissions": "Access",
};

/** Day-to-day destinations kept on the thumb bar. Everything else stays in More. */
const PRIMARY_HREFS: Record<StaffRoleApi, readonly string[]> = {
  Admin: ["/dashboard", "/rooms", "/orders", "/billing"],
  Manager: ["/dashboard", "/orders", "/rooms", "/kitchen"],
  Waiter: ["/orders", "/shift", "/rooms"],
  Kitchen: ["/kitchen", "/shift", "/menu", "/inventory"],
};

const superAdminItems = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/super-admin", label: "Venues", icon: BuildingIcon },
  { href: "/permissions", label: "Access", icon: ShieldIcon },
] as const;

export function MobileNav({ onOpenMore }: { onOpenMore: () => void }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const showSuperAdmin = isSuperAdmin(user);

  const items = showSuperAdmin
    ? superAdminItems.map((item) => ({
        href: item.href,
        label: SHORT_LABEL[item.href] ?? item.label,
        icon: item.icon,
      }))
    : getNavItemsForUser(user).map((item) => ({
        href: item.href,
        label: SHORT_LABEL[item.href] ?? item.label,
        icon: memberNavIcons[item.iconKey],
      }));

  if (items.length === 0) return null;

  const primaryOrder = user?.role ? PRIMARY_HREFS[user.role] : [];
  const primary = showSuperAdmin
    ? items
    : primaryOrder
        .map((href) => items.find((item) => item.href === href))
        .filter((item): item is (typeof items)[number] => Boolean(item));
  const visible = primary.length > 0 ? primary : items.slice(0, 4);
  const overflow = items.filter((item) => !visible.some((entry) => entry.href === item.href));
  const showMore = overflow.length > 0;
  const moreActive = overflow.some((item) => pathname === item.href);
  const columns = visible.length + (showMore ? 1 : 0);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.35)] backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {visible.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 touch-manipulation flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium leading-tight",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
        {showMore ? (
          <button
            type="button"
            onClick={onOpenMore}
            aria-label="More navigation"
            className={cn(
              "flex min-h-14 touch-manipulation flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium leading-tight",
              moreActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <MenuIconGlyph className="size-5 shrink-0" />
            <span>More</span>
          </button>
        ) : null}
      </div>
    </nav>
  );
}
