"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { OrderCard } from "@/components/features/orders/order-card";
import { InvoiceView } from "@/components/features/billing/invoice-view";
import { toast } from "sonner";
import { qk } from "@/lib/query-keys";
import { PageHeader } from "@/components/shared/page-header";
import { QueryState, OrderGridSkeleton } from "@/components/shared/query-state";
import { EmptyState } from "@/components/shared/empty-state";
import { useRealtimeOrders } from "@/lib/realtime";
import { useRestaurantStore } from "@/store/restaurant-store";
import { useAuthStore } from "@/store/auth-store";
import { canAccessRouteForUser } from "@/components/layout/nav-items";
import { getPostAuthRedirectPath } from "@/lib/auth-routing";
import { fetchActiveFloorOrders, normalizeOrdersResponse } from "@/lib/floor-orders";
import { isOrderCompletedStatus, isOrderReadyStatus } from "@/lib/order-status";
import type { WaiterUpdateOrderRequest } from "@/types/api";
import type { Order } from "@/types/order";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
export default function OrdersPage() {
  const router = useRouter();
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const user = useAuthStore((s) => s.user);
  const canViewOrders = canAccessRouteForUser(user, "/orders");
  const waiterMode = user?.globalRole !== "SuperAdmin" && user?.role === "Waiter";
  const floorStaffMode =
    user?.globalRole !== "SuperAdmin" &&
    (user?.role === "Waiter" || user?.role === "Manager");
  const [statusFilter, setStatusFilter] = React.useState<"active" | "completed">("active");
  const [invoiceOrder, setInvoiceOrder] = React.useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = React.useState<Order | null>(null);

  React.useEffect(() => {
    if (waiterMode) setStatusFilter("active");
  }, [waiterMode]);
  React.useEffect(() => {
    if (user && !canViewOrders) router.replace(getPostAuthRedirectPath(user));
  }, [user, canViewOrders, router]);

  useRealtimeOrders(restaurantId);
  const qc = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: [
      waiterMode
        ? [...qk.floorOrders(restaurantId ?? ""), "active"]
        : statusFilter === "active"
          ? [...qk.floorOrders(restaurantId ?? ""), "active"]
          : [...qk.floorOrders(restaurantId ?? ""), "completed"],
      user?.role ?? "guest",
    ],
    queryFn: async () => {
      if (!restaurantId) throw new Error("No restaurant");
      if (!waiterMode && statusFilter === "completed") {
        const raw = await api.admin.orders(restaurantId, { status: "Completed" });
        return normalizeOrdersResponse(raw);
      }
      return fetchActiveFloorOrders(restaurantId, {
        mergeWithAdmin: user?.role !== "Waiter",
      });
    },
    enabled: !!restaurantId,
    // Fallback for environments where realtime socket delivery is delayed/broken.
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const { data, isLoading, isError, refetch, error } = ordersQuery;

  const restaurantQuery = useQuery({
    queryKey: ["restaurant", restaurantId],
    queryFn: () => api.restaurants.get(restaurantId!),
    enabled: !!restaurantId && !!invoiceOrder,
  });

  const mutation = useMutation({
    mutationFn: (payload: WaiterUpdateOrderRequest) => api.waiter.updateOrder(payload),
    onSuccess: () => {
      toast.success("Order updated");
      if (restaurantId) {
        void qc.invalidateQueries({ queryKey: qk.kitchenOrders(restaurantId) });
        void qc.invalidateQueries({ queryKey: qk.floorOrders(restaurantId) });
      }
    },
    onError: () => toast.error("Failed to update order"),
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (orderId: string) => api.admin.deleteOrder(restaurantId!, orderId),
    onSuccess: () => {
      toast.success("Order deleted");
      setOrderToDelete(null);
      if (restaurantId) {
        void qc.invalidateQueries({ queryKey: qk.kitchenOrders(restaurantId) });
        void qc.invalidateQueries({ queryKey: qk.floorOrders(restaurantId) });
        void qc.invalidateQueries({ queryKey: ["admin.orders", restaurantId, "completed"] });
        void qc.invalidateQueries({ queryKey: ["admin.orders", restaurantId, "all"] });
      }
    },
    onError: () => toast.error("Failed to delete order"),
  });

  const completeMutation = useMutation({
    mutationFn: (orderId: string) =>
      api.waiter.completeOrder(restaurantId!, orderId),
    onSuccess: () => {
      toast.success("Order completed");
      if (restaurantId) {
        void qc.invalidateQueries({ queryKey: qk.kitchenOrders(restaurantId) });
        void qc.invalidateQueries({ queryKey: qk.floorOrders(restaurantId) });
        void qc.invalidateQueries({
          queryKey: ["admin.orders", restaurantId, "completed"],
        });
      }
    },
    onError: () => toast.error("Failed to complete order"),
  });

  const orders = React.useMemo(() => {
    if (waiterMode) {
      return (data ?? []).filter((o) => !isOrderCompletedStatus(o.status));
    }
    return statusFilter === "active"
      ? (data ?? []).filter((o) => !isOrderCompletedStatus(o.status))
      : (data ?? []);
  }, [data, statusFilter, waiterMode]);

  const tablesToVisit = React.useMemo(() => {
    const nums = new Set<number>();
    for (const o of orders) {
      if (!isOrderCompletedStatus(o.status)) nums.add(o.tableNumber);
    }
    return Array.from(nums).sort((a, b) => a - b);
  }, [orders]);

  if (!restaurantId) {
    return (
      <div className="space-y-12">
        <PageHeader
          title={waiterMode ? "Floor orders" : "Orders"}
          description={
            waiterMode
              ? "Pending, preparing, and ready tickets—head to the tables shown below."
              : "Track and progress active orders in real-time."
          }
        />
        <EmptyState
          title="Select a restaurant"
          description="Choose a restaurant in the header to manage its orders."
        />
      </div>
    );
  }
  if (user && !canViewOrders) {
    return (
      <EmptyState
        title="Orders are restricted"
        description="You are being redirected to your allowed workspace."
      />
    );
  }

  return (
    <div className="space-y-12">
      <PageHeader
        title={waiterMode ? "Floor orders" : "Orders"}
        description={
          waiterMode
            ? "Pending, preparing, and ready tickets. Mark complete when you’ve served a ready order."
            : "Track and progress active orders in real-time."
        }
        actions={
          <div className="flex gap-2">
            {waiterMode ? (
              <Button variant="secondary" size="sm" onClick={() => router.push("/profile")}>
                My profile
              </Button>
            ) : (
              <>
                <Button
                  variant={statusFilter === "active" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === "completed" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setStatusFilter("completed")}
                >
                  Completed
                </Button>
              </>
            )}
          </div>
        }
      />

      {floorStaffMode && canViewOrders && statusFilter === "active" && tablesToVisit.length > 0 ? (
        <Card className="rounded-2xl border border-black/[0.06] bg-card shadow-sm dark:border-white/[0.08]">
          <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <MapPin className="size-4 text-primary" />
                Tables to visit
              </CardTitle>
              <CardDescription>
                From your current queue—open orders at these tables.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => router.push("/tables")}>
              Open tables
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tablesToVisit.map((n) => (
                <Badge
                  key={n}
                  variant="secondary"
                  className="rounded-lg px-3 py-1 text-sm font-semibold tabular-nums"
                >
                  Table {n}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Orders</h2>
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={() => refetch()}
          empty={!isLoading && !isError && orders.length === 0}
          errorFallbackMessage="Failed to load orders."
          loadingSkeleton={<OrderGridSkeleton />}
          className="space-y-12"
          emptyState={
            <EmptyState
              title={
                waiterMode
                  ? "No open floor orders"
                  : statusFilter === "active"
                    ? "No active orders"
                    : "No completed orders"
              }
              description={
                waiterMode
                  ? "If nothing appears, your account may only be allowed to load the admin order list—try again after a refresh, or ask an admin to enable kitchen or admin order APIs for waiters."
                  : statusFilter === "active"
                    ? "New orders will appear here automatically."
                    : "Completed orders will appear here."
              }
            />
          }
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {orders.map((o) => (
              <div key={o.id} className="space-y-2">
                <OrderCard
                  order={o}
                  onMarkPreparing={
                    !waiterMode && statusFilter === "active"
                      ? (orderId) =>
                          mutation.mutate({ restaurantId, orderId, status: "Preparing" })
                      : undefined
                  }
                  onMarkReady={
                    !waiterMode && statusFilter === "active"
                      ? (orderId) =>
                          mutation.mutate({ restaurantId, orderId, status: "Ready" })
                      : undefined
                  }
                  onMarkComplete={
                    statusFilter === "active"
                      ? waiterMode
                        ? isOrderReadyStatus(o.status)
                          ? (orderId) => completeMutation.mutate(orderId)
                          : undefined
                        : (orderId) => completeMutation.mutate(orderId)
                      : undefined
                  }
                  onDelete={
                    waiterMode
                      ? undefined
                      : (orderId) => {
                          const ord = orders.find((x) => x.id === orderId);
                          if (ord) setOrderToDelete(ord);
                        }
                  }
                />
                {isOrderCompletedStatus(o.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setInvoiceOrder(o)}
                  >
                    <FileText className="mr-2 size-4" />
                    View invoice
                  </Button>
                )}
              </div>
            ))}
          </div>
        </QueryState>
      </section>

      <Dialog open={!!orderToDelete} onOpenChange={(o) => !o && setOrderToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete order?</DialogTitle>
            <DialogDescription>
              This removes the order for Table {orderToDelete?.tableNumber} permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="secondary" onClick={() => setOrderToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteOrderMutation.isPending}
              onClick={() => {
                if (orderToDelete) deleteOrderMutation.mutate(orderToDelete.id);
              }}
            >
              {deleteOrderMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!invoiceOrder} onOpenChange={(o) => !o && setInvoiceOrder(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice</DialogTitle>
          </DialogHeader>
          {invoiceOrder && restaurantQuery.data && (
            <InvoiceView
              order={invoiceOrder}
              restaurant={restaurantQuery.data}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
