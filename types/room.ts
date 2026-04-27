export type Room = {
  id: string;
  /** Human-friendly room label, e.g. "Main hall", "Patio", "Private room". */
  name: string;
  /** Optional staff assignment (maps to floor waiter/staff id). */
  waiterId?: string | null;
};

