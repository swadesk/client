"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FloorUnitKind, Table, TableStatus } from "@/types/table";
import type { AdminAssignTableRequest, AdminCreateTableRequest } from "@/types/api";
import { TableCard } from "@/components/features/tables/table-card";
import { TableQrDialog } from "@/components/features/tables/table-qr-dialog";
import { BillingDrawer } from "@/components/features/billing/billing-drawer";
import { InvoiceView } from "@/components/features/billing/invoice-view";
import { api, type ApiError } from "@/lib/api";
import { invalidateStaffTableQueries, qk } from "@/lib/query-keys";
import { useRestaurantStore } from "@/store/restaurant-store";
import { useRealtimeOrders } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryState, TableGridSkeleton } from "@/components/shared/query-state";
import type { RestaurantMemberRow } from "@/types/auth";
import { useAuthStore } from "@/store/auth-store";
import { canCollectTablePayments, getPostAuthRedirectPath } from "@/lib/auth-routing";
import { tableStatusForStaffUi } from "@/lib/table-status";
import { fetchActiveFloorOrders } from "@/lib/floor-orders";
import { isOrderCompletedStatus } from "@/lib/order-status";
import { canAccessRouteForUser } from "@/components/layout/nav-items";
import { normalizeTablesResponse } from "@/lib/tables-normalize";
import { resolveFloorWaiterProfileId } from "@/lib/floor-waiter-profile";
import {
  FLOOR_UNITS,
  floorUnitDisplayName,
  floorUnitNoun,
  floorUnitTitle,
} from "@/lib/floor-units";

