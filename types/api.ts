import type { MenuCategory, MenuItem } from "@/types/menu";
import type { InventoryItem } from "@/types/inventory";
import type { Order, OrderStatus } from "@/types/order";
import type { Table, TableStatus } from "@/types/table";
import type { Waiter, WaiterRole, WaiterStatus } from "@/types/waiter";
import type { Invoice } from "@/types/invoice";

export type ApiOk = { ok: true };

/** Full menu payload for staff + QR (scoped by restaurant). */
export type RestaurantMenuResponse = {
  restaurantId: string;
  name: string;
  /** Present when the backend includes venue branding on the public menu payload. */
  logoUrl?: string;
  categories: MenuCategory[];
  items: MenuItem[];
};
export type AdminMenuGetResponse = RestaurantMenuResponse;

export type AdminTablesGetResponse = Table[];

export type AdminCreateTableRequest = {
  restaurantId: string;
  number: number;
  seats: number;
  status: TableStatus;
};
export type AdminCreateTableResponse = Table;

export type AdminAssignTableRequest = {
  restaurantId: string;
  tableId: string;
  waiterId: string | null;
};
export type AdminAssignTableResponse = Table;

export type AdminWaitersGetResponse = Waiter[];

/** `restaurantId` is sent as ?restaurantId= on POST URL. Multipart: name, role, status, assignedTables, optional photo. */
export type AdminCreateWaiterRequest = {
  restaurantId: string;
  name: string;
  role: WaiterRole;
  status: WaiterStatus;
  assignedTables: number;
};
export type AdminCreateWaiterResponse = Waiter;

/** `restaurantId` is sent as ?restaurantId= on PATCH URL; JSON body: waiterId, status. */
export type AdminUpdateWaiterStatusRequest = {
  restaurantId: string;
  waiterId: string;
  status: WaiterStatus;
};
export type AdminUpdateWaiterStatusResponse = Waiter;

export type AdminInventoryGetResponse = InventoryItem[];

export type AdminCreateInventoryItemRequest = {
  restaurantId: string;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
};
export type AdminCreateInventoryItemResponse = InventoryItem;

export type KitchenPendingOrdersGetResponse = Order[];

export type WaiterUpdateOrderRequest = {
  restaurantId: string;
  orderId: string;
  status: Exclude<OrderStatus, "Completed">;
};
export type WaiterUpdateOrderResponse = ApiOk;

export type CustomerPlaceOrderRequest = {
  restaurantId: string;
  /** Table identifier from QR / floor (e.g. `table_01`); backend field name is `tableCode`. */
  tableCode: string;
  idempotencyKey?: string;
  couponCode?: string;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  /**
   * `true` = merge into the table’s open order/bill when the API supports it.
   * The guest app sends this by default; set `NEXT_PUBLIC_OMIT_CUSTOMER_ORDER_MERGE_FLAG=true` to omit the key.
   * See docs/BACKEND_CUSTOMER_ORDER_MERGE.md — merge is enforced server-side.
   */
  mergeIntoOpenSession?: boolean;
  prepaid?: {
    method?: "UPI_BANK" | "ONLINE";
    status?: "PENDING" | "VERIFIED";
    referenceId?: string;
    transactionId?: string;
    amountCents?: number;
  };
  lines: Array<{
    itemId: string;
    qty: number;
  }>;
};
export type CustomerPlaceOrderResponse = ApiOk & {
  orderId: string;
  /** True when lines were merged into an existing open order/bill for this table. */
  merged?: boolean;
  idempotentReplay?: boolean;
};

/** Coupon validation */
export type ValidateCouponRequest = {
  restaurantId: string;
  code: string;
  subtotalCents: number;
};
export type ValidateCouponResponse =
  | { valid: true; discountCents: number; message?: string }
  | { valid: false; message: string };

