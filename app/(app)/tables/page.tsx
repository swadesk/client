"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Table, TableStatus } from "@/types/table";
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

export default function TablesPage() {
  const router = useRouter();
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const user = useAuthStore((s) => s.user);
  const canViewTables = canAccessRouteForUser(user, "/tables");
  const canManageTablesLayout = user?.role === "Admin" || user?.role === "Manager";
  const waiterMode = user?.globalRole !== "SuperAdmin" && user?.role === "Waiter";
  const mayCollectPayment = canCollectTablePayments(user);
  useRealtimeOrders(restaurantId);
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [billingTable, setBillingTable] = React.useState<Table | null>(null);
  const [tableToDelete, setTableToDelete] = React.useState<Table | null>(null);
  const [qrTable, setQrTable] = React.useState<Table | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string | null>(null);

  const [number, setNumber] = React.useState("");
  const [seats, setSeats] = React.useState("4");
  const [status, setStatus] = React.useState<TableStatus>("Available");

  React.useEffect(() => {
    if (user && !canViewTables) router.replace(getPostAuthRedirectPath(user));
  }, [user, canViewTables, router]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: canManageTablesLayout
      ? qk.adminTables(restaurantId ?? "")
      : qk.waiterTables(restaurantId ?? ""),
    queryFn: async () => {
      const raw = canManageTablesLayout
        ? await api.admin.tables(restaurantId!)
        : await api.waiter.tables(restaurantId!);
      return normalizeTablesResponse(raw);
    },
    enabled: !!restaurantId && canViewTables,
  });

  const waiterMeQuery = useQuery({
    queryKey: qk.waiterMe(restaurantId ?? "", user?.id ?? ""),
    queryFn: () => api.waiter.me(restaurantId!),
    enabled: !!restaurantId && canViewTables && waiterMode && !!user?.id,
    retry: false,
  });

  const waitersForProfileQuery = useQuery({
    queryKey: [...qk.adminWaiters(restaurantId ?? ""), "waiter-profile"],
    queryFn: () => api.admin.waiters(restaurantId!),
    enabled: !!restaurantId && canViewTables && waiterMode,
    retry: false,
  });

  const kitchenOrdersQuery = useQuery({
    queryKey: [...qk.floorOrders(restaurantId ?? ""), "active", user?.role ?? "guest"],
    queryFn: () =>
      fetchActiveFloorOrders(restaurantId!, { mergeWithAdmin: user?.role !== "Waiter" }),
    enabled: !!restaurantId && canViewTables,
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
    enabled: !!restaurantId && canViewTables && canManageTablesLayout,
  });
  const { data: membersData, isFetched: membersFetched } = useQuery({
    queryKey: ["restaurant.members", restaurantId],
    queryFn: () => api.restaurants.members(restaurantId!),
    enabled: !!restaurantId && canViewTables && (canManageTablesLayout || waiterMode),
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

  const tables = data ?? [];
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
    [
      waiterMode,
      user,
      waiterMeQuery.data,
      membersData,
      waitersForProfileQuery.data,
    ],
  );
  const tablesForStaff = React.useMemo(() => {
    if (!waiterMode) return tables;
    if (!floorWaiterProfileId) {
      // Cannot map this login to `Table.waiterId` (floor roster id). Avoid filtering with the wrong id
      // (e.g. auth user id). Prefer a backend-scoped `GET /api/waiter/tables` or `user.floorWaiterId` / `/api/waiter/me`.
      return tables;
    }
    return tables.filter((t) => t.waiterId === floorWaiterProfileId);
  }, [waiterMode, floorWaiterProfileId, tables]);
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
      // If we can map the staff role and it's Kitchen/Manager, disallow table assignment.
      if (matches.length === 1) return matches[0]!.role === "Waiter";
      // For legacy rows without mapping, keep assignable to avoid blocking operations.
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
      toast.success("Table added");
      setOpen(false);
      setNumber("");
      setSeats("4");
      setStatus("Available");
      invalidateStaffTableQueries(qc, restaurantId!);
    },
    onError: (err) => toast.error((err as ApiError)?.message ?? "Failed to add table"),
  });

  const assignMutation = useMutation({
    mutationFn: (payload: AdminAssignTableRequest) =>
      api.admin.assignTableToWaiter(payload),
    onSuccess: () => {
      toast.success("Table assignment updated");
      invalidateStaffTableQueries(qc, restaurantId!);
      void qc.invalidateQueries({ queryKey: qk.adminWaiters(restaurantId!) });
    },
    onError: (err) =>
      toast.error((err as ApiError)?.message ?? "Failed to update assignment"),
  });

  const deleteTableMutation = useMutation({
    mutationFn: (tableId: string) => api.admin.deleteTable(restaurantId!, tableId),
    onSuccess: () => {
      toast.success("Table deleted");
      setTableToDelete(null);
      invalidateStaffTableQueries(qc, restaurantId!);
      void qc.invalidateQueries({ queryKey: qk.adminWaiters(restaurantId!) });
    },
    onError: (err) => toast.error((err as ApiError)?.message ?? "Failed to delete table"),
  });
  const createTableInvoiceMutation = useMutation({
    mutationFn: (tableId: string) => api.billing.createTableInvoice({ restaurantId: restaurantId!, tableId }),
    onSuccess: (res) => {
      toast.success(`Invoice created (${res.invoice.invoiceNumber})`);
      setSelectedInvoiceId(res.invoice.id);
      invalidateStaffTableQueries(qc, restaurantId!);
      void qc.invalidateQueries({ queryKey: qk.billingByRestaurant(restaurantId!) });
      void qc.invalidateQueries({ queryKey: qk.billingList(restaurantId!) });
    },
    onError: (err) => toast.error((err as ApiError)?.message ?? "Failed to create invoice"),
  });
  const latestTableInvoiceMutation = useMutation({
    mutationFn: (tableId: string) => api.billing.latestTableInvoice(restaurantId!, tableId),
    onSuccess: (res) => {
      if (!res.invoice) {
        toast.info("No invoice found for this table yet.");
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

  function addTable() {
    if (!restaurantId) return;
    const n = Number(number);
    const s = Number(seats);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a valid table number");
      return;
    }
    if (!Number.isFinite(s) || s <= 0) {
      toast.error("Enter a valid seat count");
      return;
    }
    addMutation.mutate({
      restaurantId,
      number: n,
      seats: s,
      status,
    });
  }

  if (!restaurantId) {
    return (
      <div className="space-y-12">
        <PageHeader
          title="Tables"
          description="Seating, billing, and payments from the floor."
        />
        <EmptyState
          title="Select a restaurant"
          description="Choose a restaurant in the header to manage its floor plan."
        />
      </div>
    );
  }

  if (user && !canViewTables) {
    return (
      <EmptyState
        title="Tables"
        description="You are being redirected to your allowed workspace."
      />
    );
  }

  return (
    <div className="space-y-12">
      <PageHeader
        title="Tables"
        description={
          canManageTablesLayout
            ? "Manage seating, occupancy, and billing state."
            : "Open a table to collect payment, create an invoice, or show the guest QR menu."
        }
        actions={
          canManageTablesLayout ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add table
            </Button>
          ) : undefined
        }
      />

      <QueryState
        isLoading={layoutLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        empty={!layoutLoading && !isError && tablesForStaff.length === 0}
        errorFallbackMessage="Failed to load tables."
        loadingSkeleton={<TableGridSkeleton />}
        className="space-y-12"
        emptyState={
          waiterMode && tables.length > 0 ? (
            <EmptyState
              title="No tables assigned to you"
              description="Ask a manager to assign your station on Staffs, or confirm your account matches your floor profile."
            />
          ) : (
            <EmptyState
              title="No tables"
              description={
                canManageTablesLayout
                  ? "Add tables for this location."
                  : "Tables will appear here once a manager adds them for this venue."
              }
              primaryAction={
                canManageTablesLayout
                  ? { label: "Add table", onClick: () => setOpen(true) }
                  : undefined
              }
            />
          )
        }
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tablesForStaff.map((t: Table) => (
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
              onAssign={canManageTablesLayout ? handleAssign : undefined}
              isAssigning={assignMutation.isPending}
              onCollectPayment={mayCollectPayment ? (table) => setBillingTable(table) : undefined}
              onCreateInvoice={(table) => createTableInvoiceMutation.mutate(table.id)}
              isCreateInvoicePending={createTableInvoiceMutation.isPending}
              onViewLatestInvoice={(table) => latestTableInvoiceMutation.mutate(table.id)}
              onRequestDelete={canManageTablesLayout ? (table) => setTableToDelete(table) : undefined}
              onShowQr={(table) => setQrTable(table)}
            />
          ))}
        </div>
      </QueryState>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add table</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="table-number">Table number</Label>
              <Input
                id="table-number"
                inputMode="numeric"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g. 12"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="table-seats">Seats</Label>
              <Input
                id="table-seats"
                inputMode="numeric"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                placeholder="e.g. 4"
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
              <Button onClick={addTable} disabled={addMutation.isPending}>
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!tableToDelete} onOpenChange={(o) => !o && setTableToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete table?</DialogTitle>
            <DialogDescription>
              Table {tableToDelete?.number} will be removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="secondary" onClick={() => setTableToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTableMutation.isPending}
              onClick={() => {
                if (tableToDelete) deleteTableMutation.mutate(tableToDelete.id);
              }}
            >
              {deleteTableMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BillingDrawer
        open={!!billingTable}
        onOpenChange={(o) => !o && setBillingTable(null)}
        table={billingTable}
        restaurantId={restaurantId!}
        onPaymentComplete={() => setBillingTable(null)}
        onInvoiceOpen={(invoiceId) => setSelectedInvoiceId(invoiceId)}
      />

      <TableQrDialog
        open={!!qrTable}
        onOpenChange={(o) => !o && setQrTable(null)}
        restaurantId={restaurantId}
        table={qrTable}
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
