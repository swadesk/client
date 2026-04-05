"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { VenueBrandingLogo } from "@/components/branding/venue-branding-logo";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCartStore } from "@/store/cart-store";
import { QrMenuItemRow } from "@/components/features/qr/menu-item-row";
import { CartDrawer } from "@/components/features/qr/cart-drawer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { qk } from "@/lib/query-keys";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryState, QrMenuSkeleton } from "@/components/shared/query-state";
import { cn } from "@/lib/utils";
import { normalizeAdminMenuPayload } from "@/lib/menu-normalize";
import { filterCategoriesForQrMenu, filterItemsForQrMenu } from "@/lib/qr-menu-guest";
import { UtensilsCrossed } from "lucide-react";

type QrTableOption = {
  id: string;
  label: string;
  /** Sent as `tableCode` on `POST /api/customer/order` (short code, id, or number—whatever the menu row provides). */
  tableCode: string;
};

function formatTableLabelFromId(id: string): string {
  const t = id.trim();
  if (t.toLowerCase() === "takeaway" || t.toLowerCase() === "non-table") {
    return "Takeaway / Non-table";
  }
  const padded = /^table_(\d+)$/i.exec(t);
  if (padded) {
    const n = Number.parseInt(padded[1], 10);
    return Number.isFinite(n) ? `Table ${n}` : `Table ${t}`;
  }
  if (/^[0-9a-f-]{36}$/i.test(t)) {
    return `Table (${t.slice(0, 8)}…)`;
  }
  return `Table ${t}`;
}

function parseTableOptions(payload: unknown): QrTableOption[] {
  if (!payload || typeof payload !== "object" || !("tables" in payload)) return [];
  const raw = (payload as { tables?: unknown }).tables;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((t) => {
      if (!t || typeof t !== "object") return null;
      const obj = t as {
        id?: unknown;
        tableId?: unknown;
        code?: unknown;
        number?: unknown;
        label?: unknown;
        name?: unknown;
        title?: unknown;
        displayName?: unknown;
        tableName?: unknown;
      };
      const rawId = [obj.id, obj.tableId].find(
        (v) => typeof v === "string" && String(v).trim(),
      ) as string | undefined;
      const rawCode =
        typeof obj.code === "string" && obj.code.trim() ? obj.code.trim() : undefined;
      const numberCandidate = typeof obj.number === "number" ? obj.number : null;
      if (!rawId && !rawCode && numberCandidate == null) return null;
      /** Stable row key for the picker (prefer real id for QR deep-links). */
      const id = rawId ?? rawCode ?? String(numberCandidate);
      /** Value the backend resolves for dining tables (often matches `code` or number, not internal id). */
      const tableCode = rawCode ?? rawId ?? String(numberCandidate);
      const labelText =
        [obj.label, obj.name, obj.title, obj.displayName, obj.tableName].find(
          (v) => typeof v === "string" && String(v).trim(),
        ) ??
        (numberCandidate != null ? `Table ${numberCandidate}` : formatTableLabelFromId(id));
      return { id, label: String(labelText), tableCode };
    })
    .filter((v): v is QrTableOption => Boolean(v));
}

