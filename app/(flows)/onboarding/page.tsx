"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Users } from "lucide-react";
import { toast } from "sonner";
import { api, type ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { FlowShell } from "@/components/layout/flow-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { StaffRoleBody } from "@/types/auth";

function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && "message" in e;
}

export default function OnboardingPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [busy, setBusy] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"create" | "join">("create");

  const [venueName, setVenueName] = React.useState("");
  const [legalName, setLegalName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [gstin, setGstin] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const logoPreviewUrl = React.useMemo(
    () => (logoFile ? URL.createObjectURL(logoFile) : null),
    [logoFile],
  );
  React.useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);
  const [roomSections, setRoomSections] = React.useState("");
  const [description, setDescription] = React.useState("");

  const [joinRestaurantId, setJoinRestaurantId] = React.useState("");
  const [joinCode, setJoinCode] = React.useState("");
  const [joinRole, setJoinRole] = React.useState<StaffRoleBody>("WAITER");

  async function submitBootstrap(e: React.FormEvent) {
    e.preventDefault();
    if (!venueName.trim()) {
      toast.error("Enter a display name for your venue");
      return;
    }
    if (!roomSections.trim()) {
      toast.error("Describe your room or dining sections for super-admin review");
      return;
    }
    setBusy(true);
    try {
      const { token, user } = await api.auth.bootstrapRestaurant({
        name: venueName.trim(),
        legalName: legalName.trim() || undefined,
        address: address.trim() || undefined,
        gstin: gstin.trim() || undefined,
        phone: phone.trim() || undefined,
        roomSections: roomSections.trim(),
        description: description.trim() || undefined,
        logo: logoFile,
      });
      setSession(token, user);
      toast.success("Venue submitted for review");
      router.replace("/pending-approval");
    } catch (err) {
      toast.error(isApiError(err) ? err.message : "Could not submit venue");
    } finally {
      setBusy(false);
    }
  }

  async function submitJoin(e: React.FormEvent) {
    e.preventDefault();
    const rid = joinRestaurantId.trim();
    if (!rid) {
      toast.error("Enter the venue ID");
      return;
    }
    setBusy(true);
    try {
      const { token, user } = await api.auth.joinRestaurant({
        restaurantId: rid,
        joinCode: joinCode.trim() || undefined,
        role: joinRole,
      });
      setSession(token, user);
      toast.success("Joined venue");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(isApiError(err) ? err.message : "Could not join venue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <FlowShell
      title="Set up your workspace"
      subtitle="Create a new venue for approval or join an existing team with an invite."
    >
      <div className="mx-auto max-w-5xl">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "create" | "join")}
          className="flex w-full flex-col"
        >
          <div className="w-full lg:max-w-[26rem]">
            <TabsList className="grid h-12 w-full grid-cols-2 rounded-2xl bg-white/[0.08] p-1 ring-1 ring-white/15 backdrop-blur-sm">
            <TabsTrigger
              value="create"
              className="h-full w-full gap-2 rounded-xl px-3 text-center text-sm font-semibold leading-none text-white/70 transition-colors data-active:bg-white data-active:text-[hsl(222_47%_11%)] data-active:shadow-lg"
            >
              <Building2 className="size-4" />
              New venue
            </TabsTrigger>
            <TabsTrigger
              value="join"
              className="h-full w-full gap-2 rounded-xl px-3 text-center text-sm font-semibold leading-none text-white/70 transition-colors data-active:bg-white data-active:text-[hsl(222_47%_11%)] data-active:shadow-lg"
            >
              <Users className="size-4" />
              Join team
            </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="create" className="mt-6 outline-none">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-300/90">
                  New Venue
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Launch with a premium setup</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/65">
                  Share your brand identity and operations details once. Your application goes straight to super-admin
                  review.
                </p>
                <div className="mt-8 space-y-3 text-sm text-white/70">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">Fast onboarding review</div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">Supports GSTIN, logo upload, and legal details</div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">Room / dining sections captured for floor setup</div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">Role-based access once approved</div>
                </div>
              </div>

              <div className={cn("rounded-3xl border border-white/[0.1] bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur-md", "sm:p-8")}>
                <form className="space-y-5" onSubmit={submitBootstrap}>
                  <div className="space-y-2">
                    <Label htmlFor="vname" className="text-white/90">
                      Venue display name <span className="text-orange-300">*</span>
                    </Label>
                    <Input
                      id="vname"
                      className="h-11 rounded-xl border-white/15 bg-white/10 text-white placeholder:text-white/45 focus-visible:ring-orange-400/30"
                      placeholder="e.g. Tandoor House Indiranagar"
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legal" className="text-white/85">
                      Legal name
                    </Label>
                    <Input
                      id="legal"
                      className="h-11 rounded-xl border-white/15 bg-white/10 text-white placeholder:text-white/45"
                      placeholder="Registered business name"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="gst" className="text-white/85">
                        GSTIN
                      </Label>
                      <Input
                        id="gst"
                        className="h-11 rounded-xl border-white/15 bg-white/10 font-mono text-sm text-white placeholder:text-white/45"
                        placeholder="22AAAAA0000A1Z5"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ph" className="text-white/85">
                        Phone
                      </Label>
                      <Input
                        id="ph"
                        type="tel"
                        className="h-11 rounded-xl border-white/15 bg-white/10 text-white placeholder:text-white/45"
                        placeholder="+91 …"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addr" className="text-white/85">
                      Address
                    </Label>
                    <Input
                      id="addr"
                      className="h-11 rounded-xl border-white/15 bg-white/10 text-white placeholder:text-white/45"
                      placeholder="Street, city, state"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logo-file" className="text-white/85">
                      Logo <span className="text-white/50">(optional)</span>
                    </Label>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <Input
                        id="logo-file"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="h-11 cursor-pointer rounded-xl border-white/15 bg-white/10 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-1.5 file:text-sm file:text-white"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          setLogoFile(f ?? null);
                        }}
                      />
                      {logoPreviewUrl ? (
                        <div className="flex shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={logoPreviewUrl}
                            alt=""
                            className="h-16 max-w-[140px] object-contain"
                          />
                        </div>
                      ) : null}
                    </div>
                    <p className="text-xs text-white/50">JPEG, PNG, WebP, or GIF. Sent as multipart field <code className="rounded bg-white/10 px-1">logo</code>.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rooms" className="text-white/90">
                      Room / dining sections <span className="text-orange-300">*</span>
                    </Label>
                    <Textarea
                      id="rooms"
                      rows={3}
                      required
                      className="resize-none rounded-xl border-white/15 bg-white/10 text-white placeholder:text-white/45 focus-visible:ring-orange-400/30"
                      placeholder="e.g. Main hall — 12 tables, Patio — 6 tables, Private room — 1"
                      value={roomSections}
                      onChange={(e) => setRoomSections(e.target.value)}
                    />
                    <p className="text-xs text-white/50">
                      Super-admin reviews this with your application before the venue is activated. It appears on your dashboard after approval.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc" className="text-white/85">
                      Notes for reviewer
                    </Label>
                    <Textarea
                      id="desc"
                      rows={4}
                      className="resize-none rounded-xl border-white/15 bg-white/10 text-white placeholder:text-white/45 focus-visible:ring-orange-400/30"
                      placeholder="Cuisine, seating, or anything that helps approve your venue."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={busy}
                    className="h-12 w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-base font-semibold text-white shadow-lg shadow-orange-950/40 hover:from-orange-600 hover:to-orange-700"
                  >
                    {busy ? "Submitting…" : "Submit for approval"}
                  </Button>
                </form>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="join" className="mt-6 outline-none">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-300/90">
                  Join Existing Team
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Get onboarded in minutes</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/65">
                  Enter your venue ID and join code from your manager. You can start working as waiter, manager, or kitchen staff.
                </p>
                <div className="mt-8 space-y-3 text-sm text-white/70">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">Secure venue-scoped access</div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">Role-based workspace after login</div>
                </div>
              </div>

              <div className={cn("rounded-3xl border border-white/[0.1] bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur-md", "sm:p-8")}>
                <form className="space-y-5" onSubmit={submitJoin}>
                  <div className="space-y-2">
                    <Label htmlFor="rid" className="text-white/90">
                      Venue ID <span className="text-orange-300">*</span>
                    </Label>
                    <Input
                      id="rid"
                      className="h-11 rounded-xl border-white/15 bg-white/10 font-mono text-sm text-white placeholder:text-white/45"
                      placeholder="UUID from your admin"
                      value={joinRestaurantId}
                      onChange={(e) => setJoinRestaurantId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jcode" className="text-white/85">
                      Join code
                    </Label>
                    <Input
                      id="jcode"
                      className="h-11 rounded-xl border-white/15 bg-white/10 text-white placeholder:text-white/45"
                      placeholder="If your venue requires it"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/85">Role</Label>
                    <Select value={joinRole} onValueChange={(v) => setJoinRole(v as StaffRoleBody)}>
                      <SelectTrigger className="h-11 rounded-xl border-white/15 bg-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WAITER">Waiter</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="KITCHEN">Kitchen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    disabled={busy}
                    className="h-12 w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-base font-semibold text-white shadow-lg shadow-orange-950/40 hover:from-orange-600 hover:to-orange-700"
                  >
                    {busy ? "Joining…" : "Join venue"}
                  </Button>
                </form>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </FlowShell>
  );
}