/** Auth */
export type AuthLoginRequest = { email: string; password: string };
export type AuthLoginResponse = { token: string; user: import("@/types/auth").AuthUser };
export type AuthRegisterRequest = { name: string; email: string; password: string };
export type AuthRegisterResponse = AuthLoginResponse;
export type AuthMeResponse = { user: import("@/types/auth").AuthUser };

/** Restaurants */
export type Restaurant = import("@/types/restaurant").Restaurant;

/** Menu CRUD */
export type AdminCreateCategoryRequest = { restaurantId: string; name: string };
/** Text fields for POST /admin/menu/items (multipart). Optional file field `image` is appended by the client. */
export type AdminCreateItemRequest = {
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  priceCents: number;
  available?: boolean;
};
export type AdminUpdateItemRequest = Partial<
  Pick<import("@/types/menu").MenuItem, "name" | "description" | "priceCents" | "available" | "categoryId">
>;

/** Table status */
export type AdminUpdateTableStatusRequest = {
  restaurantId: string;
  status: import("@/types/table").TableStatus;
};

/** Order complete */
export type WaiterCompleteOrderRequest = { restaurantId: string };

/** Analytics */
export type AnalyticsRevenueResponse = { data: { date: string; revenue: number }[] };
export type AnalyticsTopItemsResponse = { data: { name: string; qty: number }[] };
export type AnalyticsOrdersByHourResponse = { data: { hour: string; orders: number }[] };

/** Settings */
export type RestaurantSettings = {
  autoAcceptQr: boolean;
  notifyOnReady: boolean;
  /** Optional venue UPI details used by guest prepaid UI. */
  prepaidUpiId?: string | null;
  prepaidUpiName?: string | null;
  prepaidUpiQrUrl?: string | null;
};
export type AdminUpdateSettingsRequest = {
  restaurantId: string;
  autoAcceptQr?: boolean;
  notifyOnReady?: boolean;
  prepaidUpiId?: string | null;
  prepaidUpiName?: string | null;
  prepaidUpiQrUrl?: string | null;
};

/** Inventory update */
export type AdminUpdateInventoryItemRequest = {
  quantity?: number;
  minQuantity?: number;
};

/** Bill split */
export type BillPart = import("@/types/bill").BillPart;
export type AdminOrderSplitRequest = {
  restaurantId: string;
  mode: "by_item" | "evenly" | "custom";
  parts?: BillPart[];
};
export type AdminOrderSplitResponse = { bills: BillPart[] };

/** Payments */
export type PaymentMode = import("@/types/payment").PaymentMode;
export type Payment = import("@/types/payment").Payment;
export type AdminOrderPaymentRequest = {
  restaurantId: string;
  amountCents: number;
  mode: PaymentMode;
};

/** Billing + invoice management */
export type CreateBillFromOrderRequest = {
  restaurantId: string;
  orderId: string;
};
export type CreateBillFromOrderResponse = {
  bill: import("@/types/bill").Bill;
  invoice?: Invoice | null;
};

export type CreateTableInvoiceRequest = {
  restaurantId: string;
  tableId: string;
};
export type CreateTableInvoiceResponse = {
  bill: import("@/types/bill").Bill;
  invoice: Invoice;
};

export type BillingListQuery = {
  status?: "OPEN" | "PARTIAL" | "PAID";
  channel?: "DINE_IN" | "TAKEAWAY";
  from?: string;
  to?: string;
};
export type BillingListRow = {
  bill: import("@/types/bill").Bill;
  invoice?: Invoice | null;
};
export type BillingListResponse = BillingListRow[];

/** PATCH /api/billing/bill/:billId/customer — see docs/BACKEND_BILLING_CUSTOMER_NOTIFICATIONS.md */
export type UpdateBillCustomerRequest = {
  restaurantId: string;
  billId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  notifyEmail?: boolean;
  notifyWhatsapp?: boolean;
};

export type BillingTableLatestInvoiceResponse = {
  invoice: Invoice | null;
};

export type ApiErrorShape = {
  success?: boolean;
  message: string;
  errorCode?: string;
};
