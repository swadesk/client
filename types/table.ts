export type TableStatus = "Available" | "Occupied" | "Billing";

export type FloorUnitKind = "TABLE" | "ROOM";

export type Table = {
  id: string;
  number: number;
  seats: number;
  /** Optional guest-facing name (e.g. "Ocean Suite"). */
  label?: string | null;
  kind?: FloorUnitKind;
  status: TableStatus;
  /** Assigned waiter ID, or null if unassigned. */
  waiterId?: string | null;
};
