"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, Sparkles, Utensils } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useActiveRestaurant, useRestaurantStore } from "@/store/restaurant-store";
import { getPostAuthRedirectPath } from "@/lib/auth-routing";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageAttachmentField } from "@/components/shared/image-attachment-field";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const restaurants = useRestaurantStore((s) => s.restaurants);
  const setRestaurants = useRestaurantStore((s) => s.setRestaurants);
  const activeRestaurant = useActiveRestaurant();
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const [name, setName] = React.useState(user?.name ?? "");
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [restaurantLogoFile, setRestaurantLogoFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  const [photoPreviewUrl, setPhotoPreviewUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [photoFile]);

  const avatarSrc = (photoPreviewUrl || user?.photoUrl?.trim() || "").trim();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("Name is required.");
      let photoUrl: string | null | undefined = undefined;
      if (photoFile) {
        if (!restaurantId) throw new Error("Select a restaurant to upload profile photo.");
        const uploaded = await api.uploads.image(photoFile, restaurantId);
        photoUrl = uploaded.url;
      }
      return api.auth.updateMe({
        name: trimmedName,
        ...(photoUrl !== undefined ? { photoUrl } : {}),
      });
    },
    onSuccess: (res) => {
      setUser(res.user);
      setPhotoFile(null);
      toast.success("Profile updated");
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Failed to update profile";
      toast.error(message);
    },
  });

  const saveRestaurantLogoMutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error("Select a restaurant first.");
      if (!restaurantLogoFile) throw new Error("Choose a logo file.");
      const uploaded = await api.uploads.image(restaurantLogoFile, restaurantId);
      const updated = await api.restaurants.update(restaurantId, { logoUrl: uploaded.url });
      return updated;
    },
    onSuccess: (updated) => {
      const next = restaurants.map((r) =>
        r.id === updated.id ? { id: r.id, name: r.name, logoUrl: updated.logoUrl ?? undefined } : r,
      );
      setRestaurants(next);
      setRestaurantLogoFile(null);
      toast.success("Venue logo updated");
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Failed to update venue logo";
      toast.error(message);
    },
  });

  if (!user) {
    return (
      <div className="space-y-12">
        <PageHeader title="Profile" description="Your staff account and venue branding." />
        <EmptyState
          title="Profile unavailable"
          description="Sign in again to load your profile details."
        />
      </div>
    );
  }

  const roleLabel = user.globalRole === "SuperAdmin" ? "SuperAdmin" : user.role ?? "Staff";
  const canEditRestaurantLogo = user.globalRole === "SuperAdmin" || user.role === "Admin";

  return (
    <div className="mx-auto max-w-3xl space-y-10 pb-8">
      <PageHeader
        title="Profile"
        description="Manage how you appear in the app and update venue branding where allowed."
      />

      {/* Identity strip */}
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-black/[0.06] bg-gradient-to-br from-primary/[0.07] via-background to-background",
          "p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.08]",
        )}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          <Avatar className="size-20 shrink-0 ring-4 ring-background shadow-md sm:size-24">
            {avatarSrc ? (
              <AvatarImage src={avatarSrc} alt="" className="object-cover" />
            ) : null}
            <AvatarFallback className="text-lg font-semibold">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {user.name}
              </h2>
              <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">
                {roleLabel}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5 shrink-0 opacity-70" />
                {user.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Utensils className="size-3.5 shrink-0 opacity-70" />
                {activeRestaurant?.name ?? "No restaurant selected"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={() => router.push("/orders")}>
                Open orders
              </Button>
              {user.role === "Waiter" || user.role === "Manager" ? (
                <Button size="sm" variant="outline" onClick={() => router.push("/shift")}>
                  Shift
                </Button>
              ) : null}
              <Button size="sm" variant="secondary" onClick={() => router.push(getPostAuthRedirectPath(user))}>
                Back to workspace
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl border-black/[0.06] shadow-sm dark:border-white/[0.08]">
        <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <CardTitle className="text-lg">Personal details</CardTitle>
          </div>
          <CardDescription>Name and photo shown in the header and across the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-2">
            <Label htmlFor="profile-name">Display name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="max-w-md"
            />
          </div>
          <ImageAttachmentField
            label="Profile photo"
            description="JPEG, PNG, WebP, or GIF — max 5 MB. Used in the top bar after you save."
            existingUrl={user.photoUrl ?? ""}
            imageFile={photoFile}
            onFileChange={setPhotoFile}
          />
          <div className="flex justify-end border-t border-border/60 pt-4">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !name.trim()}>
              {saveMutation.isPending ? "Saving…" : "Save personal details"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {canEditRestaurantLogo ? (
        <Card className="overflow-hidden rounded-2xl border-black/[0.06] shadow-sm dark:border-white/[0.08]">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <CardTitle className="text-lg">Venue branding</CardTitle>
            </div>
            <CardDescription>
              Logo for <span className="font-medium text-foreground">{activeRestaurant?.name ?? "this venue"}</span> — header picker and QR menu when the API exposes it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Section title is "Venue branding"; field label is "Brand logo" to avoid repeating "Restaurant logo" */}
            <ImageAttachmentField
              label="Brand logo"
              description="Square or wide logos work best. Same file rules as profile photo."
              existingUrl={activeRestaurant?.logoUrl ?? ""}
              imageFile={restaurantLogoFile}
              onFileChange={setRestaurantLogoFile}
            />
            <div className="flex justify-end border-t border-border/60 pt-4">
              <Button
                onClick={() => saveRestaurantLogoMutation.mutate()}
                disabled={saveRestaurantLogoMutation.isPending || !restaurantLogoFile || !restaurantId}
              >
                {saveRestaurantLogoMutation.isPending ? "Saving…" : "Save venue logo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
