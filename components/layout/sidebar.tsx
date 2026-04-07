"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getNavItemsForUser, type NavIconKey } from "@/components/layout/nav-items";
import { useActiveRestaurant, useRestaurantStore } from "@/store/restaurant-store";
import { VenueBrandingLogo } from "@/components/branding/venue-branding-logo";
import { useAuthStore } from "@/store/auth-store";
import { isSuperAdmin } from "@/lib/auth-routing";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  AnalyticsIcon,
  BuildingIcon,
  BillingIcon,
  DashboardIcon,
  FloorMapIcon,
  InventoryIcon,
  KitchenIcon,
  MenuBookIcon,
  MenuIconGlyph,
  OrdersIcon,
  QrIcon,
  SettingsIcon,
  ShiftIcon,
  ShieldIcon,
  TablesIcon,
  WaitersIcon,
} from "./sidebar-icons";

const superAdminNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/super-admin", label: "Super Admin", icon: BuildingIcon },
  { href: "/permissions", label: "Permissions", icon: ShieldIcon },
] as const;

const memberNavIcons: Record<NavIconKey, ComponentType<{ className?: string }>> = {
  dashboard: DashboardIcon,
  tables: TablesIcon,
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

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const activeRestaurant = useActiveRestaurant();
  const qrMenuHref = restaurantId
    ? `/qr-menu/${restaurantId}/table_01?pickTable=1`
    : "/login";
  const showSuperAdmin = isSuperAdmin(user);
  const memberNavItems = getNavItemsForUser(user);
  const memberNavItemsWithIcons = memberNavItems.map((item) => ({
    ...item,
    icon: memberNavIcons[item.iconKey],
  }));

  const handleNav = () => onNavigate?.();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pt-5 pb-4">
        <Link href="/dashboard" className="block" onClick={handleNav}>
          <div className="flex items-center">
            <VenueBrandingLogo
              logoUrl={activeRestaurant?.logoUrl}
              height={38}
              alt={activeRestaurant?.name ? `${activeRestaurant.name} logo` : "Venue logo"}
            />
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/50">
            Tradition meets technology
          </p>
        </Link>
      </div>
      <Separator className="shrink-0 bg-sidebar-border" />

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden overscroll-contain px-2 py-4">
        {(showSuperAdmin ? superAdminNavItems : memberNavItemsWithIcons).map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNav}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? showSuperAdmin
                    ? "bg-amber-500/20 text-amber-100 shadow-md ring-1 ring-amber-400/30"
                    : "bg-sidebar-primary text-sidebar-primary-foreground shadow-md ring-1 ring-white/10"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0 opacity-90" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {!showSuperAdmin ? (
        <div className="shrink-0 px-2 pb-5">
          <Separator className="my-3 bg-sidebar-border" />
          <Link
            href={qrMenuHref}
            onClick={handleNav}
            aria-disabled={!restaurantId}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              restaurantId
                ? "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                : "pointer-events-none text-sidebar-foreground/35",
            )}
          >
            <QrIcon className="size-4 shrink-0" />
            <span>QR menu preview</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[4px_0_24px_-8px_rgba(0,0,0,0.15)] md:flex">
        <SidebarContent />
      </aside>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[min(288px,100vw-1rem)] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:w-72">
          <SidebarContent onNavigate={() => onOpenChange(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export function SidebarTrigger({
  onClick,
}: {
  onClick?: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-touch"
      className="md:hidden"
      onClick={onClick}
      aria-label="Open navigation"
    >
      <MenuIconGlyph className="size-5" />
    </Button>
  );
}
