export type PaymentMode = "Cash" | "Card" | "UPI" | "Other";

export type Payment = {
  id: string;
  orderId?: string;
  billId?: string;
  amountCents: number;
  mode: PaymentMode;
  status: "pending" | "completed" | "failed";
  createdAt: string;
};
