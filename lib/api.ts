import { getApiAccessToken, setApiAccessToken } from "@/lib/api-access-token";
import { getApiOrigin } from "@/lib/api-origin";

export type ApiError = {
  message: string;
  status?: number;
  success?: boolean;
  errorCode?: string;
};

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  if (!("message" in body)) return null;
  const msg = (body as { message?: unknown }).message;
  if (typeof msg === "string") return msg;
  if (Array.isArray(msg) && msg.every((x): x is string => typeof x === "string")) {
    return msg.join("; ");
  }
  return null;
}

function getErrorCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("errorCode" in body)) return undefined;
  const code = (body as { errorCode?: unknown }).errorCode;
  return typeof code === "string" && code.trim() ? code : undefined;
}

function resolveApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const origin = getApiOrigin();
  if (!origin) return path;
  if (path.startsWith("/api/qr/")) return path;
  return `${origin}${path}`;
}

function pathnameOnly(input: string): string {
  try {
    if (input.startsWith("http://") || input.startsWith("https://")) {
      return new URL(input).pathname;
    }
  } catch {
    /* fall through */
  }
  return input.split("?")[0];
}

function isPublicApiPath(path: string): boolean {
  const p = pathnameOnly(path);
  if (p === "/public/contact-sales" || p === "/api/public/contact-sales") return true;
  if (
    p === "/api/auth/login" ||
    p === "/api/auth/register" ||
    p === "/api/auth/refresh" ||
    p === "/api/auth/forgot-password" ||
    p === "/api/auth/reset-password"
  )
    return true;
  if (p === "/api/customer/order" || p === "/api/customer/coupons/validate")
    return true;
  if (p.startsWith("/api/qr/menu/")) return true;
  return false;
}

/** After 401, try cookie refresh once and retry (expired access JWT + valid refresh cookie). */
function shouldAttemptRefreshAfter401(resolvedUrl: string): boolean {
  const p = pathnameOnly(resolvedUrl);
  if (p === "/api/auth/refresh") return false;
  if (
    p === "/api/auth/login" ||
    p === "/api/auth/register" ||
    p === "/api/auth/forgot-password" ||
    p === "/api/auth/reset-password"
  )
    return false;
  if (isPublicApiPath(resolvedUrl)) return false;
  return true;
}

async function fetchNewAccessTokenFromRefreshCookie(): Promise<string | null> {
  const url = resolveApiUrl("/api/auth/refresh");
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) return null;
  const body = await parseJsonSafe(res);
  if (!body || typeof body !== "object" || !("token" in body)) return null;
  const token = (body as { token?: unknown }).token;
  return typeof token === "string" ? token : null;
}

function clientUrlBase(): string {
  const o = getApiOrigin();
  if (o) return o;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function buildAdminUrl(
  path: string,
  restaurantId: string,
  extra?: Record<string, string | undefined>,
): string {
  const url = new URL(path, `${clientUrlBase()}/`);
  url.searchParams.set("restaurantId", restaurantId);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v != null && v !== "") url.searchParams.set(k, v);
    }
  }
  return resolveApiUrl(url.pathname + url.search);
}

function buildUrl(path: string, extra?: Record<string, string | undefined>): string {
  const url = new URL(path, `${clientUrlBase()}/`);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v != null && v !== "") url.searchParams.set(k, v);
    }
  }
  return resolveApiUrl(url.pathname + url.search);
}

