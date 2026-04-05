export type BillSplitMode = "by_item" | "evenly" | "custom";
export type BillSourceType = "ORDER" | "TABLE" | "TAKEAWAY";

export type BillStatus = "OPEN" | "PARTIAL" | "PAID";

export type BillItem = {
  id: string;
  name: string;
  qty: number;
  priceCents: number;
  totalCents: number;
};

export type Bill = {
  id: string;
  /** Present when API includes it; some list endpoints return bill-only shapes. */
  restaurantId?: string;
  tableId: string;
  /** When set (e.g. from API), preferred for display over resolving from table list. */
  tableNumber?: number | null;
  orderId?: string | null;
  sourceType?: BillSourceType;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  channel?: import("@/types/invoice").InvoiceChannel;
  status: BillStatus;
  totalCents: number;
  paidCents: number;
  dueCents: number;
  createdAt?: string;
  updatedAt?: string;
  customerName?: string;
  customerPhone?: string;
  /** For receipt / invoice email; backend may use for notifications. */
  customerEmail?: string | null;
  /** Staff preferences: enqueue email copy of invoice when backend supports it. */
  notifyEmail?: boolean;
  /** Staff preferences: enqueue WhatsApp when backend supports it. */
  notifyWhatsapp?: boolean;
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
  items: BillItem[];
};

export type BillPart = {
  id: string;
  /** Table billing split (`/api/billing/split`) returns `orderId` (compat with admin order split). */
  orderId?: string;
  billId?: string;
  items: { orderItemId: string; qty: number }[];
  amountCents: number;
  paidCents?: number;
  paymentMode?: string;
};

export type BillSplitPartInput = {
  amountCents?: number;
  items?: { orderItemId: string; qty: number }[];
};

export type BillingTableResponse = {
  bill: Bill | null;
  payments: import("@/types/payment").Payment[];
  invoice?: import("@/types/invoice").Invoice | null;
};
