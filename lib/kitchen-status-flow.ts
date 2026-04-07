import type { OrderStatus } from "@/types/order";

/** Kitchen columns only (same as batch / KDS status). */
export type KitchenFlowStatus = "Pending" | "Preparing" | "Ready";

const RANK: Record<KitchenFlowStatus, number> = {
  Pending: 0,
  Preparing: 1,
  Ready: 2,
};

export function orderStatusToKitchenFlow(status: OrderStatus): KitchenFlowStatus {
  if (status === "Completed") return "Ready";
  return status as KitchenFlowStatus;
}

/**
 * Allowed moves: Pending → Preparing → Ready only.
 * No skipping (Pending → Ready), no moving backward.
 */
export function isAllowedKitchenTransition(
  from: KitchenFlowStatus,
  to: KitchenFlowStatus,
): boolean {
  if (from === to) return false;
  return RANK[to] === RANK[from] + 1;
}

export function kitchenFlowValidationMessage(): string {
  return "Tickets move one step: Queue → Prep → Ready. You can’t skip or go backward.";
}