export async function apiFetch<T>(
  input: string,
  init?: RequestInit & { signal?: AbortSignal },
  allowRefreshRetry = true,
): Promise<T> {
  const url = resolveApiUrl(input);
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has("Content-Type")) {
    if (typeof init.body === "string") {
      headers.set("Content-Type", "application/json");
    }
    // FormData / Blob: omit Content-Type so the browser sets multipart boundaries.
  }
  if (!isPublicApiPath(url)) {
    const token = getApiAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers,
  });

  if (res.status === 401 && allowRefreshRetry && shouldAttemptRefreshAfter401(url)) {
    const newToken = await fetchNewAccessTokenFromRefreshCookie();
    if (newToken) {
      setApiAccessToken(newToken);
      return apiFetch<T>(input, init, false);
    }
  }

  if (!res.ok) {
    const body = await parseJsonSafe(res);
    const err: ApiError = {
      success: body && typeof body === "object" && "success" in body
        ? Boolean((body as { success?: unknown }).success)
        : undefined,
      message: getErrorMessage(body) ?? `Request failed (${res.status})`,
      status: res.status,
      errorCode: getErrorCode(body),
    };
    throw err;
  }

  const body = await parseJsonSafe(res);
  if (body && typeof body === "object" && "success" in body && (body as { success?: unknown }).success === false) {
    const err: ApiError = {
      success: false,
      status: res.status,
      message: getErrorMessage(body) ?? `Request failed (${res.status})`,
      errorCode: getErrorCode(body),
    };
    throw err;
  }
  return body as T;
}