export default function QrMenuPage() {
  const params = useParams<{ restaurantId: string; tableId: string }>();
  const restaurantId = params.restaurantId;
  const tableId = params.tableId;
  const [selectedTableId, setSelectedTableId] = React.useState(tableId);

  const setContext = useCartStore((s) => s.setContext);
  const clearCart = useCartStore((s) => s.clear);
  const prevRestaurantRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    setSelectedTableId(tableId);
  }, [tableId]);

  React.useLayoutEffect(() => {
    if (prevRestaurantRef.current !== null && prevRestaurantRef.current !== restaurantId) {
      const { lines } = useCartStore.getState();
      if (lines.length > 0) clearCart();
    }
    prevRestaurantRef.current = restaurantId;
    setContext(restaurantId, selectedTableId);
  }, [restaurantId, selectedTableId, setContext, clearCart]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qk.qrMenu(restaurantId),
    queryFn: () => api.qrMenu(restaurantId),
  });

  const { categories: normalizedCategories, items: normalizedItems } = React.useMemo(
    () => normalizeAdminMenuPayload(data),
    [data],
  );
  const categories = React.useMemo(
    () => filterCategoriesForQrMenu(normalizedCategories),
    [normalizedCategories],
  );
  const items = React.useMemo(
    () => filterItemsForQrMenu(normalizedItems, categories),
    [normalizedItems, categories],
  );
  const restaurantName = data?.name ?? "Menu";
  const venueLogoUrl = data?.logoUrl;
  const menuShapeInvalid =
    !!data && (!Array.isArray((data as { categories?: unknown }).categories) || !Array.isArray((data as { items?: unknown }).items));
  const queryError = menuShapeInvalid
    ? new Error("Menu unavailable for this restaurant right now.")
    : error;

  const tableOptions = React.useMemo(() => {
    const fromBackend = parseTableOptions(data);
    if (fromBackend.length > 0) {
      const hasSelected = fromBackend.some((t) => t.id === selectedTableId);
      return hasSelected
        ? fromBackend
        : [
            {
              id: selectedTableId,
              label: formatTableLabelFromId(selectedTableId),
              tableCode: selectedTableId,
            },
            ...fromBackend,
          ];
    }
    /** No tables on menu payload: do not invent table ids (they fail `POST /api/customer/order`). Use only the QR URL segment. */
    return [
      {
        id: selectedTableId,
        label: formatTableLabelFromId(selectedTableId),
        tableCode: selectedTableId,
      },
    ];
  }, [data, selectedTableId]);

  const tableCodeForOrder = React.useMemo(() => {
    const row = tableOptions.find((t) => t.id === selectedTableId);
    return row?.tableCode ?? selectedTableId;
  }, [tableOptions, selectedTableId]);
  const prepaidConfig = React.useMemo(() => {
    const d = (data ?? {}) as Record<string, unknown>;
    const upiId =
      (typeof d.prepaidUpiId === "string" && d.prepaidUpiId) ||
      (typeof d.upiId === "string" && d.upiId) ||
      null;
    const upiName =
      (typeof d.prepaidUpiName === "string" && d.prepaidUpiName) ||
      (typeof d.upiName === "string" && d.upiName) ||
      null;
    const upiQrUrl =
      (typeof d.prepaidUpiQrUrl === "string" && d.prepaidUpiQrUrl) ||
      (typeof d.upiQrUrl === "string" && d.upiQrUrl) ||
      null;
    return { upiId, upiName, upiQrUrl };
  }, [data]);

  const selectedTableLabel = React.useMemo(() => {
    const found = tableOptions.find((t) => t.id === selectedTableId);
    return found?.label ?? formatTableLabelFromId(selectedTableId);
  }, [tableOptions, selectedTableId]);

  const [activeCategoryId, setActiveCategoryId] = React.useState("");

  React.useEffect(() => {
    if (categories.length) {
      setActiveCategoryId((prev) =>
        prev && categories.some((c) => c.id === prev) ? prev : categories[0]!.id,
      );
    }
  }, [categories]);

  const filtered = items.filter((i) => i.categoryId === activeCategoryId);
  const activeCategoryName =
    categories.find((c) => c.id === activeCategoryId)?.name ?? "All";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="h-1 bg-gradient-to-r from-brand-navy via-primary to-brand-navy" aria-hidden />

      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-background/92 shadow-soft backdrop-blur-lg dark:border-white/[0.08]">
        <div className="mx-auto max-w-lg px-4 pt-5 pb-4 sm:px-5">
          <div className="rounded-2xl border border-black/[0.04] bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-card">
            <div className="flex justify-center">
              <VenueBrandingLogo
                logoUrl={venueLogoUrl}
                height={48}
                className="mx-auto max-w-[220px]"
                alt={`${restaurantName} logo`}
              />
            </div>
            <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Scan to order
            </p>
            <h1 className="mt-2 text-balance text-center text-2xl font-medium tracking-tight text-foreground">
              {restaurantName}
            </h1>
            <p className="mt-1 text-center text-[13px] text-muted-foreground">
              Tap items to add — we’ll send them straight to the kitchen.
            </p>

            <div className="mt-5 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">You’re ordering for</p>
              <Select value={selectedTableId} onValueChange={(value) => setSelectedTableId(value ?? "")}>
                <SelectTrigger className="h-10 w-full rounded-lg border-input bg-background font-medium">
                  <span className="line-clamp-1 flex-1 truncate text-left">
                    {selectedTableLabel}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {tableOptions.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Category row: avoid overflow-y-hidden (clips ring) + pad vertically for focus rings */}
        <div className="mx-auto max-w-lg border-t border-black/[0.06] px-0 pb-3 pt-1 dark:border-white/[0.08]">
          <div
            className="overflow-x-auto overscroll-x-contain py-2 [scrollbar-width:thin] [touch-action:pan-x]"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div
              role="tablist"
              aria-label="Menu categories"
              className="flex w-max flex-nowrap items-center gap-2 px-4 sm:px-5"
            >
              {categories.map((c) => (
                <Button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={c.id === activeCategoryId}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-xs font-medium transition-colors sm:text-[13px]",
                    c.id === activeCategoryId
                      ? "bg-primary/10 font-semibold text-primary ring-2 ring-inset ring-primary/30"
                      : "hover:bg-muted/70",
                  )}
                  onClick={() => setActiveCategoryId(c.id)}
                >
                  {c.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5 pb-36 sm:px-5">
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-black/[0.04] bg-card px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06]">
          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <UtensilsCrossed className="size-3.5 text-primary" />
            {activeCategoryName}
          </span>
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {filtered.length} {filtered.length === 1 ? "item" : "items"}
          </span>
        </div>

        <QueryState
          isLoading={isLoading}
          isError={isError || menuShapeInvalid}
          error={queryError}
          onRetry={() => refetch()}
          empty={!isLoading && !isError && !menuShapeInvalid && filtered.length === 0}
          errorTitle="Menu unavailable"
          errorFallbackMessage="This restaurant may not exist or the menu could not be loaded."
          loadingSkeleton={<QrMenuSkeleton />}
          emptyState={
            <EmptyState
              title="No items in this category"
              description="Pick another category or check back later."
            />
          }
        >
          <div className="space-y-3">
            {filtered.map((item) => (
              <QrMenuItemRow key={item.id} item={item} />
            ))}
          </div>
        </QueryState>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-background/95 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.12)] backdrop-blur-lg dark:border-white/[0.08]">
        <div className="mx-auto max-w-lg px-4 py-3 sm:px-5">
          <CartDrawer
            orderingRestaurantId={restaurantId}
            orderingTableCode={tableCodeForOrder}
            prepaidConfig={prepaidConfig}
          />
        </div>
      </div>
    </div>
  );
}
