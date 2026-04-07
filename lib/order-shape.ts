import type {
  KitchenBatch,
  KitchenBatchStatus,
  Order,
  OrderItem,
  OrderStatus,
} from "@/types/order";
import { normalizeOrderStatus } from "@/lib/order-status";

function parseKitchenBatchStatus(raw: unknown): KitchenBatchStatus {
  const t = normalizeOrderStatus(raw).toLowerCase();
  if (t === "completed" || t === "complete" || t === "done") return "Ready";
  if (t === "preparing" || t === "in_progress" || t === "in progress") return "Preparing";
  if (t === "ready") return "Ready";
  return "Pending";
}

function parseOrderStatus(raw: unknown): OrderStatus {
  const t = normalizeOrderStatus(raw).toLowerCase();
  if (t === "preparing" || t === "in_progress" || t === "in progress") return "Preparing";
  if (t === "ready") return "Ready";
  if (t === "completed" || t === "complete" || t === "done") return "Completed";
  return "Pending";
}

function coerceTableNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number.parseInt(raw.replace(/\D/g, "") || "0", 10);
    if (Number.isFinite(n) && n > 0) return n;
    const f = Number.parseFloat(raw);
    if (Number.isFinite(f)) return Math.trunc(f);
  }
  return null;
}

function coerceIso(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}

function coerceOptionalIso(raw: unknown): string | undefined {
  const s = coerceIso(raw);
  return s ?? undefined;
}

function coerceQty(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.trunc(raw);
  if (typeof raw === "string" && raw.trim()) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 1;
}

function coercePriceCents(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(raw);
  if (typeof raw === "string" && raw.trim()) {
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return 0;
}

function normalizeOrderLine(raw: unknown, index: number): OrderItem | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  const id =
    (typeof x.id === "string" && x.id.trim()) ||
    (typeof x.lineId === "string" && x.lineId.trim()) ||
    (typeof x.orderLineId === "string" && x.orderLineId.trim()) ||
    `line-${index}-${String(x.menuItemId ?? x.itemId ?? "item")}`;
  const nameRaw =
    x.name ?? x.itemName ?? x.menuItemName ?? x.title ?? x.label;
  const name = typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : "Item";
  const qty = coerceQty(x.qty ?? x.quantity);
  const priceCents = coercePriceCents(
    x.priceCents ?? x.price_cents ?? x.unitPriceCents ?? x.unit_price_cents,
  );
  const addedAt = coerceOptionalIso(
    x.addedAt ?? x.added_at ?? x.lineCreatedAt ?? x.line_created_at ?? x.firedAt ?? x.fired_at,
  );
  const kitchenBatchId =
    (typeof x.kitchenBatchId === "string" && x.kitchenBatchId.trim()) ||
    (typeof x.kitchen_batch_id === "string" && x.kitchen_batch_id.trim()) ||
    (typeof x.fireBatchId === "string" && x.fireBatchId.trim()) ||
    (typeof x.fire_batch_id === "string" && x.fire_batch_id.trim()) ||
    (typeof x.submissionId === "string" && x.submissionId.trim()) ||
    undefined;

  const klsRaw =
    x.kitchenLineStatus ??
    x.kitchen_line_status ??
    x.kitchenStatus ??
    x.kitchen_status ??
    x.prepStatus ??
    x.prep_status;
  const kitchenLineStatus =
    klsRaw !== undefined && klsRaw !== null
      ? parseKitchenBatchStatus(klsRaw)
      : undefined;

  return { id, name, qty, priceCents, addedAt, kitchenBatchId, kitchenLineStatus };
}

function lineLevelConsensus(items: OrderItem[]): KitchenBatchStatus | undefined {
  const sts = items.map((i) => i.kitchenLineStatus).filter(Boolean) as KitchenBatchStatus[];
  if (sts.length === 0) return undefined;
  if (sts.every((s) => s === "Ready")) return "Ready";
  if (sts.some((s) => s === "Preparing")) return "Preparing";
  return "Pending";
}

