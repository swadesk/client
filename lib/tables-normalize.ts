import type { Table } from "@/types/table";

/**
 * Some backends return a bare `Table[]`, others wrap as `{ tables: [...] }`, `{ data: [...] }`,
 * or nest arrays under `data.tables`. Without this, the UI shows an empty grid even when rows exist.
 */
export function normalizeTablesResponse(raw: unknown): Table[] {
  if (Array.isArray(raw)) return raw as Table[];
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  for (const key of ["tables", "data", "results", "items"] as const) {
    const v = o[key];
    if (Array.isArray(v)) return v as Table[];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner = v as Record<string, unknown>;
      for (const ik of ["tables", "data", "items", "results"] as const) {
        const a = inner[ik];
        if (Array.isArray(a)) return a as Table[];
      }
    }
  }
  const payload = o.payload;
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.tables)) return p.tables as Table[];
    if (Array.isArray(p.data)) return p.data as Table[];
  }
  return [];
}
