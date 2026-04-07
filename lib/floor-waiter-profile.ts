import type { AuthUser, RestaurantMemberRow } from "@/types/auth";
import type { Waiter } from "@/types/waiter";

export function normalizeStaffName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function isWaiterShapedRecord(rec: Record<string, unknown>): boolean {
  const role = rec.role;
  const status = rec.status;
  return (
    typeof rec.id === "string" &&
    !!rec.id.trim() &&
    (typeof role === "string" || typeof status === "string")
  );
}

/**
 * Picks the floor waiter profile id from `/api/waiter/me` (and similar) payloads.
 * Handles nested `data`, `waiter`, wrappers and snake_case keys; avoids treating the top-level auth `user.id` as the floor profile.
 */
export function pickWaiterIdFromMePayload(data: unknown): string | null {
  function visit(node: unknown, allowGenericId: boolean): string | null {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = visit(item, allowGenericId);
        if (found) return found;
      }
      return null;
    }
    const rec = node as Record<string, unknown>;
    for (const key of ["waiterId", "floorWaiterId", "waiter_id", "floor_waiter_id"] as const) {
      const v = rec[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    if (allowGenericId || isWaiterShapedRecord(rec)) {
      const v = rec.id;
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    for (const k of ["data", "payload", "waiter", "profile", "result"] as const) {
      const child = rec[k];
      const nextAllow = allowGenericId || k === "waiter" || k === "profile";
      const found = visit(child, nextAllow);
      if (found) return found;
    }
    const userChild = rec.user;
    if (userChild && typeof userChild === "object" && !Array.isArray(userChild)) {
      const u = userChild as Record<string, unknown>;
      for (const key of ["waiterId", "floorWaiterId", "waiter_id", "floor_waiter_id"] as const) {
        const v = u[key];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
    }
    return null;
  }
  return visit(data, false);
}

/**
 * Resolves the floor staff profile id stored on `Table.waiterId` for the signed-in user.
 */
export function resolveFloorWaiterProfileId(
  user: AuthUser | null,
  options: {
    waiterMe?: unknown;
    members?: RestaurantMemberRow[] | null;
    waiters?: Waiter[] | null;
  } = {},
): string | null {
  if (!user) return null;
  const explicit = user.floorWaiterId?.trim();
  if (explicit) return explicit;

  const fromMe = pickWaiterIdFromMePayload(options.waiterMe);
  if (fromMe) return fromMe;

  const waiters = options.waiters ?? [];
  if (waiters.length > 0) {
    const members = options.members ?? [];
    const member = members.find((m) => m.userId === user.id);
    const nameKey = normalizeStaffName(member?.name ?? user.name);
    if (nameKey) {
      const matches = waiters.filter((w) => normalizeStaffName(w.name) === nameKey);
      if (matches.length === 1) return matches[0]!.id;
      const linked = matches.filter((w) => w.userId != null && w.userId === user.id);
      if (linked.length === 1) return linked[0]!.id;
    }
  }

  return null;
}