export function FloorUnitsWorkspace({
  kind,
  routeHref,
}: {
  kind: FloorUnitKind;
  routeHref: "/tables" | "/rooms";
}) {
  const router = useRouter();
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const user = useAuthStore((s) => s.user);
  const canView = canAccessRouteForUser(user, routeHref);
  const canManageLayout = user?.role === "Admin" || user?.role === "Manager";
  const waiterMode = user?.globalRole !== "SuperAdmin" && user?.role === "Waiter";
  const mayCollectPayment = canCollectTablePayments(user);
  const tablesLockedHere = FLOOR_UNITS.tablesLocked && kind === "TABLE";
  useRealtimeOrders(restaurantId);
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [billingUnit, setBillingUnit] = React.useState<Table | null>(null);
  const [unitToDelete, setUnitToDelete] = React.useState<Table | null>(null);
  const [qrUnit, setQrUnit] = React.useState<Table | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string | null>(null);

  const [number, setNumber] = React.useState("");
  const [seats, setSeats] = React.useState(kind === "ROOM" ? "2" : "4");
  const [label, setLabel] = React.useState("");
  const [status, setStatus] = React.useState<TableStatus>("Available");

  const title = floorUnitTitle(kind, true);
  const singular = floorUnitTitle(kind);
  const noun = floorUnitNoun(kind);
  const nouns = floorUnitNoun(kind, true);

  React.useEffect(() => {
    if (user && !canView) router.replace(getPostAuthRedirectPath(user));
  }, [user, canView, router]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: canManageLayout
      ? qk.adminTables(restaurantId ?? "", kind)
      : qk.waiterTables(restaurantId ?? "", kind),
    queryFn: async () => {
      const raw = canManageLayout
        ? await api.admin.tables(restaurantId!, kind)
        : await api.waiter.tables(restaurantId!, kind);
      return normalizeTablesResponse(raw);
    },
    enabled: !!restaurantId && canView && !tablesLockedHere,
  });

  const waiterMeQuery = useQuery({
    queryKey: qk.waiterMe(restaurantId ?? "", user?.id ?? ""),
    queryFn: () => api.waiter.me(restaurantId!),
    enabled: !!restaurantId && canView && waiterMode && !!user?.id && !tablesLockedHere,
    retry: false,
  });

  const waitersForProfileQuery = useQuery({
    queryKey: [...qk.adminWaiters(restaurantId ?? ""), "waiter-profile"],
    queryFn: () => api.admin.waiters(restaurantId!),
    enabled: !!restaurantId && canView && waiterMode && !tablesLockedHere,
    retry: false,
  });

  const kitchenOrdersQuery = useQuery({
    queryKey: [...qk.floorOrders(restaurantId ?? ""), "active", user?.role ?? "guest", kind],
    queryFn: () =>
      fetchActiveFloorOrders(restaurantId!, { mergeWithAdmin: user?.role !== "Waiter" }),
    enabled: !!restaurantId && canView && !tablesLockedHere,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const activeOrderSignals = React.useMemo(() => {
    const activeOrderTableNumbers = new Set<number>();
    const activeOrderTableIds = new Set<string>();
    for (const o of kitchenOrdersQuery.data ?? []) {
      if (isOrderCompletedStatus(o.status)) continue;
      activeOrderTableNumbers.add(o.tableNumber);
      const tid = o.tableId?.trim();
      if (tid) activeOrderTableIds.add(tid);
    }
    return { activeOrderTableNumbers, activeOrderTableIds };
  }, [kitchenOrdersQuery.data]);

  const { data: waitersData } = useQuery({
    queryKey: qk.adminWaiters(restaurantId ?? ""),
    queryFn: () => api.admin.waiters(restaurantId!),
    enabled: !!restaurantId && canView && canManageLayout && !tablesLockedHere,
  });
  const { data: membersData, isFetched: membersFetched } = useQuery({
    queryKey: ["restaurant.members", restaurantId],
    queryFn: () => api.restaurants.members(restaurantId!),
    enabled: !!restaurantId && canView && (canManageLayout || waiterMode) && !tablesLockedHere,
    retry: false,
  });
  const selectedInvoiceQuery = useQuery({
    queryKey: qk.invoiceDetail(restaurantId ?? "", selectedInvoiceId ?? ""),
    queryFn: () => api.invoices.get(restaurantId!, selectedInvoiceId!),
    enabled: !!restaurantId && !!selectedInvoiceId,
  });
  const restaurantQuery = useQuery({
    queryKey: ["restaurant", restaurantId],
    queryFn: () => api.restaurants.get(restaurantId!),
    enabled: !!restaurantId && !!selectedInvoiceId,
  });

  const units = data ?? [];
  const waiters = waitersData ?? [];
  const profileResolutionReady =
    !waiterMode ||
    (waiterMeQuery.isFetched && waitersForProfileQuery.isFetched && membersFetched);
  const floorWaiterProfileId = React.useMemo(
    () =>
      waiterMode
        ? resolveFloorWaiterProfileId(user, {
            waiterMe: waiterMeQuery.data,
            members: membersData,
            waiters: waitersForProfileQuery.data,
          })
        : null,
    [waiterMode, user, waiterMeQuery.data, membersData, waitersForProfileQuery.data],
  );
  const unitsForStaff = React.useMemo(() => {
    if (!waiterMode) return units;
    if (!floorWaiterProfileId) return units;
    return units.filter((t) => t.waiterId === floorWaiterProfileId);
  }, [waiterMode, floorWaiterProfileId, units]);
  const layoutLoading = isLoading || (waiterMode && !profileResolutionReady);
  const eligibleWaiters = React.useMemo(() => {
    const nameToMemberRoles = new Map<string, RestaurantMemberRow[]>();
    for (const member of membersData ?? []) {
      const key = member.name.trim().toLowerCase().replace(/\s+/g, " ");
      const arr = nameToMemberRoles.get(key) ?? [];
      arr.push(member);
      nameToMemberRoles.set(key, arr);
    }
    return waiters.filter((waiter) => {
      const key = waiter.name.trim().toLowerCase().replace(/\s+/g, " ");
      const matches = nameToMemberRoles.get(key) ?? [];
      if (matches.length === 1) return matches[0]!.role === "Waiter";
      return true;
    });
  }, [membersData, waiters]);
  const waiterMap = React.useMemo(
    () => new Map(waiters.map((w) => [w.id, w.name])),
    [waiters],
  );

  const addMutation = useMutation({
    mutationFn: (payload: AdminCreateTableRequest) => api.admin.createTable(payload),
    onSuccess: () => {
      toast.success(`${singular} added`);
      setOpen(false);
      setNumber("");
      setSeats(kind === "ROOM" ? "2" : "4");
      setLabel("");
      setStatus("Available");
      invalidateStaffTableQueries(qc, restaurantId!);
    },
    onError: (err) =>
      toast.error((err as ApiError)?.message ?? `Failed to add ${noun}`),
  });

  const assignMutation = useMutation({
    mutationFn: (payload: AdminAssignTableRequest) =>
      api.admin.assignTableToWaiter(payload),
    onSuccess: () => {
      toast.success(`${singular} assignment updated`);
      invalidateStaffTableQueries(qc, restaurantId!);
      void qc.invalidateQueries({ queryKey: qk.adminWaiters(restaurantId!) });
    },
    onError: (err) =>
      toast.error((err as ApiError)?.message ?? "Failed to update assignment"),
  });

  const deleteMutation = useMutation({
    mutationFn: (tableId: string) => api.admin.deleteTable(restaurantId!, tableId),
    onSuccess: () => {
      toast.success(`${singular} deleted`);
      setUnitToDelete(null);
      invalidateStaffTableQueries(qc, restaurantId!);
      void qc.invalidateQueries({ queryKey: qk.adminWaiters(restaurantId!) });
    },
    onError: (err) =>
      toast.error((err as ApiError)?.message ?? `Failed to delete ${noun}`),
  });
  const createInvoiceMutation = useMutation({
    mutationFn: (tableId: string) =>
      api.billing.createTableInvoice({ restaurantId: restaurantId!, tableId }),
    onSuccess: (res) => {
      toast.success(`Invoice created (${res.invoice.invoiceNumber})`);
      setSelectedInvoiceId(res.invoice.id);
      invalidateStaffTableQueries(qc, restaurantId!);
      void qc.invalidateQueries({ queryKey: qk.billingByRestaurant(restaurantId!) });
      void qc.invalidateQueries({ queryKey: qk.billingList(restaurantId!) });
    },
    onError: (err) => toast.error((err as ApiError)?.message ?? "Failed to create invoice"),
  });
  const latestInvoiceMutation = useMutation({
    mutationFn: (tableId: string) => api.billing.latestTableInvoice(restaurantId!, tableId),
    onSuccess: (res) => {
      if (!res.invoice) {
        toast.info(`No invoice found for this ${noun} yet.`);
        return;
      }
      setSelectedInvoiceId(res.invoice.id);
    },
    onError: (err) => toast.error((err as ApiError)?.message ?? "Failed to load latest invoice"),
  });

  function handleAssign(tableId: string, waiterId: string | null) {
    if (!restaurantId) return;
    assignMutation.mutate({ restaurantId, tableId, waiterId });
  }

  function addUnit() {
    if (!restaurantId || tablesLockedHere) return;
    const n = Number(number);
    const s = Number(seats);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error(`Enter a valid ${noun} number`);
      return;
    }
    if (!Number.isFinite(s) || s <= 0) {
      toast.error(kind === "ROOM" ? "Enter a valid guest capacity" : "Enter a valid seat count");
      return;
    }
    addMutation.mutate({
      restaurantId,
      number: n,
      seats: s,
      status,
      kind,
      label: label.trim() || null,
    });
  }

  if (!restaurantId) {
    return (
      <div className="space-y-12">
        <PageHeader
          title={title}
          description={
            kind === "ROOM"
              ? "In-room dining QR, staff assignment, and billing."
              : "Seating, billing, and payments from the floor."
          }
        />
        <EmptyState
          title="Select a restaurant"
          description="Choose a restaurant in the header to manage this venue."
        />
      </div>
    );
  }

  if (user && !canView) {
    return (
      <EmptyState
        title={title}
        description="You are being redirected to your allowed workspace."
      />
    );
  }

  if (tablesLockedHere) {
    return (
      <div className="space-y-12">
        <PageHeader
          title="Tables"
          description="Dining-table QR is paused while we focus on room service."
        />
        <EmptyState
          title="Tables are locked for now"
          description="Guest ordering runs through Room QR. Manage rooms, assign staff, and print codes from Rooms."
          primaryAction={{
            label: "Go to Rooms",
            onClick: () => router.push(FLOOR_UNITS.staffPrimaryHref),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <PageHeader
        title={title}
        description={
          canManageLayout
            ? kind === "ROOM"
              ? "Create rooms, assign floor staff, and print guest QR codes for in-room ordering."
              : "Manage seating, occupancy, and billing state."
            : kind === "ROOM"
              ? "Open a room to collect payment, create an invoice, or show the guest QR menu."
              : "Open a table to collect payment, create an invoice, or show the guest QR menu."
        }
        actions={
          canManageLayout ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add {noun}
            </Button>
          ) : undefined
        }
      />

      <QueryState
        isLoading={layoutLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        empty={!layoutLoading && !isError && unitsForStaff.length === 0}
        errorFallbackMessage={`Failed to load ${nouns}.`}
        loadingSkeleton={<TableGridSkeleton />}
        className="space-y-12"
        emptyState={
          waiterMode && units.length > 0 ? (
            <EmptyState
              title={`No ${nouns} assigned to you`}
              description="Ask a manager to assign your station on Staffs, or confirm your account matches your floor profile."
            />
          ) : (
            <EmptyState
              title={`No ${nouns}`}
              description={
                canManageLayout
                  ? kind === "ROOM"
                    ? "Add guest rooms so each door can have its own order QR."
                    : "Add tables for this location."
                  : `${title} will appear here once a manager adds them for this venue.`
              }
              primaryAction={
                canManageLayout
                  ? { label: `Add ${noun}`, onClick: () => setOpen(true) }
                  : undefined
              }
            />
          )
        }
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {unitsForStaff.map((t: Table) => (
            <TableCard
              key={t.id}
              table={t}
              displayStatus={tableStatusForStaffUi(
                t,
                activeOrderSignals.activeOrderTableNumbers,
                activeOrderSignals.activeOrderTableIds,
              )}
              waiterName={
                waiterMode
                  ? user?.name ?? null
                  : t.waiterId
                    ? (waiterMap.get(t.waiterId) ?? null)
                    : null
              }
              waiters={eligibleWaiters.map((w) => ({ id: w.id, name: w.name }))}
              onAssign={canManageLayout ? handleAssign : undefined}
              isAssigning={assignMutation.isPending}
              onCollectPayment={mayCollectPayment ? (unit) => setBillingUnit(unit) : undefined}
              onCreateInvoice={(unit) => createInvoiceMutation.mutate(unit.id)}
              isCreateInvoicePending={createInvoiceMutation.isPending}
              onViewLatestInvoice={(unit) => latestInvoiceMutation.mutate(unit.id)}
              onRequestDelete={canManageLayout ? (unit) => setUnitToDelete(unit) : undefined}
              onShowQr={(unit) => setQrUnit(unit)}
            />
          ))}
        </div>
      </QueryState>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {noun}</DialogTitle>
            <DialogDescription>
              {kind === "ROOM"
                ? "Each room gets its own QR for in-room dining. Assign a waiter after creating."
                : "Add a dining table to this venue’s floor plan."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="unit-number">{singular} number</Label>
              <Input
                id="unit-number"
                inputMode="numeric"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder={kind === "ROOM" ? "e.g. 101" : "e.g. 12"}
              />
            </div>
            {kind === "ROOM" ? (
              <div className="grid gap-2">
                <Label htmlFor="unit-label">Display name (optional)</Label>
                <Input
                  id="unit-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Ocean Suite"
                  maxLength={80}
                />
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="unit-seats">
                {kind === "ROOM" ? "Guest capacity" : "Seats"}
              </Label>
              <Input
                id="unit-seats"
                inputMode="numeric"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                placeholder={kind === "ROOM" ? "e.g. 2" : "e.g. 4"}
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TableStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Occupied">Occupied</SelectItem>
                  <SelectItem value="Billing">Billing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addUnit} disabled={addMutation.isPending}>
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!unitToDelete} onOpenChange={(o) => !o && setUnitToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {noun}?</DialogTitle>
            <DialogDescription>
              {unitToDelete
                ? `${floorUnitDisplayName({ ...unitToDelete, kind })} will be removed. This cannot be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="secondary" onClick={() => setUnitToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (unitToDelete) deleteMutation.mutate(unitToDelete.id);
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BillingDrawer
        open={!!billingUnit}
        onOpenChange={(o) => !o && setBillingUnit(null)}
        table={billingUnit}
        restaurantId={restaurantId!}
        onPaymentComplete={() => setBillingUnit(null)}
        onInvoiceOpen={(invoiceId) => setSelectedInvoiceId(invoiceId)}
      />

      <TableQrDialog
        open={!!qrUnit}
        onOpenChange={(o) => !o && setQrUnit(null)}
        restaurantId={restaurantId}
        table={qrUnit}
      />

      <Dialog open={!!selectedInvoiceId} onOpenChange={(o) => !o && setSelectedInvoiceId(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice</DialogTitle>
          </DialogHeader>
          {selectedInvoiceQuery.data && restaurantQuery.data ? (
            <InvoiceView invoice={selectedInvoiceQuery.data} restaurant={restaurantQuery.data} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
