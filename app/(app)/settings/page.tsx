"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useActiveRestaurant, useRestaurantStore } from "@/store/restaurant-store";
import { VenueBrandingLogo } from "@/components/branding/venue-branding-logo";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { canAccessRouteForUser } from "@/components/layout/nav-items";
import { getPostAuthRedirectPath } from "@/lib/auth-routing";
import { EmptyState } from "@/components/shared/empty-state";

export default function SettingsPage() {
  const router = useRouter();
  const autoId = React.useId();
  const notifyId = React.useId();
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const activeRestaurant = useActiveRestaurant();
  const user = useAuthStore((s) => s.user);
  const canViewSettings = canAccessRouteForUser(user, "/settings");
  const qc = useQueryClient();

  React.useEffect(() => {
    if (user && !canViewSettings) router.replace(getPostAuthRedirectPath(user));
  }, [user, canViewSettings, router]);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin.settings", restaurantId ?? ""],
    queryFn: () => api.admin.settings(restaurantId!),
    enabled: !!restaurantId && !!user && canViewSettings,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Omit<import("@/types/api").AdminUpdateSettingsRequest, "restaurantId">) =>
      api.admin.updateSettings({ restaurantId: restaurantId!, ...data }),
    onSuccess: () => {
      if (restaurantId) void qc.invalidateQueries({ queryKey: ["admin.settings", restaurantId] });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const autoAccept = settings?.autoAcceptQr ?? true;
  const notifyReady = settings?.notifyOnReady ?? true;

  const setAutoAccept = (v: boolean) =>
    updateMutation.mutate({ autoAcceptQr: v });
  const setNotifyReady = (v: boolean) =>
    updateMutation.mutate({ notifyOnReady: v });
  if (!restaurantId) {
    return (
      <div className="space-y-12">
        <PageHeader title="Settings" description="Preferences and operational defaults for your outlet." />
        <p className="text-sm text-muted-foreground">Select a restaurant to manage settings.</p>
      </div>
    );
  }
  if (user && !canViewSettings) {
    return (
      <EmptyState
        title="Settings unavailable"
        description="You are being redirected to your workspace."
      />
    );
  }

  return (
    <div className="space-y-12">
      <PageHeader
        title="Settings"
        description="Preferences and operational defaults for your outlet."
      />

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      ) : (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-lg">Operational</CardTitle>
            <CardDescription>How QR orders flow into your kitchen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className={cn(
                "flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 p-4",
                autoAccept ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-muted",
              )}
            >
              <div className="min-w-0 space-y-1">
                <Label htmlFor={autoId} className="text-sm font-medium leading-snug">
                  Auto-accept QR orders
                </Label>
                <p id={`${autoId}-desc`} className="text-xs text-muted-foreground">
                  Send new QR orders straight to the kitchen queue.
                </p>
              </div>
              <Switch
                id={autoId}
                checked={autoAccept}
                onCheckedChange={setAutoAccept}
                aria-describedby={`${autoId}-desc`}
              />
            </div>
            <Separator />
            <div
              className={cn(
                "flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 p-4",
                notifyReady ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-muted",
              )}
            >
              <div className="min-w-0 space-y-1">
                <Label htmlFor={notifyId} className="text-sm font-medium leading-snug">
                  Notify on ready orders
                </Label>
                <p id={`${notifyId}-desc`} className="text-xs text-muted-foreground">
                  Show a toast when an order becomes ready.
                </p>
              </div>
              <Switch
                id={notifyId}
                checked={notifyReady}
                onCheckedChange={setNotifyReady}
                aria-describedby={`${notifyId}-desc`}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-lg">Appearance</CardTitle>
            <CardDescription>Theme and display preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Branding
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your uploaded venue logo appears in the app shell and QR menu when the API provides{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">logoUrl</code>. If none is set,
                guests see the NamasQr brand.
              </p>
              <div className="mt-4 flex justify-center">
                <VenueBrandingLogo
                  logoUrl={activeRestaurant?.logoUrl}
                  height={44}
                  alt={activeRestaurant?.name ? `${activeRestaurant.name} logo` : "Venue logo"}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use the <span className="font-medium text-foreground">sun / moon</span> toggle in the
              top bar to switch between light and dark mode.
            </p>
          </CardContent>
        </Card>

      </div>
      )}
    </div>
  );
}
