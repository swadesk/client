"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRestaurantStore } from "@/store/restaurant-store";
import { useAuthStore } from "@/store/auth-store";
import { Sidebar } from "@/components/layout/sidebar";
import { TopHeader } from "@/components/layout/top-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const setRestaurants = useRestaurantStore((s) => s.setRestaurants);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const { data: restaurants } = useQuery({
    queryKey: ["restaurants", user?.globalRole],
    queryFn: async () => {
      const list = await api.restaurants.list();
      if (user?.globalRole !== "SuperAdmin") return list;

      // SuperAdmin should also see onboarding requests in the restaurant switcher.
      const pending = await api.superAdmin.pendingRestaurants();
      const all = [...list, ...pending];
      const byId = new Map(all.map((r) => [r.id, r]));
      return Array.from(byId.values());
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: !!accessToken,
  });
  React.useEffect(() => {
    setRestaurants(
      (restaurants ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        logoUrl: r.logoUrl,
        roomSections: r.roomSections,
      })),
    );
  }, [restaurants, setRestaurants]);

  return (
    <div className="min-h-dvh bg-[hsl(220_14%_96%)] dark:bg-[hsl(222_30%_7%)]">
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      {/* Main column: offset for fixed sidebar on md+; scrolls independently */}
      <div className="flex h-dvh min-h-0 flex-col md:pl-72">
        <TopHeader onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <div className="mx-auto min-w-0 w-full max-w-[1600px] space-y-8 px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 md:px-8 lg:px-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
