export type TableStatus = "Available" | "Occupied" | "Billing";

export type Table = {
  id: string;
  number: number;
  seats: number;
  status: TableStatus;
  /** Assigned waiter ID, or null if unassigned. */
  waiterId?: string | null;
};