function inferDerivedBatchStatus(
  batchItems: OrderItem[],
  orderStatus: OrderStatus,
  batchMinTime: number,
  globalEarliest: number,
): KitchenBatchStatus {
  const fromLines = lineLevelConsensus(batchItems);
  if (fromLines) return fromLines;
  if (
    batchMinTime > globalEarliest &&
    (orderStatus === "Ready" || orderStatus === "Preparing")
  ) {
    return "Pending";
  }
  if (orderStatus === "Completed") return "Ready";
  if (orderStatus === "Pending" || orderStatus === "Preparing" || orderStatus === "Ready") {
    return orderStatus;
  }
  return "Pending";
}

function deriveKitchenBatchesFromLineGroups(order: Order): void {
  const groups = new Map<string, OrderItem[]>();
  for (const it of order.items) {
    const k = it.kitchenBatchId?.trim() || "__default";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(it);
  }
  if (groups.size <= 1) return;

  const createdMs = Date.parse(order.createdAt);
  const fallbackTime = Number.isFinite(createdMs) ? createdMs : Date.now();

  const meta = [...groups.entries()].map(([key, batchItems]) => {
    const times = batchItems.map((it) =>
      it.addedAt ? Date.parse(it.addedAt) : fallbackTime,
    );
    const minT = Math.min(...times.filter((t) => Number.isFinite(t)));
    return {
      key,
      batchItems,
      minT: Number.isFinite(minT) ? minT : fallbackTime,
    };
  });
  meta.sort((a, b) => a.minT - b.minT);
  const globalEarliest = meta[0]!.minT;

  order.kitchenBatches = meta.map(({ key, batchItems, minT }) => {
    const id = key === "__default" ? `${order.id}:default` : key;
    return {
      id,
      status: inferDerivedBatchStatus(batchItems, order.status, minT, globalEarliest),
      items: batchItems,
    };
  });
}

function normalizeKitchenBatchEntry(
  raw: unknown,
  allItems: OrderItem[],
  orderCreatedAt: string,
): KitchenBatch | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const id =
    (typeof b.id === "string" && b.id.trim()) ||
    (typeof b.kitchenBatchId === "string" && b.kitchenBatchId.trim()) ||
    (typeof b.batchId === "string" && b.batchId.trim());
  if (!id) return null;
  const status = parseKitchenBatchStatus(b.status ?? b.kitchenStatus);
  let batchItems: OrderItem[] = [];
  const nested = b.items ?? b.lines;
  if (Array.isArray(nested) && nested.length > 0) {
    batchItems = nested
      .map((line, i) => normalizeOrderLine(line, i))
      .filter((it): it is OrderItem => it != null);
  } else {
    batchItems = allItems.filter((it) => it.kitchenBatchId === id);
  }
  if (batchItems.length === 0) return null;
  const label = typeof b.label === "string" && b.label.trim() ? b.label.trim() : undefined;
  const createdAt =
    coerceOptionalIso(b.createdAt ?? b.created_at) ??
    coerceOptionalIso(b.submittedAt ?? b.submitted_at) ??
    orderCreatedAt;
  return { id, status, items: batchItems, label, createdAt };
}

/**
 * Coerces a single API order object into our `Order` shape, including optional
 * per-line `addedAt` / `kitchenBatchId` for kitchen “round” grouping.
 */
