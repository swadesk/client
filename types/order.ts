export type OrderStatus = "Pending" | "Preparing" | "Ready" | "Completed";
export type OrderChannel = "DINE_IN" | "TAKEAWAY";

/** Kitchen columns only (no Completed on the KDS board). */
export type KitchenBatchStatus = "Pending" | "Preparing" | "Ready";

export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  priceCents: number;
  /** When the API sets this (e.g. on merge), kitchen UI can group “fires” / rounds. */
  addedAt?: string;
  /** Explicit batch id from the API — preferred over time-gap clustering. */
  kitchenBatchId?: string;
  /** Per-line prep column when the API does not send `kitchenBatches[]`. */
  kitchenLineStatus?: KitchenBatchStatus;
};

/** One guest submit / ticket for kitchen — separate status from billing `order.status`. */
export type KitchenBatch = {
  id: string;
  status: KitchenBatchStatus;
  items: OrderItem[];
  label?: string;
  createdAt?: string;
};

export type Order = {
  id: string;
  tableNumber: number;
  status: OrderStatus;
  createdAt: string; // ISO
  channel?: OrderChannel;
  /** Alias for `channel` when mirroring API / analytics naming (DINE_IN | TAKEAWAY). */
  orderChannel?: OrderChannel;
  tableId?: string;
  items: OrderItem[];
  /**
   * When present, KDS uses one card per batch with `batch.status`.
   * Omitted = single-ticket mode using top-level `status` for the whole order.
   */
  kitchenBatches?: KitchenBatch[];
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  couponCode?: string;
  discountCents?: number;
  subtotalCents?: number;
  totalCents?: number;
  billId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  gstAmountCents?: number;
  cgstCents?: number;
  sgstCents?: number;
  taxRatePercent?: number;
  prepaid?: {
    method?: "UPI_BANK" | "ONLINE";
    status?: "PENDING" | "VERIFIED";
    referenceId?: string;
    transactionId?: string;
    amountCents?: number;
  };
  isPrepaid?: boolean;
  prepaidStatus?: "PENDING" | "VERIFIED";
  prepaidReferenceId?: string;
  /** KDS: subtitle under table (e.g. batch label); set on synthetic per-batch card orders. */
  kitchenTicketLabel?: string;
  /** KDS: billing order id when `id` is a per-board synthetic id. */
  kitchenParentOrderId?: string;
};

/** One draggable card on the kitchen board (single batch or whole legacy order). */
export type KitchenBoardUnit = {
  boardId: string;
  orderId: string;
  kitchenBatchId: string;
  status: KitchenBatchStatus;
  tableNumber: number;
  createdAt: string;
  items: OrderItem[];
  batchLabel?: string;
  sourceOrder: Order;
};