function withRestaurantId(path: string, restaurantId: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}restaurantId=${encodeURIComponent(restaurantId)}`;
}

export const api = {
  public: {
    contactSalesPath: () => {
      const origin = getApiOrigin();
      return origin?.endsWith("/api") ? "/public/contact-sales" : "/api/public/contact-sales";
    },
    contactSales: (payload: {
      fullName: string;
      workEmail: string;
      phone: string;
      companyName: string;
      role: string;
      timeline: string;
      city?: string;
      country?: string;
      monthlyOrders?: number;
      currentPos?: string;
      message?: string;
      leadSource?: string;
      submittedAt?: string;
    }) =>
      apiFetch<{ success?: boolean; message?: string }>(api.public.contactSalesPath(), {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  uploads: {
    /** POST /api/uploads/image — field name `file` (standalone upload; menu/waiters use multipart admin routes). */
    image: (file: File, restaurantId: string) => {
      const body = new FormData();
      body.append("file", file);
      return apiFetch<{ url: string }>(
        withRestaurantId("/api/uploads/image", restaurantId),
        {
          method: "POST",
          body,
        },
      );
    },
  },
  auth: {
    login: (payload: import("@/types/api").AuthLoginRequest) =>
      apiFetch<import("@/types/api").AuthLoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    register: (payload: import("@/types/api").AuthRegisterRequest) =>
      apiFetch<import("@/types/api").AuthRegisterResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    refresh: () =>
      apiFetch<import("@/types/auth").AuthRefreshResponse>("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    me: () =>
      apiFetch<import("@/types/api").AuthMeResponse>("/api/auth/me", {
        method: "GET",
      }),
    updateMe: (payload: { name?: string; photoUrl?: string | null }) =>
      apiFetch<import("@/types/api").AuthMeResponse>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    /** Multipart: text fields + optional `logo` file (logoUrl ignored if logo is sent). */
    bootstrapRestaurant: (
      payload: import("@/types/auth").BootstrapRestaurantRequest & { logo?: File | null },
    ) => {
      const fd = new FormData();
      fd.append("name", payload.name);
      if (payload.legalName) fd.append("legalName", payload.legalName);
      if (payload.address) fd.append("address", payload.address);
      if (payload.gstin) fd.append("gstin", payload.gstin);
      if (payload.phone) fd.append("phone", payload.phone);
      if (payload.description) fd.append("description", payload.description);
      if (payload.logo) fd.append("logo", payload.logo);
      return apiFetch<import("@/types/api").AuthLoginResponse>("/api/auth/bootstrap-restaurant", {
        method: "POST",
        body: fd,
      });
    },
    forgotPassword: (payload: import("@/types/auth").AuthForgotPasswordRequest) =>
      apiFetch<import("@/types/auth").AuthForgotPasswordResponse>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    resetPassword: (payload: import("@/types/auth").AuthResetPasswordRequest) =>
      apiFetch<import("@/types/auth").AuthResetPasswordResponse>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    joinRestaurant: (payload: import("@/types/auth").JoinRestaurantRequest) =>
      apiFetch<import("@/types/api").AuthLoginResponse>("/api/auth/join-restaurant", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  superAdmin: {
    users: (params?: import("@/types/auth").SuperAdminUsersQuery) =>
      apiFetch<import("@/types/auth").SuperAdminUsersResponse>(
        buildUrl("/api/super-admin/users", {
          limit: params?.limit != null ? String(params.limit) : undefined,
          offset: params?.offset != null ? String(params.offset) : undefined,
          globalRole: params?.globalRole,
        }),
        { method: "GET" },
      ),
    pendingRestaurants: () =>
      apiFetch<import("@/types/api").Restaurant[]>("/api/super-admin/restaurants/pending", {
        method: "GET",
      }),
    approveRestaurant: (restaurantId: string) =>
      apiFetch<{ token: string; user?: import("@/types/auth").AuthUser }>(
        `/api/super-admin/restaurants/${restaurantId}/approve`,
        { method: "POST", body: JSON.stringify({}) },
      ),
    rejectRestaurant: (restaurantId: string, body?: { reason?: string }) =>
      apiFetch<{ ok: true }>(
        `/api/super-admin/restaurants/${restaurantId}/reject`,
        { method: "POST", body: JSON.stringify(body ?? {}) },
      ),
    createEmployee: (
      restaurantId: string,
      payload: import("@/types/auth").CreateMemberBody,
    ) =>
      apiFetch<import("@/types/auth").CreateMemberResponse>(
        `/api/super-admin/restaurants/${restaurantId}/employees`,
        { method: "POST", body: JSON.stringify(payload) },
      ),
    restaurantMembers: (restaurantId: string) =>
      apiFetch<import("@/types/auth").SuperAdminMemberRow[]>(
        `/api/super-admin/restaurants/${restaurantId}/members`,
        { method: "GET" },
      ),
    restaurantWaiters: (restaurantId: string) =>
      apiFetch<import("@/types/api").AdminWaitersGetResponse>(
        `/api/super-admin/restaurants/${restaurantId}/waiters`,
        { method: "GET" },
      ),
  },
  restaurants: {
    list: () =>
      apiFetch<import("@/types/api").Restaurant[]>("/api/restaurants", {
        method: "GET",
      }),
    get: (id: string) =>
      apiFetch<import("@/types/api").Restaurant>(`/api/restaurants/${id}`, {
        method: "GET",
      }),
    create: (data: { name: string; address?: string; gstin?: string }) =>
      apiFetch<import("@/types/api").Restaurant>("/api/restaurants", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<import("@/types/api").Restaurant>) =>
      apiFetch<import("@/types/api").Restaurant>(`/api/restaurants/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    /** GET /api/restaurants/:restaurantId/members — Admin/Manager + venue access */
    members: (restaurantId: string) =>
      apiFetch<import("@/types/auth").RestaurantMemberRow[]>(
        `/api/restaurants/${restaurantId}/members`,
        { method: "GET" },
      ),
    /** POST /api/restaurants/:restaurantId/members — JSON body; omit photoUrl or use https URL only */
    createMember: (
      restaurantId: string,
      payload: import("@/types/auth").CreateMemberBody,
    ) =>
      apiFetch<import("@/types/auth").CreateMemberResponse>(
        `/api/restaurants/${restaurantId}/members`,
        { method: "POST", body: JSON.stringify(payload) },
      ),
    /**
     * Removes venue membership + frees the email for this restaurant when the backend implements it.
     * Recommended: alternatively cascade-remove membership inside `DELETE /api/admin/waiters/:id`.
     */
    deleteMember: (restaurantId: string, userId: string) =>
      apiFetch<void>(`/api/restaurants/${restaurantId}/members/${userId}`, {
        method: "DELETE",
      }),
  },
  /** Guest QR page: Next.js route may proxy to backend (see app/api/qr/menu). */
  qrMenu: (restaurantId: string) =>
    apiFetch<import("@/types/api").AdminMenuGetResponse>(`/api/qr/menu/${restaurantId}`, {
      method: "GET",
    }),
  customer: {
    placeOrder: (payload: import("@/types/api").CustomerPlaceOrderRequest) =>
      apiFetch<import("@/types/api").CustomerPlaceOrderResponse>(
        "/api/customer/order",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
    validateCoupon: (payload: import("@/types/api").ValidateCouponRequest) =>
      apiFetch<import("@/types/api").ValidateCouponResponse>(
        "/api/customer/coupons/validate",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
  },
  billing: {
    create: (payload: { restaurantId: string; tableId: string }) =>
      apiFetch<import("@/types/bill").Bill>("/api/billing/create", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    split: (payload: {
      restaurantId: string;
      billId: string;
      mode: import("@/types/bill").BillSplitMode;
      parts?: import("@/types/bill").BillSplitPartInput[];
    }) =>
      apiFetch<{ bills: import("@/types/bill").BillPart[] }>("/api/billing/split", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    pay: (payload: {
      restaurantId: string;
      billId: string;
      amountCents: number;
      mode: import("@/types/payment").PaymentMode;
    }) =>
      apiFetch<import("@/types/payment").Payment>("/api/billing/pay", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    byTable: (restaurantId: string, tableId: string) =>
      apiFetch<import("@/types/bill").BillingTableResponse>(
        buildUrl(`/api/billing/${tableId}`, { restaurantId }),
        { method: "GET" },
      ),
    fromOrder: (payload: import("@/types/api").CreateBillFromOrderRequest) =>
      apiFetch<import("@/types/api").CreateBillFromOrderResponse>("/api/billing/from-order", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    createTableInvoice: (payload: import("@/types/api").CreateTableInvoiceRequest) =>
      apiFetch<import("@/types/api").CreateTableInvoiceResponse>(
        `/api/billing/table/${payload.tableId}/invoice`,
        {
          method: "POST",
          body: JSON.stringify({ restaurantId: payload.restaurantId }),
        },
      ),
    latestTableInvoice: (restaurantId: string, tableId: string) =>
      apiFetch<import("@/types/api").BillingTableLatestInvoiceResponse>(
        buildUrl(`/api/billing/table/${tableId}/invoice/latest`, { restaurantId }),
        { method: "GET" },
      ),
    list: (restaurantId: string, query?: import("@/types/api").BillingListQuery) =>
      apiFetch<import("@/types/api").BillingListResponse>(
        buildUrl("/api/billing", {
          restaurantId,
          status: query?.status,
          channel: query?.channel,
          from: query?.from,
          to: query?.to,
        }),
        { method: "GET" },
      ),
    /** Persist customer contact on a bill. */
    updateBillCustomer: (payload: import("@/types/api").UpdateBillCustomerRequest) =>
      apiFetch<import("@/types/bill").Bill>(
        buildUrl(`/api/billing/bill/${payload.billId}/customer`, {
          restaurantId: payload.restaurantId,
        }),
        {
          method: "PATCH",
          body: JSON.stringify({
            customerName: payload.customerName,
            customerPhone: payload.customerPhone,
            customerEmail: payload.customerEmail,
            ...(payload.notifyEmail !== undefined ? { notifyEmail: payload.notifyEmail } : {}),
            ...(payload.notifyWhatsapp !== undefined
              ? { notifyWhatsapp: payload.notifyWhatsapp }
              : {}),
          }),
        },
      ),
  },
  invoices: {
    get: (restaurantId: string, invoiceId: string) =>
      apiFetch<import("@/types/invoice").Invoice>(
        buildUrl(`/api/invoices/${invoiceId}`, { restaurantId }),
        { method: "GET" },
      ),
  },
  kitchen: {
    /** Narrow queue; some backends only return `Pending` here. Prefer `orders` when available. */
    pendingOrders: (restaurantId: string) =>
      apiFetch<import("@/types/api").KitchenPendingOrdersGetResponse>(
        withRestaurantId("/api/kitchen/orders/pending", restaurantId),
        { method: "GET" },
      ),
    /** Full kitchen/floor queue (Pending, Preparing, Ready, …). Backend: `GET /api/kitchen/orders?restaurantId=`. */
    orders: (restaurantId: string) =>
      apiFetch<import("@/types/api").KitchenPendingOrdersGetResponse>(
        withRestaurantId("/api/kitchen/orders", restaurantId),
        { method: "GET" },
      ),
  },
  waiter: {
    /** Optional: resolves floor waiter profile id for table assignment (`Table.waiterId`). */
    me: (restaurantId: string) =>
      apiFetch<import("@/types/api").WaiterMeResponse>(
        withRestaurantId("/api/waiter/me", restaurantId),
        { method: "GET" },
      ),
    /** Floor staff table list (avoids 403 on GET /api/admin/tables for Waiter). */
    tables: (restaurantId: string) =>
      apiFetch<import("@/types/api").AdminTablesGetResponse>(
        withRestaurantId("/api/waiter/tables", restaurantId),
        { method: "GET" },
      ),
    updateOrder: (payload: import("@/types/api").WaiterUpdateOrderRequest) =>
      apiFetch<import("@/types/api").WaiterUpdateOrderResponse>("/api/waiter/order", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    completeOrder: (restaurantId: string, orderId: string) =>
      apiFetch<{ ok: true }>(`/api/waiter/order/${orderId}/complete`, {
        method: "POST",
        body: JSON.stringify({ restaurantId }),
      }),
  },
  admin: {
    menu: (restaurantId: string) =>
      apiFetch<import("@/types/api").AdminMenuGetResponse>(
        withRestaurantId("/api/admin/menu", restaurantId),
        { method: "GET" },
      ),
    createCategory: (payload: import("@/types/api").AdminCreateCategoryRequest) =>
      apiFetch<import("@/types/menu").MenuCategory>(
        withRestaurantId("/api/admin/menu/categories", payload.restaurantId),
        {
          method: "POST",
          body: JSON.stringify({
            restaurantId: payload.restaurantId,
            name: payload.name,
          }),
        },
      ),
    updateCategory: (payload: import("@/types/api").AdminUpdateCategoryRequest) =>
      apiFetch<import("@/types/menu").MenuCategory>(
        withRestaurantId(
          `/api/admin/menu/categories/${payload.categoryId}`,
          payload.restaurantId,
        ),
        {
          method: "PATCH",
          body: JSON.stringify({
            restaurantId: payload.restaurantId,
            name: payload.name,
          }),
        },
      ),
    deleteCategory: (restaurantId: string, categoryId: string) =>
      apiFetch<void>(
        withRestaurantId(`/api/admin/menu/categories/${categoryId}`, restaurantId),
        { method: "DELETE" },
      ),
    createMenuItem: (
      payload: import("@/types/api").AdminCreateItemRequest & { image?: File | null },
    ) => {
      const fd = new FormData();
      fd.append("categoryId", payload.categoryId);
      fd.append("name", payload.name);
      if (payload.description) fd.append("description", payload.description);
      fd.append("priceCents", String(payload.priceCents));
      fd.append("available", String(payload.available ?? true));
      if (payload.image) fd.append("image", payload.image);
      return apiFetch<import("@/types/menu").MenuItem>(
        withRestaurantId("/api/admin/menu/items", payload.restaurantId),
        {
          method: "POST",
          body: fd,
        },
      );
    },
    updateMenuItem: (
      restaurantId: string,
      itemId: string,
      payload: Partial<
        import("@/types/api").AdminUpdateItemRequest & { image?: File | null }
      >,
    ) => {
      const url = withRestaurantId(`/api/admin/menu/items/${itemId}`, restaurantId);
      if (payload.image) {
        const fd = new FormData();
        if (payload.name !== undefined) fd.append("name", payload.name);
        if (payload.description !== undefined) fd.append("description", payload.description ?? "");
        if (payload.priceCents !== undefined) fd.append("priceCents", String(payload.priceCents));
        if (payload.available !== undefined) fd.append("available", String(payload.available));
        if (payload.categoryId !== undefined) fd.append("categoryId", payload.categoryId);
        fd.append("image", payload.image);
        return apiFetch<import("@/types/menu").MenuItem>(url, { method: "PATCH", body: fd });
      }
      const body: Record<string, unknown> = {};
      if (payload.name !== undefined) body.name = payload.name;
      if (payload.description !== undefined) body.description = payload.description;
      if (payload.priceCents !== undefined) body.priceCents = payload.priceCents;
      if (payload.available !== undefined) body.available = payload.available;
      if (payload.categoryId !== undefined) body.categoryId = payload.categoryId;
      return apiFetch<import("@/types/menu").MenuItem>(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    deleteMenuItem: (restaurantId: string, itemId: string) =>
      apiFetch<void>(
        withRestaurantId(`/api/admin/menu/items/${itemId}`, restaurantId),
        { method: "DELETE" },
      ),
    tables: (restaurantId: string) =>
      apiFetch<import("@/types/api").AdminTablesGetResponse>(
        withRestaurantId("/api/admin/tables", restaurantId),
        { method: "GET" },
      ),
    /** GET /api/admin/waiters?restaurantId=… */
    waiters: (restaurantId: string) =>
      apiFetch<import("@/types/api").AdminWaitersGetResponse>(
        withRestaurantId("/api/admin/waiters", restaurantId),
        { method: "GET" },
      ),
    inventory: (restaurantId: string) =>
      apiFetch<import("@/types/api").AdminInventoryGetResponse>(
        withRestaurantId("/api/admin/inventory", restaurantId),
        { method: "GET" },
      ),
    createTable: (payload: import("@/types/api").AdminCreateTableRequest) =>
      apiFetch<import("@/types/api").AdminCreateTableResponse>("/api/admin/tables", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    assignTableToWaiter: (payload: import("@/types/api").AdminAssignTableRequest) =>
      apiFetch<import("@/types/api").AdminAssignTableResponse>("/api/admin/tables", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    updateTableStatus: (
      restaurantId: string,
      tableId: string,
      payload: import("@/types/api").AdminUpdateTableStatusRequest,
    ) =>
      apiFetch<import("@/types/table").Table>(
        `/api/admin/tables/${tableId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ ...payload, restaurantId }),
        },
      ),
    deleteTable: (restaurantId: string, tableId: string) =>
      apiFetch<import("@/types/api").ApiOk>(
        withRestaurantId(`/api/admin/tables/${tableId}`, restaurantId),
        { method: "DELETE" },
      ),
    deleteWaiter: (restaurantId: string, waiterId: string) =>
      apiFetch<import("@/types/api").ApiOk>(
        withRestaurantId(`/api/admin/waiters/${waiterId}`, restaurantId),
        { method: "DELETE" },
      ),
    deleteOrder: (restaurantId: string, orderId: string) =>
      apiFetch<import("@/types/api").ApiOk>(
        withRestaurantId(`/api/admin/orders/${orderId}`, restaurantId),
        { method: "DELETE" },
      ),
    orders: (
      restaurantId: string,
      params?: { from?: string; to?: string; status?: string },
    ) =>
      apiFetch<import("@/types/order").Order[]>(
        buildAdminUrl("/api/admin/orders", restaurantId, {
          from: params?.from,
          to: params?.to,
          status: params?.status,
        }),
        { method: "GET" },
      ),
    analytics: {
      revenue: (restaurantId: string, from?: string, to?: string) =>
        apiFetch<import("@/types/api").AnalyticsRevenueResponse>(
          buildAdminUrl("/api/admin/analytics/revenue", restaurantId, { from, to }),
          { method: "GET" },
        ),
      topItems: (restaurantId: string, from?: string, to?: string, limit?: number) =>
        apiFetch<import("@/types/api").AnalyticsTopItemsResponse>(
          buildAdminUrl("/api/admin/analytics/top-items", restaurantId, {
            from,
            to,
            limit: limit != null ? String(limit) : undefined,
          }),
          { method: "GET" },
        ),
      ordersByHour: (restaurantId: string, date?: string) =>
        apiFetch<import("@/types/api").AnalyticsOrdersByHourResponse>(
          buildAdminUrl("/api/admin/analytics/orders-by-hour", restaurantId, { date }),
          { method: "GET" },
        ),
    },
    settings: (restaurantId: string) =>
      apiFetch<import("@/types/api").RestaurantSettings>(
        withRestaurantId("/api/admin/settings", restaurantId),
        { method: "GET" },
      ),
    updateSettings: (payload: import("@/types/api").AdminUpdateSettingsRequest) =>
      apiFetch<import("@/types/api").RestaurantSettings>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    /** POST /api/admin/waiters?restaurantId=… (multipart body: name, role, status, assignedTables, optional photo) */
    createWaiter: (
      payload: import("@/types/api").AdminCreateWaiterRequest & { photo?: File | null },
    ) => {
      const fd = new FormData();
      fd.append("name", payload.name);
      fd.append("role", payload.role);
      fd.append("status", payload.status);
      fd.append("assignedTables", String(payload.assignedTables));
      if (payload.photo) fd.append("photo", payload.photo);
      return apiFetch<import("@/types/api").AdminCreateWaiterResponse>(
        withRestaurantId("/api/admin/waiters", payload.restaurantId),
        {
          method: "POST",
          body: fd,
        },
      );
    },
    /** PATCH /api/admin/waiters?restaurantId=… */
    updateWaiterStatus: (payload: import("@/types/api").AdminUpdateWaiterStatusRequest) =>
      apiFetch<import("@/types/api").AdminUpdateWaiterStatusResponse>(
        withRestaurantId("/api/admin/waiters", payload.restaurantId),
        {
          method: "PATCH",
          body: JSON.stringify({
            waiterId: payload.waiterId,
            status: payload.status,
          }),
        },
      ),
    createInventoryItem: (payload: import("@/types/api").AdminCreateInventoryItemRequest) =>
      apiFetch<import("@/types/api").AdminCreateInventoryItemResponse>(
        "/api/admin/inventory",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
    updateInventoryItem: (
      restaurantId: string,
      itemId: string,
      payload: import("@/types/api").AdminUpdateInventoryItemRequest,
    ) =>
      apiFetch<import("@/types/inventory").InventoryItem>(
        withRestaurantId(`/api/admin/inventory/${itemId}`, restaurantId),
        { method: "PATCH", body: JSON.stringify(payload) },
      ),
    deleteInventoryItem: (restaurantId: string, itemId: string) =>
      apiFetch<void>(
        withRestaurantId(`/api/admin/inventory/${itemId}`, restaurantId),
        { method: "DELETE" },
      ),
    orderBills: (restaurantId: string, orderId: string) =>
      apiFetch<import("@/types/bill").BillPart[]>(
        withRestaurantId(`/api/admin/orders/${orderId}/bills`, restaurantId),
        { method: "GET" },
      ),
    orderSplit: (orderId: string, payload: import("@/types/api").AdminOrderSplitRequest) =>
      apiFetch<import("@/types/api").AdminOrderSplitResponse>(
        `/api/admin/orders/${orderId}/split`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
    orderPayments: (restaurantId: string, orderId: string) =>
      apiFetch<import("@/types/payment").Payment[]>(
        withRestaurantId(`/api/admin/orders/${orderId}/payments`, restaurantId),
        { method: "GET" },
      ),
    addOrderPayment: (
      orderId: string,
      payload: import("@/types/api").AdminOrderPaymentRequest,
    ) =>
      apiFetch<import("@/types/payment").Payment>(
        `/api/admin/orders/${orderId}/payments`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
    completeOrderPayment: (restaurantId: string, orderId: string) =>
      apiFetch<{ ok: true }>(
        `/api/admin/orders/${orderId}/complete-payment`,
        {
          method: "PATCH",
          body: JSON.stringify({ restaurantId }),
        },
      ),
  },
};