export function normalizeOrderRecord(raw: unknown): Order | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id =
    (typeof o.id === "string" && o.id.trim()) ||
    (typeof o.orderId === "string" && o.orderId.trim());
  if (!id) return null;

  let tableNumber = coerceTableNumber(
    o.tableNumber ?? o.table_number ?? o.tableNo ?? o.table_no ?? o.table,
  );
  if (tableNumber == null) {
    const tc = o.tableCode ?? o.table_code;
    if (typeof tc === "string" && tc.trim()) {
      const m = tc.match(/(\d+)/);
      if (m) {
        const n = Number.parseInt(m[1]!, 10);
        if (Number.isFinite(n) && n > 0) tableNumber = n;
      }
    }
  }
  if (tableNumber == null) return null;

  const createdAt = coerceIso(o.createdAt ?? o.created_at ?? o.placedAt ?? o.placed_at);
  if (!createdAt) return null;

  const status = parseOrderStatus(o.status ?? o.state);

  const itemsRaw = o.items ?? o.lines ?? o.orderItems ?? o.order_items;
  const items: OrderItem[] = Array.isArray(itemsRaw)
    ? itemsRaw
        .map((line, i) => normalizeOrderLine(line, i))
        .filter((it): it is OrderItem => it != null)
    : [];

  const order: Order = {
    id,
    tableNumber,
    status,
    createdAt,
    items,
  };

  const batchesRaw = o.kitchenBatches ?? o.kitchen_batches;
  if (Array.isArray(batchesRaw) && batchesRaw.length > 0) {
    const batches = batchesRaw
      .map((br) => normalizeKitchenBatchEntry(br, items, createdAt))
      .filter((b): b is KitchenBatch => b != null);
    if (batches.length > 0) order.kitchenBatches = batches;
  } else {
    deriveKitchenBatchesFromLineGroups(order);
  }

  const ch = o.channel ?? o.orderChannel ?? o.order_channel;
  if (typeof ch === "string" && ch.trim()) {
    const c = ch.trim().toUpperCase();
    if (c === "DINE_IN" || c === "TAKEAWAY") order.channel = c;
  }

  const notes = o.notes;
  if (typeof notes === "string" && notes.trim()) order.notes = notes.trim();

  const cn = o.customerName ?? o.customer_name;
  if (typeof cn === "string" && cn.trim()) order.customerName = cn.trim();
  const cp = o.customerPhone ?? o.customer_phone;
  if (typeof cp === "string" && cp.trim()) order.customerPhone = cp.trim();

  const tableId = o.tableId ?? o.table_id;
  if (typeof tableId === "string" && tableId.trim()) order.tableId = tableId.trim();

  const billId = o.billId ?? o.bill_id;
  if (typeof billId === "string" && billId.trim()) order.billId = billId.trim();

  const pickRound = (a: unknown, b: unknown): unknown =>
    typeof a === "number" && Number.isFinite(a) ? a : b;
  const subtotalRaw = pickRound(o.subtotalCents, o.subtotal_cents);
  if (typeof subtotalRaw === "number") order.subtotalCents = Math.round(subtotalRaw);
  const totalRaw = pickRound(o.totalCents, o.total_cents);
  if (typeof totalRaw === "number") order.totalCents = Math.round(totalRaw);
  const discRaw = pickRound(o.discountCents, o.discount_cents);
  if (typeof discRaw === "number") order.discountCents = Math.round(discRaw);
  const gstRaw = pickRound(o.gstAmountCents, o.gst_amount_cents);
  if (typeof gstRaw === "number") order.gstAmountCents = Math.round(gstRaw);
  const cgstRaw = pickRound(o.cgstCents, o.cgst_cents);
  if (typeof cgstRaw === "number") order.cgstCents = Math.round(cgstRaw);
  const sgstRaw = pickRound(o.sgstCents, o.sgst_cents);
  if (typeof sgstRaw === "number") order.sgstCents = Math.round(sgstRaw);
  const taxRaw = pickRound(o.taxRatePercent, o.tax_rate_percent);
  if (typeof taxRaw === "number") order.taxRatePercent = Math.round(taxRaw);

  const coupon = o.couponCode ?? o.coupon_code;
  if (typeof coupon === "string" && coupon.trim()) order.couponCode = coupon.trim();

  const inv = o.invoiceId ?? o.invoice_id;
  if (typeof inv === "string" && inv.trim()) order.invoiceId = inv.trim();
  const invn = o.invoiceNumber ?? o.invoice_number;
  if (typeof invn === "string" && invn.trim()) order.invoiceNumber = invn.trim();

  if (o.prepaid && typeof o.prepaid === "object") {
    order.prepaid = o.prepaid as Order["prepaid"];
  }

  return order;
}
