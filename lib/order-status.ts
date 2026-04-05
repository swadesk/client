/** Normalize API variants (`READY`, `ready`) for comparisons. */
export function normalizeOrderStatus(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim();
}

export function isOrderCompletedStatus(raw: unknown): boolean {
  return normalizeOrderStatus(raw).toLowerCase() === "completed";
}

export function isOrderReadyStatus(raw: unknown): boolean {
  return normalizeOrderStatus(raw).toLowerCase() === "ready";
}
