import type { KitchenBoardUnit, KitchenBatchStatus, Order, OrderStatus } from "@/types/order";

/** Stable id for DnD + optimistic overrides (legacy: equals `orderId`). */
export function makeKitchenBoardId(orderId: string, kitchenBatchId: string): string {
  if (kitchenBatchId === orderId) return orderId;
  return `${orderId}__KB__${kitchenBatchId}`;
}

export function parseKitchenBoardId(boardId: string): { orderId: string; kitchenBatchId: string } {
  const idx = boardId.indexOf("__KB__");
  if (idx === -1) return { orderId: boardId, kitchenBatchId: boardId };
  return { orderId: boardId.slice(0, idx), kitchenBatchId: boardId.slice(idx + 6) };
}

function toKanban(status: OrderStatus): KitchenBatchStatus {
  if (status === "Completed") return "Ready";
  return status as KitchenBatchStatus;
}

/**
 * One KDS card per kitchen batch when `order.kitchenBatches` is set (API or derived from line `kitchenBatchId`).
 */
export function buildKitchenBoardUnits(orders: Order[]): KitchenBoardUnit[] {
  const out: KitchenBoardUnit[] = [];
  for (const order of orders) {
    if (order.kitchenBatches && order.kitchenBatches.length > 0) {
      for (const b of order.kitchenBatches) {
        out.push({
          boardId: makeKitchenBoardId(order.id, b.id),
          orderId: order.id,
          kitchenBatchId: b.id,
          status: b.status,
          tableNumber: order.tableNumber,
          createdAt: b.createdAt ?? order.createdAt,
          items: b.items,
          batchLabel: b.label,
          sourceOrder: order,
        });
      }
      continue;
    }
    out.push({
      boardId: order.id,
      orderId: order.id,
      kitchenBatchId: order.id,
      status: toKanban(order.status),
      tableNumber: order.tableNumber,
      createdAt: order.createdAt,
      items: order.items,
      batchLabel: undefined,
      sourceOrder: order,
    });
  }
  return out;
}

export function kitchenUnitToDisplayOrder(unit: KitchenBoardUnit): Order {
  const o = unit.sourceOrder;
  return {
    ...o,
    id: unit.boardId,
    items: unit.items,
    status: unit.status as OrderStatus,
    kitchenTicketLabel: unit.batchLabel,
    kitchenParentOrderId: o.id,
    kitchenBatches: undefined,
  };
}
