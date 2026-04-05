"use client";

import * as React from "react";
import { ChevronDown, Moon, Sun } from "lucide-react";
import { SidebarTrigger } from "@/components/layout/sidebar";
import { useActiveRestaurant, useRestaurantStore } from "@/store/restaurant-store";
import { VenueLogoMark } from "@/components/branding/venue-branding-logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { isSuperAdmin } from "@/lib/auth-routing";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { EnablePushNotificationsButton } from "@/components/pwa/enable-push-notifications-button";
import { OrderNotificationBell } from "@/components/layout/order-notification-bell";
import { StaffShiftNotificationBell } from "@/components/layout/staff-shift-notification-bell";
import { useStaffShiftStore } from "@/store/staff-shift-store";

/** Isolate shift selector so it closes over a stable `userId` (avoids React 19 getSnapshot thrash with parent `user` identity). */
function StaffBreakBadge({ userId }: { userId: string }) {
  const onBreak = useStaffShiftStore(
    React.useCallback((s) => Boolean(s.byUserId[userId]?.onBreak), [userId]),
  );
  if (!onBreak) return null;
  return (
    <Badge
      variant="secondary"
      className="max-w-[5.5rem] shrink-0 truncate border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-100"
    >
      Break
    </Badge>
  );
}

export function TopHeader({
  onOpenSidebar,
}: {
  onOpenSidebar: () => void;
}) {
  const router = useRouter();
  const active = useActiveRestaurant();
  const { restaurants, activeRestaurantId, setActiveRestaurantId } =
    useRestaurantStore();
  const { setTheme, theme } = useTheme();
  const { user, signOut } = useAuthStore();

  const isDark = theme === "dark";
  const roleLabel =
    user?.globalRole === "SuperAdmin" ? "SuperAdmin" : user?.role ?? (user ? "Staff" : null);
  const canManageTeam = user?.globalRole === "SuperAdmin" || user?.role === "Admin";
  const floorRole = user?.role === "Waiter" || user?.role === "Manager";

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-border/70 bg-background/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4 md:px-8">
        <SidebarTrigger onClick={onOpenSidebar} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "inline-flex h-10 min-w-0 max-w-[min(100%,calc(100vw-8rem))] items-center justify-start gap-2 rounded-xl border border-border/80 bg-card px-3 text-left text-sm font-semibold shadow-sm outline-none transition-colors hover:bg-accent/60 hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                )}
              >
                <VenueLogoMark logoUrl={active?.logoUrl} size={28} alt="" />
                <span className="truncate">
                  {active?.name ?? "Select restaurant"}
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 rounded-xl">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Your restaurants
                  </DropdownMenuLabel>
                  {restaurants.map((r) => (
                    <DropdownMenuItem
                      key={r.id}
                      className="rounded-lg gap-2"
                      onClick={() => setActiveRestaurantId(r.id)}
                    >
                      <VenueLogoMark logoUrl={r.logoUrl} size={28} alt={`${r.name} logo`} />
                      <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
                      {activeRestaurantId === r.id ? (
                        <Badge className="ml-auto border-primary/20 bg-primary/10 text-primary" variant="secondary">
                          Active
                        </Badge>
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <InstallAppButton />
        <EnablePushNotificationsButton />
        <StaffShiftNotificationBell />
        <OrderNotificationBell />

        {floorRole && user?.id ? <StaffBreakBadge userId={user.id} /> : null}

        {isSuperAdmin(user) ? (
          <Button
            variant="outline"
            size="sm"
            className="hidden rounded-xl border-amber-500/40 bg-amber-500/10 text-amber-900 hover:bg-amber-500/15 dark:text-amber-100 md:inline-flex"
            onClick={() => router.push("/permissions")}
          >
            Permissions
          </Button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-10 max-w-[min(100%,14rem)] items-center gap-2 rounded-xl border border-transparent px-2 text-sm font-medium outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Avatar className="size-8 ring-2 ring-primary/15">
              {user?.photoUrl ? (
                <AvatarImage
                  src={user.photoUrl}
                  alt={user.name ? `${user.name} profile photo` : "Profile photo"}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {(user?.name ?? "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden min-w-0 flex-col items-start md:flex">
              <span className="max-w-[10rem] truncate text-sm font-medium leading-tight">
                {user?.name ?? "User"}
              </span>
              {roleLabel ? (
                <Badge
                  variant="secondary"
                  className="mt-0.5 h-5 max-w-full truncate px-1.5 text-[10px] font-semibold uppercase tracking-wide"
                >
                  {roleLabel}
                </Badge>
              ) : null}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push("/profile")}>Profile</DropdownMenuItem>
              {canManageTeam ? (
                <DropdownMenuItem onClick={() => router.push("/waiters")}>Team</DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  signOut();
                  router.replace("/login");
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
