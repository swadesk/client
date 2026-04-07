import type { KitchenBatchStatus, Order, OrderStatus } from "@/types/order";
import type { WaiterUpdateOrderRequest } from "@/types/api";

export function applyKitchenStatusUpdate(
  orders: Order[],
  payload: Pick<WaiterUpdateOrderRequest, "orderId" | "kitchenBatchId" | "status">,
): Order[] {
  const { orderId, kitchenBatchId, status } = payload;
  const kb = status as KitchenBatchStatus;
  return orders.map((o) => {
    if (o.id !== orderId) return o;
    if (o.kitchenBatches?.length) {
      const bid = kitchenBatchId;
      if (!bid) {
        return {
          ...o,
          kitchenBatches: o.kitchenBatches.map((b) => ({ ...b, status: kb })),
        };
      }
      return {
        ...o,
        kitchenBatches: o.kitchenBatches.map((b) =>
          b.id === bid ? { ...b, status: kb } : b,
        ),
      };
    }
    return { ...o, status: status as OrderStatus };
  });
}

export function waiterPayloadForKitchenUnit(
  restaurantId: string,
  unit: import("@/types/order").KitchenBoardUnit,
  status: KitchenBatchStatus,
): WaiterUpdateOrderRequest {
  const legacy = unit.kitchenBatchId === unit.orderId;
  return {
    restaurantId,
    orderId: unit.orderId,
    status,
    ...(!legacy ? { kitchenBatchId: unit.kitchenBatchId } : {}),
  };
}
