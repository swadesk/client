"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { api, type ApiError } from "@/lib/api";
import { invalidateStaffTableQueries, qk } from "@/lib/query-keys";
import { normalizeTablesResponse } from "@/lib/tables-normalize";
import { useActiveRestaurant, useRestaurantStore } from "@/store/restaurant-store";
import { useAuthStore } from "@/store/auth-store";
import { ImageAttachmentField } from "@/components/shared/image-attachment-field";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryState } from "@/components/shared/query-state";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { canAccessRouteForUser } from "@/components/layout/nav-items";
import { getPostAuthRedirectPath } from "@/lib/auth-routing";
import { resolveStaffAvatarUrl } from "@/lib/staff-photo-url";
import { normalizeWaiterFromApi } from "@/lib/waiter-normalize";
import type { AdminUpdateWaiterStatusRequest } from "@/types/api";
import type { RestaurantMemberRow, StaffRoleApi, StaffRoleBody } from "@/types/auth";
import type { Waiter, WaiterRole, WaiterStatus } from "@/types/waiter";

const MEMBER_INVITE_ROLES: Exclude<StaffRoleBody, "ADMIN">[] = ["WAITER", "MANAGER", "KITCHEN"];

const ROLE_OPTIONS: WaiterRole[] = ["Lead", "Captain", "Server"];
const STATUS_OPTIONS: WaiterStatus[] = ["Active", "Break", "Offline"];

/** createMember rejects invalid photoUrl — only pass https URLs from production/CDN */
function httpsMemberPhotoUrl(url: string | null | undefined): string | undefined {
  const t = url?.trim();
  if (!t?.startsWith("https://")) return undefined;
  return t;
}

function isDuplicateMemberError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const message =
    "message" in err && typeof (err as { message?: unknown }).message === "string"
      ? (err as { message: string }).message.toLowerCase()
      : "";
  const code =
    "errorCode" in err && typeof (err as { errorCode?: unknown }).errorCode === "string"
      ? (err as { errorCode: string }).errorCode.toLowerCase()
      : "";
  return (
    message.includes("already exists") ||
    message.includes("already registered") ||
    message.includes("duplicate") ||
    (message.includes("email") && message.includes("exists")) ||
    (message.includes("email") && message.includes("registered")) ||
    code.includes("duplicate") ||
    code.includes("already_exists")
  );
}

