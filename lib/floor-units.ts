export type FloorUnitKind = "TABLE" | "ROOM";

/**
 * Product lock: dining-table QR paused; staff + guests use Rooms.
 * Align with server `FLOOR_UNITS` in `server/src/common/floor-units.config.ts`.
 */
export const FLOOR_UNITS = {
  tablesLocked: true,
  publicQrKind: "ROOM" as FloorUnitKind,
  staffPrimaryHref: "/rooms",
} as const;

export function floorUnitNoun(kind: FloorUnitKind, plural = false): string {
  if (kind === "ROOM") return plural ? "rooms" : "room";
  return plural ? "tables" : "table";
}

export function floorUnitTitle(kind: FloorUnitKind, plural = false): string {
  if (kind === "ROOM") return plural ? "Rooms" : "Room";
  return plural ? "Tables" : "Table";
}

export function floorUnitDisplayName(unit: {
  kind?: FloorUnitKind | null;
  number: number;
  label?: string | null;
}): string {
  const custom = unit.label?.trim();
  if (custom) return custom;
  const kind = unit.kind === "ROOM" ? "ROOM" : "TABLE";
  return `${floorUnitTitle(kind)} ${unit.number}`;
}
