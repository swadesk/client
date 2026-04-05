export type InvoiceChannel = "DINE_IN" | "TAKEAWAY";

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "VOID";

export type InvoiceLineItem = {
  id: string;
  name: string;
  qty: number;
  priceCents: number;
  totalCents?: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  restaurantId: string;
  billId?: string | null;
  orderId?: string | null;
  channel?: InvoiceChannel;
  status?: InvoiceStatus;
  tableId?: string | null;
  tableNumber?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  notes?: string | null;
  createdAt: string;
  subtotalCents: number;
  discountCents?: number;
  couponCode?: string;
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
  totalCents: number;
  items: InvoiceLineItem[];
};
