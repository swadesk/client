export type OrderStatus = "Pending" | "Preparing" | "Ready" | "Completed";
export type OrderChannel = "DINE_IN" | "TAKEAWAY";

export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  priceCents: number;
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
};

