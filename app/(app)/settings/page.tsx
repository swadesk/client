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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { canAccessRouteForUser } from "@/components/layout/nav-items";
import { getPostAuthRedirectPath } from "@/lib/auth-routing";
import { EmptyState } from "@/components/shared/empty-state";

export default function SettingsPage() {
  const router = useRouter();
  const autoId = React.useId();
  const notifyId = React.useId();
  const upiQrFileInputId = React.useId();
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const activeRestaurant = useActiveRestaurant();
  const user = useAuthStore((s) => s.user);
  const canViewSettings = canAccessRouteForUser(user, "/settings");
  const qc = useQueryClient();
  const [qrFile, setQrFile] = React.useState<File | null>(null);

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
  const [upiQrUrl, setUpiQrUrl] = React.useState("");

  React.useEffect(() => {
    setUpiQrUrl(settings?.prepaidUpiQrUrl ?? "");
  }, [settings?.prepaidUpiQrUrl]);

  const setAutoAccept = (v: boolean) =>
    updateMutation.mutate({ autoAcceptQr: v });
  const setNotifyReady = (v: boolean) =>
    updateMutation.mutate({ notifyOnReady: v });
  const uploadQrMutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error("Select a restaurant first.");
      if (!qrFile) throw new Error("Choose a QR image first.");
      const maxBytes = 5 * 1024 * 1024;
      const allowed = new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ]);
      if (!allowed.has(qrFile.type)) {
        throw new Error("Only JPEG, PNG, WebP, or GIF are allowed.");
      }
      if (qrFile.size > maxBytes) {
        throw new Error("QR image must be 5 MB or smaller.");
      }
      const uploaded = await api.uploads.image(qrFile, restaurantId);
      await api.admin.updateSettings({ restaurantId, prepaidUpiQrUrl: uploaded.url });
      return uploaded.url;
    },
    onSuccess: (url) => {
      setUpiQrUrl(url);
      setQrFile(null);
      if (restaurantId) void qc.invalidateQueries({ queryKey: ["admin.settings", restaurantId] });
      toast.success("UPI QR uploaded");
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed to upload QR";
      toast.error(msg);
    },
  });
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

        <Card className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Prepaid (UPI)</CardTitle>
            <CardDescription>
              Upload a UPI QR image; guests see it on the menu when your API includes{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">prepaidUpiQrUrl</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {settings?.prepaidUpiId || settings?.prepaidUpiName ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                {settings.prepaidUpiId ? (
                  <p>
                    <span className="font-medium text-foreground">UPI ID (from API):</span>{" "}
                    {settings.prepaidUpiId}
                  </p>
                ) : null}
                {settings.prepaidUpiName ? (
                  <p className="mt-1">
                    <span className="font-medium text-foreground">Receiver (from API):</span>{" "}
                    {settings.prepaidUpiName}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
              <Label htmlFor={upiQrFileInputId}>Upload UPI QR image (recommended)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id={upiQrFileInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setQrFile(file);
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => uploadQrMutation.mutate()}
                  disabled={!qrFile || uploadQrMutation.isPending}
                >
                  {uploadQrMutation.isPending ? "Uploading…" : "Upload QR"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setUpiQrUrl("");
                    updateMutation.mutate({ prepaidUpiQrUrl: "" });
                  }}
                  disabled={updateMutation.isPending}
                >
                  Clear QR
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Allowed: JPEG/PNG/WebP/GIF, up to 5 MB. Upload uses <code className="rounded bg-muted px-1 py-0.5 text-xs">POST /api/uploads/image</code>.
              </p>
              {upiQrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={upiQrUrl}
                  alt="Current UPI QR"
                  className="h-40 w-40 rounded-md border border-border/60 object-contain bg-white"
                />
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              This app only PATCHes <code className="rounded bg-muted px-1 py-0.5 text-xs">prepaidUpiQrUrl</code>{" "}
              (upload/clear). If you need to edit UPI ID or display name in admin, add those fields to{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">PATCH /api/admin/settings</code> and we can wire
              inputs again.
            </p>
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
}
