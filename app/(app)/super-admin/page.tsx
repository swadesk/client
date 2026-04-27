"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronDown, ChevronRight, Shield, Users } from "lucide-react";
import { api, type ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { isSuperAdmin } from "@/lib/auth-routing";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryState } from "@/components/shared/query-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Restaurant } from "@/types/restaurant";
import type { SuperAdminMemberRow, SuperAdminUserListItem } from "@/types/auth";
import type { Waiter } from "@/types/waiter";

function mergeRestaurants(list: Restaurant[], pending: Restaurant[]): Restaurant[] {
  const byId = new Map<string, Restaurant>();
  for (const r of [...list, ...pending]) byId.set(r.id, r);
  return Array.from(byId.values());
}

function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && "status" in e;
}

function RestaurantStaffSection({ restaurantId }: { restaurantId: string }) {
  const membersQuery = useQuery({
    queryKey: ["super-admin", "members", restaurantId],
    queryFn: () => api.superAdmin.restaurantMembers(restaurantId),
  });

  const waitersQuery = useQuery({
    queryKey: ["super-admin", "waiters", restaurantId],
    queryFn: () => api.superAdmin.restaurantWaiters(restaurantId),
  });

  const members = membersQuery.data ?? [];
  const waiters = waitersQuery.data ?? [];

  if (membersQuery.isLoading || waitersQuery.isLoading) {
    return <div className="rounded-xl bg-muted/30 p-3 text-sm text-muted-foreground">Loading staff…</div>;
  }

  if (membersQuery.isError || waitersQuery.isError) {
    return (
      <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
        Could not load staff for this restaurant.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border bg-card">
        <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Login Members ({members.length})
        </div>
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m: SuperAdminMemberRow) => (
                <TableRow key={m.userId}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-xs">{m.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-full">
                      {m.role}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Floor Waiters ({waiters.length})
        </div>
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {waiters.map((w: Waiter) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell>{w.role}</TableCell>
                  <TableCell>{w.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);
  const [openRestaurantId, setOpenRestaurantId] = React.useState<string | null>(null);
  const [usersOffset, setUsersOffset] = React.useState(0);
  const [usersLimit] = React.useState(25);
  const [usersRole, setUsersRole] = React.useState<"ALL" | "SUPER_ADMIN" | "STAFF">("ALL");

  React.useEffect(() => {
    if (user && !superAdmin) router.replace("/dashboard");
  }, [user, superAdmin, router]);

  const restaurantsQuery = useQuery({
    queryKey: ["super-admin", "restaurants-overview"],
    queryFn: async () => {
      const [list, pending] = await Promise.all([
        api.restaurants.list(),
        api.superAdmin.pendingRestaurants(),
      ]);
      return mergeRestaurants(list, pending);
    },
    enabled: superAdmin,
  });

  const usersQuery = useQuery({
    queryKey: ["super-admin", "users", usersOffset, usersLimit, usersRole],
    queryFn: () =>
      api.superAdmin.users({
        limit: usersLimit,
        offset: usersOffset,
        globalRole: usersRole === "ALL" ? undefined : usersRole,
      }),
    enabled: superAdmin,
    retry: false,
  });

  if (user && !superAdmin) {
    return (
      <EmptyState
        title="Only super admins can view this page"
        description="You are being redirected to the dashboard."
      />
    );
  }

  const restaurants = restaurantsQuery.data ?? [];
  const usersPayload = usersQuery.data;
  const allUsers = usersPayload?.users ?? [];
  const usersError = usersQuery.error;
  const usersEndpointMissing = usersQuery.isError && isApiError(usersError) && usersError.status === 404;
  const activeCount = restaurants.filter((r) => r.approvalStatus === "Active").length;
  const pendingCount = restaurants.filter((r) => r.approvalStatus === "PendingApproval").length;
  const rejectedCount = restaurants.filter((r) => r.approvalStatus === "Rejected").length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Super Admin"
        description="Platform-wide operational visibility for restaurants, approvals, and permissions."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Building2 className="size-4" />
            Restaurants
          </div>
          <div className="mt-2 text-2xl font-semibold">{restaurants.length}</div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Shield className="size-4" />
            Pending
          </div>
          <div className="mt-2 text-2xl font-semibold">{pendingCount}</div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Users className="size-4" />
            Active / Rejected
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {activeCount} / {rejectedCount}
          </div>
        </div>
      </div>

      <QueryState
        isLoading={restaurantsQuery.isLoading}
        isError={restaurantsQuery.isError}
        error={restaurantsQuery.error}
        onRetry={() => void restaurantsQuery.refetch()}
        empty={!restaurantsQuery.isLoading && !restaurantsQuery.isError && restaurants.length === 0}
        errorFallbackMessage="Failed to load restaurants overview."
        loadingSkeleton={<div className="h-56 animate-pulse rounded-2xl bg-muted/40" />}
        emptyState={
          <EmptyState
            title="No restaurants available"
            description="No restaurants are visible for this super admin account."
          />
        }
      >
        <div className="overflow-hidden rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="w-[120px] text-right">Staff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restaurants.map((r) => (
                <React.Fragment key={r.id}>
                  <TableRow>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="font-mono text-xs">{r.gstin ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "rounded-full",
                          r.approvalStatus === "PendingApproval" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                          r.approvalStatus === "Active" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                          r.approvalStatus === "Rejected" && "bg-red-500/15 text-red-700 dark:text-red-300",
                        )}
                      >
                        {r.approvalStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.address ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => setOpenRestaurantId((prev) => (prev === r.id ? null : r.id))}
                      >
                        {openRestaurantId === r.id ? (
                          <>
                            <ChevronDown className="mr-1 size-4" />
                            Hide
                          </>
                        ) : (
                          <>
                            <ChevronRight className="mr-1 size-4" />
                            View
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {openRestaurantId === r.id ? (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/20 p-3">
                        {r.roomSections?.trim() ? (
                          <div className="mb-4 rounded-xl border bg-background px-4 py-3 text-sm">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Room sections (onboarding)
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-foreground/90">{r.roomSections}</p>
                          </div>
                        ) : (
                          <p className="mb-4 text-sm text-muted-foreground">No room sections recorded for this venue.</p>
                        )}
                        <RestaurantStaffSection restaurantId={r.id} />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </QueryState>

      <div className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">All Platform Users</h3>
            <p className="text-sm text-muted-foreground">
              Non-sensitive account data only (id, email, role, memberships).
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Select
              value={usersRole}
              onValueChange={(v) => {
                setUsersRole(v as "ALL" | "SUPER_ADMIN" | "STAFF");
                setUsersOffset(0);
              }}
            >
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All roles</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super admins</SelectItem>
                <SelectItem value="STAFF">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {usersEndpointMissing ? (
          <div className="rounded-xl border border-amber-300/40 bg-amber-50/70 p-4 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-200">
            <div className="font-semibold">`GET /api/super-admin/users` is not available on this backend.</div>
            <div className="mt-1 text-amber-800/90 dark:text-amber-300/90">
              Add the endpoint from integration2 spec to enable the full platform users table.
            </div>
          </div>
        ) : (
          <QueryState
          isLoading={usersQuery.isLoading}
          isError={usersQuery.isError}
          error={usersQuery.error}
          onRetry={() => void usersQuery.refetch()}
          empty={!usersQuery.isLoading && !usersQuery.isError && allUsers.length === 0}
          errorFallbackMessage="Failed to load platform users."
          loadingSkeleton={<div className="h-56 animate-pulse rounded-2xl bg-muted/30" />}
          emptyState={
            <EmptyState
              title="No users found"
              description="Try another role filter or check backend data."
            />
          }
        >
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Global Role</TableHead>
                  <TableHead>Memberships</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers.map((u: SuperAdminUserListItem) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-xs">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-full">
                        {u.globalRole}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {u.memberships.length === 0 ? (
                        <span className="text-muted-foreground">None</span>
                      ) : (
                        <div className="space-y-1">
                          {u.memberships.slice(0, 2).map((m) => (
                            <div key={`${u.id}-${m.restaurantId}`} className="truncate">
                              {m.restaurantName} · {m.role}
                            </div>
                          ))}
                          {u.memberships.length > 2 ? (
                            <div className="text-muted-foreground">+{u.memberships.length - 2} more</div>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.updatedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {usersPayload ? (
            <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
              <div>
                Showing {usersPayload.offset + 1}-{Math.min(usersPayload.offset + usersPayload.limit, usersPayload.total)} of{" "}
                {usersPayload.total}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={usersPayload.offset <= 0}
                  onClick={() => setUsersOffset((prev) => Math.max(0, prev - usersPayload.limit))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={usersPayload.offset + usersPayload.limit >= usersPayload.total}
                  onClick={() => setUsersOffset((prev) => prev + usersPayload.limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
          </QueryState>
        )}
      </div>
    </div>
  );
}
