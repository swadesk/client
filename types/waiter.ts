export type WaiterRole = "Lead" | "Captain" | "Server";

export type WaiterStatus = "Active" | "Break" | "Offline";

export type Waiter = {
  id: string;
  name: string;
  /** When the backend links floor staff to auth accounts (matches `RestaurantMemberRow.userId`). */
  userId?: string | null;
  /** From upload URL when set on the server. */
  photoUrl?: string | null;
  role: WaiterRole;
  status: WaiterStatus;
  /** Count of assigned tables (derived from assignedTableIds). */
  assignedTables: number;
  /** IDs of tables assigned to this waiter (computed from tables). */
  assignedTableIds: string[];
};
