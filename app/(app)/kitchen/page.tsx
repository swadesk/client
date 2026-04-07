"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fetchKitchenOrdersList } from "@/lib/floor-orders";
import { qk } from "@/lib/query-keys";
import { useRestaurantStore } from "@/store/restaurant-store";
import { useAuthStore } from "@/store/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { QueryState, KitchenBoardSkeleton } from "@/components/shared/query-state";
import { KitchenBoard } from "@/components/features/kitchen/kitchen-board";
import { EmptyState } from "@/components/shared/empty-state";
import { useRealtimeOrders } from "@/lib/realtime";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WaiterUpdateOrderRequest } from "@/types/api";
import type { KitchenBatchStatus, Order } from "@/types/order";
import type { KitchenPendingOrdersGetResponse } from "@/types/api";
import { buildKitchenBoardUnits, makeKitchenBoardId } from "@/lib/kitchen-board-units";
import { applyKitchenStatusUpdate, waiterPayloadForKitchenUnit } from "@/lib/kitchen-order-mutate";
import { canAccessRouteForUser } from "@/components/layout/nav-items";
import { getPostAuthRedirectPath } from "@/lib/auth-routing";

export default function KitchenPage() {
  const router = useRouter();
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const user = useAuthStore((s) => s.user);
  const canViewKitchen = canAccessRouteForUser(user, "/kitchen");
  const qc = useQueryClient();
  const [statusOverrides, setStatusOverrides] = React.useState<Record<string, KitchenBatchStatus>>({});
  const [orderToDelete, setOrderToDelete] = React.useState<Order | null>(null);
  useRealtimeOrders(restaurantId);

  React.useEffect(() => {
    if (user && !canViewKitchen) router.replace(getPostAuthRedirectPath(user));
  }, [user, canViewKitchen, router]);

  React.useEffect(() => {
    setStatusOverrides({});
  }, [restaurantId]);

  const { data, isLoading, isError, refetch, error } = useQuery({
    queryKey: qk.kitchenOrders(restaurantId ?? ""),
    queryFn: () => fetchKitchenOrdersList(restaurantId!),
    enabled: !!restaurantId,
    refetchInterval: 10_000,
  });

  const mutation = useMutation({
    mutationFn: (payload: WaiterUpdateOrderRequest) => api.waiter.updateOrder(payload),
    onMutate: async (variables) => {
      const queryKey = qk.kitchenOrders(variables.restaurantId);
      await qc.cancelQueries({ queryKey });
      const previousOrders = qc.getQueryData<KitchenPendingOrdersGetResponse>(queryKey);
      const boardId = variables.kitchenBatchId
        ? makeKitchenBoardId(variables.orderId, variables.kitchenBatchId)
        : variables.orderId;
      const optimisticOrders = applyKitchenStatusUpdate(previousOrders ?? [], variables);
      setStatusOverrides((prev) => ({
        ...prev,
        [boardId]: variables.status as KitchenBatchStatus,
      }));
      qc.setQueryData(queryKey, optimisticOrders);
    },
    onError: () => {
      // Keep optimistic UI state even if API errors, to avoid snap-back UX.
      toast.error("Sync failed, retrying in background");
    },
    onSuccess: (_data, variables) => {
      toast.success("Order updated");
      const queryKey = qk.kitchenOrders(variables.restaurantId);
      qc.setQueryData<KitchenPendingOrdersGetResponse>(queryKey, (old) => {
        if (!old) return old;
        return applyKitchenStatusUpdate(old, variables);
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (orderId: string) => api.admin.deleteOrder(restaurantId!, orderId),
    onSuccess: (_data, orderId) => {
      const rid = restaurantId;
      if (!rid) return;
      toast.success("Order deleted");
      setOrderToDelete(null);
      setStatusOverrides((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (k === orderId || k.startsWith(`${orderId}__KB__`)) delete next[k];
        }
        return next;
      });
      qc.setQueryData<KitchenPendingOrdersGetResponse>(qk.kitchenOrders(rid), (old) =>
        old ? old.filter((o) => o.id !== orderId) : old,
      );
      void qc.invalidateQueries({ queryKey: qk.kitchenOrders(rid) });
      void qc.invalidateQueries({ queryKey: ["admin.orders", rid, "completed"] });
      void qc.invalidateQueries({ queryKey: ["admin.orders", rid, "all"] });
    },
    onError: () => toast.error("Failed to delete order"),
  });

  const orders = React.useMemo(() => {
    return (data ?? []).map((order) => {
      if (order.kitchenBatches?.length) {
        return {
          ...order,
          kitchenBatches: order.kitchenBatches.map((b) => {
            const bid = makeKitchenBoardId(order.id, b.id);
            const ov = statusOverrides[bid];
            return ov ? { ...b, status: ov } : b;
          }),
        };
      }
      const ov = statusOverrides[order.id];
      if (!ov || ov === order.status) return order;
      return { ...order, status: ov };
    });
  }, [data, statusOverrides]);

  const kitchenUnits = React.useMemo(() => buildKitchenBoardUnits(orders), [orders]);

  if (!restaurantId) {
    return (
      <div className="space-y-12">
        <PageHeader
          title="Kitchen Display"
          description="Large, glanceable cards for kitchen staff."
        />
        <EmptyState
          title="Select a restaurant"
          description="Choose a restaurant in the header to load its kitchen queue."
        />
      </div>
    );
  }
  if (user && !canViewKitchen) {
    return (
      <EmptyState
        title="Kitchen view is restricted"
        description="You are being redirected to your allowed workspace."
      />
    );
  }

  return (
    <div className="space-y-12">
      <PageHeader
        title="Kitchen Display"
        description="Glanceable tickets for kitchen staff. Drag cards between columns or use Move ticket on each card."
        actions={
          <div className="text-xs text-muted-foreground">Auto refresh every 10s</div>
        }
      />

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        empty={false}
        errorFallbackMessage="Failed to load kitchen orders."
        loadingSkeleton={<KitchenBoardSkeleton />}
        className="space-y-12"
      >
        <KitchenBoard
          units={kitchenUnits}
          restaurantId={restaurantId}
          onUnitStatusChange={(unit, status) =>
            mutation.mutate(waiterPayloadForKitchenUnit(restaurantId, unit, status))
          }
          onOrderDelete={(orderId) => {
            const o = orders.find((x) => x.id === orderId);
            if (o) setOrderToDelete(o);
          }}
        />
      </QueryState>

      <Dialog open={!!orderToDelete} onOpenChange={(o) => !o && setOrderToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete order?</DialogTitle>
            <DialogDescription>
              This removes the order for Table {orderToDelete?.tableNumber} from the kitchen queue.
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
    </div>
  );
}