function normalizeName(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * If `createWaiter` + `createMember` both create a floor row (or the user saves twice), the API can
 * return multiple waiters with the same display name but only one venue member with that name.
 * Collapse those to a single visible row (prefer more table assignments).
 */
function dedupeWaitersOnePerNameWhenSingleMember(
  waiters: Waiter[],
  members: RestaurantMemberRow[],
): Waiter[] {
  const memberCountByName = new Map<string, number>();
  for (const m of members) {
    const k = normalizeName(m.name);
    memberCountByName.set(k, (memberCountByName.get(k) ?? 0) + 1);
  }
  const byName = new Map<string, Waiter[]>();
  for (const w of waiters) {
    const k = normalizeName(w.name);
    const arr = byName.get(k) ?? [];
    arr.push(w);
    byName.set(k, arr);
  }
  const picked: Waiter[] = [];
  for (const [, group] of byName) {
    if (group.length === 1) {
      picked.push(group[0]!);
      continue;
    }
    const nameKey = normalizeName(group[0]!.name);
    if ((memberCountByName.get(nameKey) ?? 0) !== 1) {
      picked.push(...group);
      continue;
    }
    const sorted = [...group].sort((a, b) => {
      const ta = a.assignedTableIds?.length ?? 0;
      const tb = b.assignedTableIds?.length ?? 0;
      if (tb !== ta) return tb - ta;
      return b.id.localeCompare(a.id);
    });
    picked.push(sorted[0]!);
  }
  const order = new Map(waiters.map((w, i) => [w.id, i]));
  picked.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return picked;
}

/** Match floor waiter row to a venue member when names align (and role when possible). */
function findLinkedMemberForWaiter(
  waiter: Waiter,
  members: RestaurantMemberRow[],
  appRole: StaffRoleApi | null | undefined,
): RestaurantMemberRow | null {
  const key = normalizeName(waiter.name);
  const role = appRole ?? "Waiter";
  const byNameAndRole = members.filter(
    (m) => normalizeName(m.name) === key && m.role === role,
  );
  if (byNameAndRole.length === 1) return byNameAndRole[0]!;
  const byName = members.filter((m) => normalizeName(m.name) === key);
  if (byName.length === 1) return byName[0]!;
  return null;
}

function deleteStaffButtonLabel(appRole: StaffRoleApi | null | undefined): string {
  switch (appRole) {
    case "Kitchen":
      return "Delete kitchen staff";
    case "Manager":
      return "Delete manager";
    default:
      return "Delete waiter";
  }
}

function deleteStaffDialogTitle(appRole: StaffRoleApi | null | undefined): string {
  switch (appRole) {
    case "Kitchen":
      return "Delete kitchen staff?";
    case "Manager":
      return "Delete manager?";
    default:
      return "Delete waiter?";
  }
}

function getStatusColors(status: WaiterStatus) {
  switch (status) {
    case "Active":
      return {
        bg: "bg-emerald-500/15 dark:bg-emerald-500/20",
        border: "border-emerald-400/40 dark:border-emerald-400/30",
        text: "text-emerald-700 dark:text-emerald-400",
        dot: "bg-emerald-500",
      };
    case "Break":
      return {
        bg: "bg-amber-500/15 dark:bg-amber-500/20",
        border: "border-amber-400/40 dark:border-amber-400/30",
        text: "text-amber-700 dark:text-amber-400",
        dot: "bg-amber-500",
      };
    default:
      return {
        bg: "bg-slate-400/10 dark:bg-slate-400/15",
        border: "border-slate-300/40 dark:border-slate-500/30",
        text: "text-slate-600 dark:text-slate-400",
        dot: "bg-slate-400",
      };
  }
}

function WaiterCard({
  waiter,
  memberPhotoUrl,
  tableIdToNumber,
  appRole,
  onStatusChange,
  onRequestDelete,
  deleteButtonLabel,
  isUpdating,
}: {
  waiter: Waiter;
  /** Venue member profile photo when the floor row has no `photoUrl`. */
  memberPhotoUrl?: string | null;
  tableIdToNumber: Map<string, number>;
  appRole?: string | null;
  onStatusChange: (waiterId: string, status: WaiterStatus) => void;
  onRequestDelete?: (waiter: Waiter) => void;
  deleteButtonLabel: string;
  isUpdating: boolean;
}) {
  const avatarSrc = resolveStaffAvatarUrl(waiter.photoUrl ?? memberPhotoUrl);
  const normalizedAppRole = (appRole ?? "Waiter").toLowerCase();
  const canHaveTables = normalizedAppRole === "waiter";
  const tableLabels =
    waiter.assignedTableIds.length > 0
      ? waiter.assignedTableIds
          .map((id) => {
            const n = tableIdToNumber.get(id);
            return n != null ? `T${n}` : null;
          })
          .filter(Boolean)
          .join(", ") || "—"
      : "—";
  const colors = getStatusColors(waiter.status);
  return (
    <div
      className={cn(
        "group relative min-w-0 overflow-hidden rounded-2xl border bg-white transition-all duration-200",
        "hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)]",
        "dark:bg-white/[0.02]",
        colors.border,
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1 shrink-0",
          waiter.status === "Active" && "bg-emerald-500",
          waiter.status === "Break" && "bg-amber-500",
          waiter.status === "Offline" && "bg-slate-400",
        )}
      />
      <div className="flex min-w-0 gap-3 p-4 pl-5 sm:items-center sm:p-5 sm:pl-6">
        <Avatar
          className={cn(
            "size-10 shrink-0 ring-2 transition-colors sm:size-9",
            waiter.status === "Active" && "ring-emerald-400/40 dark:ring-emerald-400/25",
            waiter.status === "Break" && "ring-amber-400/40 dark:ring-amber-400/25",
            waiter.status === "Offline" && "ring-slate-300/30 dark:ring-slate-500/30",
          )}
        >
          {avatarSrc ? (
            <AvatarImage src={avatarSrc} alt="" className="object-cover" />
          ) : null}
          <AvatarFallback
            className={cn(
              "text-xs font-semibold",
              waiter.status === "Active" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
              waiter.status === "Break" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
              waiter.status === "Offline" && "bg-slate-400/15 text-slate-600 dark:text-slate-400",
            )}
          >
            {waiter.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2 overflow-hidden">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <div className="truncate font-semibold tracking-tight text-foreground">
                {waiter.name}
              </div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                App role
              </div>
              <div className="text-sm font-medium text-foreground">{appRole ?? "Waiter"}</div>
              <div className="mt-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Floor role
              </div>
              <div className="text-sm font-medium text-foreground">{waiter.role}</div>
            </div>
            <Select
              value={waiter.status}
              onValueChange={(v) => onStatusChange(waiter.id, v as WaiterStatus)}
              disabled={isUpdating}
            >
              <SelectTrigger
                id={`status-${waiter.id}`}
                className={cn(
                  "h-8 w-[120px] shrink-0 font-medium text-xs sm:h-7",
                  colors.bg,
                  colors.border,
                  colors.text,
                  "border",
                )}
              >
                <span className={cn("mr-2 size-1.5 shrink-0 rounded-full", colors.dot)} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => {
                  const c = getStatusColors(s);
                  return (
                    <SelectItem key={s} value={s} className={cn("font-medium", c.text)}>
                      <span className={cn("mr-2 inline-block size-1.5 rounded-full", c.dot)} />
                      {s}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          {canHaveTables ? (
            <div className="flex min-w-0 items-center gap-1.5 rounded-lg bg-muted/20 px-3 py-2">
              <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Tables
              </span>
              <span className="min-w-0 truncate text-sm font-semibold tabular-nums text-foreground">
                {tableLabels}
              </span>
            </div>
          ) : null}
          {onRequestDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onRequestDelete(waiter)}
              disabled={isUpdating}
            >
              <Trash2 className="mr-2 size-4" />
              {deleteButtonLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "amber" | "blue" | "default";
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50/80 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/40"
      : tone === "amber"
        ? "bg-amber-50/80 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/50 dark:border-amber-800/40"
        : tone === "blue"
          ? "bg-blue-50/80 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/40"
          : "bg-white text-foreground dark:bg-white/[0.03] border-black/[0.04] dark:border-white/[0.06]";

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none",
        toneClass,
      )}
    >
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
    </div>
  );
}

export default function WaitersPage() {
  const router = useRouter();
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const activeRestaurant = useActiveRestaurant();
  const user = useAuthStore((s) => s.user);
  const canViewWaiters = canAccessRouteForUser(user, "/waiters");
  const qc = useQueryClient();
  const canUploadImage =
    user?.globalRole === "SuperAdmin" || user?.role === "Admin" || user?.role === "Manager";
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [loginRole, setLoginRole] = React.useState<Exclude<StaffRoleBody, "ADMIN">>("WAITER");
  const [role, setRole] = React.useState<WaiterRole>("Server");
  const [status, setStatus] = React.useState<WaiterStatus>("Active");
  const [assignedTables, setAssignedTables] = React.useState("2");
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [waiterToDelete, setWaiterToDelete] = React.useState<Waiter | null>(null);

  React.useEffect(() => {
    if (user && !canViewWaiters) router.replace(getPostAuthRedirectPath(user));
  }, [user, canViewWaiters, router]);

  const resetAddStaffForm = React.useCallback(() => {
    setName("");
    setEmail("");
    setLoginRole("WAITER");
    setPhotoFile(null);
    setRole("Server");
    setStatus("Active");
    setAssignedTables("2");
  }, []);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qk.adminWaiters(restaurantId ?? ""),
    queryFn: async () => {
      const rows = await api.admin.waiters(restaurantId!);
      return rows.map((w) => normalizeWaiterFromApi(w));
    },
    enabled: !!restaurantId,
  });

  const { data: tablesData } = useQuery({
    queryKey: qk.adminTables(restaurantId ?? ""),
    queryFn: async () => {
      const raw = await api.admin.tables(restaurantId!);
      return normalizeTablesResponse(raw);
    },
    enabled: !!restaurantId,
  });
  const { data: membersData } = useQuery({
    queryKey: ["restaurant.members", restaurantId],
    queryFn: () => api.restaurants.members(restaurantId!),
    enabled: !!restaurantId,
  });

  const waitersRaw = data ?? [];
  const tables = tablesData ?? [];
  const waiters = React.useMemo(() => {
    const byId = new Map<string, Waiter>();
    for (const w of waitersRaw) {
      if (!byId.has(w.id)) byId.set(w.id, w);
    }
    const uniqueById = [...byId.values()];
    return dedupeWaitersOnePerNameWhenSingleMember(uniqueById, membersData ?? []);
  }, [waitersRaw, membersData]);
  const memberEmailSet = React.useMemo(
    () => new Set((membersData ?? []).map((m) => m.email.trim().toLowerCase())),
    [membersData],
  );
  const tableIdToNumber = React.useMemo(
    () => new Map(tables.map((t) => [t.id, t.number])),
    [tables],
  );
  const appRoleByWaiterId = React.useMemo(() => {
    const groupedMembers = new Map<string, Array<import("@/types/auth").RestaurantMemberRow>>();
    for (const member of membersData ?? []) {
      const key = normalizeName(member.name);
      const arr = groupedMembers.get(key) ?? [];
      arr.push(member);
      groupedMembers.set(key, arr);
    }
    const map = new Map<string, StaffRoleApi>();
    for (const waiter of waiters) {
      const matches = groupedMembers.get(normalizeName(waiter.name)) ?? [];
      if (matches.length === 1) map.set(waiter.id, matches[0]!.role);
    }
    return map;
  }, [membersData, waiters]);

  const hierarchyCounts = React.useMemo(() => {
    const counts = { Manager: 0, Kitchen: 0, Waiter: 0 };
    for (const waiter of waiters) {
      const appRole = appRoleByWaiterId.get(waiter.id) ?? "Waiter";
      if (appRole === "Manager") counts.Manager += 1;
      else if (appRole === "Kitchen") counts.Kitchen += 1;
      else counts.Waiter += 1;
    }
    return counts;
  }, [appRoleByWaiterId, waiters]);

  const addStaffMutation = useMutation({
    retry: false,
    mutationFn: async () => {
      const rid = restaurantId!;
      const count = loginRole === "WAITER" ? Number(assignedTables) : 0;
      if (!name.trim()) throw new Error("Name is required");
      if (!Number.isFinite(count) || count < 0) throw new Error("Invalid assigned table count");

      const waiter = await api.admin.createWaiter({
        restaurantId: rid,
        name: name.trim(),
        role,
        status,
        assignedTables: count,
        photo: photoFile,
      });

      const emailTrim = email.trim();
      if (!emailTrim) {
        return { waiter, member: null };
      }

      const photoForMember = httpsMemberPhotoUrl(waiter.photoUrl);
      try {
        const member = await api.restaurants.createMember(rid, {
          email: emailTrim,
          name: name.trim(),
          role: loginRole,
          ...(photoForMember ? { photoUrl: photoForMember } : {}),
        });
        return { waiter, member };
      } catch (err) {
        if (isDuplicateMemberError(err)) {
          // Prevent orphan waiter record when invite/member creation fails on duplicate email.
          try {
            await api.admin.deleteWaiter(rid, waiter.id);
          } catch {
            // Ignore rollback failures; original error still shown.
          }
          throw new Error("A staff account with this email already exists in this restaurant.");
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      setOpen(false);
      resetAddStaffForm();
      if (restaurantId) {
        void qc.invalidateQueries({ queryKey: qk.adminWaiters(restaurantId) });
        void qc.invalidateQueries({ queryKey: ["restaurant.members", restaurantId] });
      }
      if (data.member) {
        if (data.member.emailSent) {
          toast.success(`Waiter added. Invite email sent to ${data.member.email}.`);
        } else {
          toast.success(`Waiter added. Account created for ${data.member.email}.`);
        }
        const tempPw = data.member.temporaryPassword;
        if (tempPw) {
          toast.info(`Temporary password for ${data.member.email}`, {
            description: tempPw,
            duration: 60_000,
            action: {
              label: "Copy password",
              onClick: () => void navigator.clipboard.writeText(tempPw),
            },
          });
        }
      } else {
        toast.success("Waiter added");
      }
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err && typeof (err as ApiError).message === "string"
          ? (err as ApiError).message
          : err instanceof Error
            ? err.message
            : "Failed to add staff";
      toast.error(msg);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (payload: AdminUpdateWaiterStatusRequest) =>
      api.admin.updateWaiterStatus(payload),
    onSuccess: () => {
      toast.success("Status updated");
      if (restaurantId) {
        void qc.invalidateQueries({ queryKey: qk.adminWaiters(restaurantId) });
      }
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteWaiterMutation = useMutation({
    mutationFn: async (waiter: Waiter) => {
      const rid = restaurantId!;
      const appRole = appRoleByWaiterId.get(waiter.id) ?? "Waiter";
      const linked = findLinkedMemberForWaiter(waiter, membersData ?? [], appRole);
      await api.admin.deleteWaiter(rid, waiter.id);
      let memberRemoved = false;
      let memberDeleteFailed = false;
      if (linked) {
        try {
          await api.restaurants.deleteMember(rid, linked.userId);
          memberRemoved = true;
        } catch (err) {
          const status = (err as ApiError)?.status;
          if (status !== 404) memberDeleteFailed = true;
          else memberRemoved = true;
        }
      }
      return { appRole, memberRemoved, memberDeleteFailed, hadLinkedMember: !!linked };
    },
    onSuccess: (result) => {
      const roleLabel =
        result.appRole === "Kitchen"
          ? "Kitchen staff"
          : result.appRole === "Manager"
            ? "Manager"
            : "Waiter";
      if (result.memberDeleteFailed) {
        toast.warning(`${roleLabel} removed from the floor`, {
          description:
            "The login account could not be removed from this venue. The same email may still be blocked until an admin deletes the membership or the API supports removing members.",
        });
      } else {
        toast.success(
          result.hadLinkedMember && result.memberRemoved
            ? `${roleLabel} and venue login removed`
            : `${roleLabel} deleted`,
        );
      }
      setWaiterToDelete(null);
      if (restaurantId) {
        void qc.invalidateQueries({ queryKey: qk.adminWaiters(restaurantId) });
        void qc.invalidateQueries({ queryKey: ["restaurant.members", restaurantId] });
        invalidateStaffTableQueries(qc, restaurantId);
      }
    },
    onError: () => toast.error("Failed to delete staff"),
  });

  function handleStatusChange(waiterId: string, newStatus: WaiterStatus) {
    if (!restaurantId) return;
    statusMutation.mutate({ restaurantId, waiterId, status: newStatus });
  }

  function submitAddStaff() {
    if (!restaurantId || addStaffMutation.isPending) return;
    const emailTrim = email.trim().toLowerCase();
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      toast.error("Enter a valid work email or leave it empty");
      return;
    }
    if (emailTrim && memberEmailSet.has(emailTrim)) {
      toast.error("This email already exists in staff records for this restaurant.");
      return;
    }
    addStaffMutation.mutate();
  }

  if (!restaurantId) {
    return (
      <div className="space-y-12">
        <PageHeader
          title="Staffs"
          description="Manage staff assignments and floor coverage."
        />
        <EmptyState
          title="Select a restaurant"
          description="Choose a restaurant in the header to manage its staff."
        />
      </div>
    );
  }
  if (user && !canViewWaiters) {
    return (
      <EmptyState
        title="Waiter assignment is restricted"
        description="You are being redirected to your allowed workspace."
      />
    );
  }

  const activeCount = waiters.filter((w) => w.status === "Active").length;
  const breakCount = waiters.filter((w) => w.status === "Break").length;
  const totalAssignedTables = waiters.reduce((sum, waiter) => {
    const role = (appRoleByWaiterId.get(waiter.id) ?? "Waiter").toLowerCase();
    return role === "waiter" ? sum + waiter.assignedTables : sum;
  }, 0);

  return (
    <div className="space-y-12">
      <PageHeader
        title="Staffs"
        description="Manage staff assignments and floor coverage."
        actions={
          <Button
            onClick={() => {
              resetAddStaffForm();
              setOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Add staff
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 md:grid-cols-3">
        <SummaryCard label="Active now" value={`${activeCount}`} tone="green" />
        <SummaryCard label="On break" value={`${breakCount}`} tone="amber" />
        <SummaryCard label="Assigned tables" value={`${totalAssignedTables}`} tone="blue" />
      </div>
      <div className="rounded-2xl border border-black/[0.04] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03]">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Staff hierarchy
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
            <div className="text-muted-foreground">Manager</div>
            <div className="font-semibold tabular-nums">{hierarchyCounts.Manager}</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
            <div className="text-muted-foreground">Kitchen</div>
            <div className="font-semibold tabular-nums">{hierarchyCounts.Kitchen}</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
            <div className="text-muted-foreground">Waiter</div>
            <div className="font-semibold tabular-nums">{hierarchyCounts.Waiter}</div>
          </div>
        </div>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        empty={!isLoading && !isError && waiters.length === 0}
        errorFallbackMessage="Failed to load waiters."
        loadingSkeleton={
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-36 rounded-2xl bg-muted/50" />
            ))}
          </div>
        }
        emptyState={
          <EmptyState
            title="No staff yet"
            description="Add your first staff member to manage staffing."
            primaryAction={{
              label: "Add staff",
              onClick: () => {
                resetAddStaffForm();
                setOpen(true);
              },
            }}
          />
        }
      >
        <div className="space-y-6">
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {waiters.map((waiter) => (
              <WaiterCard
                key={waiter.id}
                waiter={waiter}
                memberPhotoUrl={
                  findLinkedMemberForWaiter(
                    waiter,
                    membersData ?? [],
                    appRoleByWaiterId.get(waiter.id) ?? "Waiter",
                  )?.photoUrl ?? null
                }
                tableIdToNumber={tableIdToNumber}
                appRole={appRoleByWaiterId.get(waiter.id) ?? null}
                onStatusChange={handleStatusChange}
                onRequestDelete={(w) => setWaiterToDelete(w)}
                deleteButtonLabel={deleteStaffButtonLabel(
                  appRoleByWaiterId.get(waiter.id) ?? null,
                )}
                isUpdating={statusMutation.isPending}
              />
            ))}
          </div>

          <div className="rounded-2xl border border-black/[0.04] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted/50">
                <Users className="size-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Floor coverage</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use the cards above for each person&apos;s status, floor role, and table list. This
                  block is only a shortcut to table assignment so you don&apos;t see the same staff
                  twice on the page.
                </p>
              </div>
            </div>
            <Link
              href="/tables"
              className="mt-6 flex items-center justify-between rounded-xl bg-muted/30 p-4 text-sm font-medium text-primary transition-colors hover:bg-muted/50"
            >
              Manage table assignments
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </QueryState>

      <Dialog open={!!waiterToDelete} onOpenChange={(o) => !o && setWaiterToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {deleteStaffDialogTitle(
                waiterToDelete ? appRoleByWaiterId.get(waiterToDelete.id) ?? null : null,
              )}
            </DialogTitle>
            <DialogDescription>
              {waiterToDelete?.name} will be removed from the floor
              {waiterToDelete &&
              (appRoleByWaiterId.get(waiterToDelete.id) ?? "Waiter") === "Waiter"
                ? "; assigned tables will be unassigned"
                : ""}
              . When the venue login can be resolved, their membership for this restaurant is removed
              so the same email can be invited again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="secondary" onClick={() => setWaiterToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteWaiterMutation.isPending}
              onClick={() => {
                if (waiterToDelete) deleteWaiterMutation.mutate(waiterToDelete);
              }}
            >
              {deleteWaiterMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) resetAddStaffForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add staff</DialogTitle>
            <DialogDescription>
              Creates a floor waiter for{" "}
              <span className="font-medium text-foreground">{activeRestaurant?.name ?? "this venue"}</span>
              . Add a work email to also call{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">POST …/members</code> with JSON (no{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">photoUrl</code> unless it is a real{" "}
              <span className="font-medium">https</span> URL — local upload URLs are omitted for the invite).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="waiter-name">Name</Label>
              <Input
                id="waiter-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arjun Mehta"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="staff-email">Work email (optional)</Label>
              <Input
                id="staff-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@restaurant.com"
              />
              <p className="text-xs text-muted-foreground">
                When set, JSON body to <code className="rounded bg-muted px-1 py-0.5 text-[11px]">POST …/members</code>{" "}
                (same <code className="rounded bg-muted px-1 py-0.5 text-[11px]">restaurantId</code> in the path).
              </p>
            </div>
            <div className="grid gap-2">
              <Label>App login role</Label>
              <p className="text-xs text-muted-foreground">
                Used only when work email is provided. Cannot be Admin.
              </p>
              <Select
                value={loginRole}
                onValueChange={(v) => setLoginRole(v as Exclude<StaffRoleBody, "ADMIN">)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_INVITE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ImageAttachmentField
              label="Photo"
              description="Optional. Shown on floor cards. JPEG, PNG, WebP, or GIF — max 5 MB. Sent with save (multipart field photo)."
              existingUrl=""
              imageFile={photoFile}
              onFileChange={setPhotoFile}
              disabled={!canUploadImage}
            />
            <div className="grid gap-2">
              <Label htmlFor="waiter-role">Floor role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as WaiterRole)}>
                <SelectTrigger id="waiter-role" className="h-9 w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="waiter-status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as WaiterStatus)}>
                <SelectTrigger id="waiter-status" className="h-9 w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="waiter-tables">Assigned tables</Label>
              <Input
                id="waiter-tables"
                inputMode="numeric"
                value={assignedTables}
                onChange={(e) => setAssignedTables(e.target.value)}
                placeholder="e.g. 3"
                disabled={loginRole !== "WAITER"}
              />
              {loginRole !== "WAITER" ? (
                <p className="text-xs text-muted-foreground">
                  Table assignment is allowed only for staff with app role Waiter.
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitAddStaff}
                disabled={addStaffMutation.isPending || !name.trim()}
              >
                {addStaffMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
