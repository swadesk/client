import { format } from "date-fns";
import type { Order, OrderItem } from "@/types/order";

export type KitchenItemBatch = {
  /** Stable key for React */
  key: string;
  /** Empty when only one batch (no extra heading). */
  label: string;
  items: OrderItem[];
};

const BATCH_GAP_MS = 90_000;

function lineTimeMs(item: OrderItem, orderCreatedMs: number): number {
  if (item.addedAt) {
    const t = Date.parse(item.addedAt);
    if (Number.isFinite(t)) return t;
  }
  return orderCreatedMs;
}

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (k >= 11 && k <= 13) return `${n}th`;
  if (j === 1) return `${n}st`;
  if (j === 2) return `${n}nd`;
  if (j === 3) return `${n}rd`;
  return `${n}th`;
}

function makeLabel(batchIndex: number, batchCount: number, minTimeMs: number): string {
  if (batchCount <= 1) return "";
  const timeLabel = format(new Date(minTimeMs), "HH:mm");
  return `${ordinal(batchIndex + 1)} order • ${timeLabel}`;
}

/**
 * Splits order lines into kitchen-visible “fires” / rounds.
 *
 * 1. If any line has `kitchenBatchId`, groups by that id (sorted by earliest line time).
 * 2. Else clusters lines by `addedAt`, splitting when the gap between consecutive
 *    submission times exceeds {@link BATCH_GAP_MS}. Lines without `addedAt` inherit
 *    `order.createdAt`, so they only split when the API sends per-line timestamps.
 */
export function groupOrderItemsForKitchen(order: Order): KitchenItemBatch[] {
  const items = order.items;
  if (items.length === 0) return [];

  const orderCreatedMs = Date.parse(order.createdAt);
  const createdOk = Number.isFinite(orderCreatedMs) ? orderCreatedMs : Date.now();

  const hasBatchId = items.some((it) => it.kitchenBatchId);
  if (hasBatchId) {
    const map = new Map<string, OrderItem[]>();
    for (const it of items) {
      const k = it.kitchenBatchId?.trim() || "__default";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    const entries = [...map.entries()].sort((a, b) => {
      const ta = Math.min(...a[1].map((x) => lineTimeMs(x, createdOk)));
      const tb = Math.min(...b[1].map((x) => lineTimeMs(x, createdOk)));
      return ta - tb;
    });
    const count = entries.length;
    return entries.map(([key, batchItems], idx) => {
      const minT = Math.min(...batchItems.map((x) => lineTimeMs(x, createdOk)));
      return {
        key: `batch:${key}`,
        label: makeLabel(idx, count, minT),
        items: batchItems,
      };
    });
  }

  type Row = { item: OrderItem; t: number };
  const rows: Row[] = items.map((item) => ({
    item,
    t: lineTimeMs(item, createdOk),
  }));
  rows.sort((a, b) => a.t - b.t);

  const clusters: Row[][] = [];
  for (const row of rows) {
    if (clusters.length === 0) {
      clusters.push([row]);
      continue;
    }
    const last = clusters[clusters.length - 1]!;
    const lastMax = Math.max(...last.map((r) => r.t));
    if (row.t - lastMax > BATCH_GAP_MS) clusters.push([row]);
    else last.push(row);
  }

  const count = clusters.length;
  return clusters.map((cluster, idx) => {
    const batchItems = cluster.map((r) => r.item);
    const minT = Math.min(...cluster.map((r) => r.t));
    return {
      key: `time:${minT}:${idx}`,
      label: makeLabel(idx, count, minT),
      items: batchItems,
    };
  });
}
