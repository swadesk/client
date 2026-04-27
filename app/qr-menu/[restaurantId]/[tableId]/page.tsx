"use client";

import * as React from "react";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { VenueBrandingLogo } from "@/components/branding/venue-branding-logo";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCartStore } from "@/store/cart-store";
import { QrMenuItemRow } from "@/components/features/qr/menu-item-row";
import { CartDrawer } from "@/components/features/qr/cart-drawer";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { qk } from "@/lib/query-keys";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryState, QrMenuSkeleton } from "@/components/shared/query-state";
import { cn } from "@/lib/utils";
import { normalizeAdminMenuPayload } from "@/lib/menu-normalize";
import { filterCategoriesForQrMenu, filterItemsForQrMenu } from "@/lib/qr-menu-guest";
import { qrThemeFromHex, qrThemeFromLogoUrl, type QrVenueThemeCssVars } from "@/lib/qr-venue-theme";
import { MapPin, UtensilsCrossed } from "lucide-react";

type QrTableOption = {
  id: string;
  label: string;
  tableCode: string;
};

function formatTableLabelFromId(id: string): string {
  const t = id.trim();
  const roomPrefixed = /^room_(.+)$/i.exec(t);
  if (roomPrefixed) {
    const suffix = roomPrefixed[1] ?? "";
    if (/^[0-9a-f-]{36}$/i.test(suffix)) return `Room (${suffix.slice(0, 8)}…)`;
    return `Room ${suffix}`;
  }
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
      const id = rawId ?? rawCode ?? String(numberCandidate);
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

function isLocalDevHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

function pickBrandPrimaryHex(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const raw = d.brandPrimary ?? d.brand_primary;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (/^#[0-9a-f]{6}$/i.test(t)) return t;
  if (/^[0-9a-f]{6}$/i.test(t)) return `#${t}`;
  return null;
}

function QrMenuPageInner() {
  const params = useParams<{ restaurantId: string; tableId: string }>();
  const searchParams = useSearchParams();
  const restaurantId = params.restaurantId;
  const tableId = params.tableId;
  const [localDevTablePicker, setLocalDevTablePicker] = React.useState(false);
  React.useEffect(() => {
    setLocalDevTablePicker(isLocalDevHost(window.location.hostname));
  }, []);
  const allowTablePicker =
    searchParams.get("pickTable") === "1" || localDevTablePicker;

  const [pickerTableId, setPickerTableId] = React.useState(tableId);
  const effectiveTableId = allowTablePicker ? pickerTableId : tableId;

  const setContext = useCartStore((s) => s.setContext);
  const clearCart = useCartStore((s) => s.clear);
  const prevRestaurantRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    setPickerTableId(tableId);
  }, [tableId]);

  React.useLayoutEffect(() => {
    if (prevRestaurantRef.current !== null && prevRestaurantRef.current !== restaurantId) {
      const { lines } = useCartStore.getState();
      if (lines.length > 0) clearCart();
    }
    prevRestaurantRef.current = restaurantId;
    setContext(restaurantId, effectiveTableId);
  }, [restaurantId, effectiveTableId, setContext, clearCart]);

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
  const brandPrimaryHex = React.useMemo(() => pickBrandPrimaryHex(data), [data]);
  const menuShapeInvalid =
    !!data &&
    (!Array.isArray((data as { categories?: unknown }).categories) ||
      !Array.isArray((data as { items?: unknown }).items));
  const queryError = menuShapeInvalid
    ? new Error("Menu unavailable for this restaurant right now.")
    : error;

  const [venueTheme, setVenueTheme] = React.useState<QrVenueThemeCssVars | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const apply = (t: QrVenueThemeCssVars | null) => {
      if (!cancelled) setVenueTheme(t);
    };

    const fromHex = brandPrimaryHex ? qrThemeFromHex(brandPrimaryHex) : null;
    if (fromHex) {
      apply(fromHex);
      return () => {
        cancelled = true;
      };
    }

    if (!venueLogoUrl?.trim()) {
      apply(null);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const t = await qrThemeFromLogoUrl(venueLogoUrl);
      apply(t);
    })();
    return () => {
      cancelled = true;
    };
  }, [brandPrimaryHex, venueLogoUrl]);

  const themeStyle = React.useMemo((): React.CSSProperties => {
    if (!venueTheme) return {};
    return {
      "--primary": venueTheme.primary,
      "--primary-foreground": venueTheme.primaryForeground,
      "--ring": venueTheme.ring,
    } as React.CSSProperties;
  }, [venueTheme]);

  const tableOptions = React.useMemo(() => {
    const fromBackend = parseTableOptions(data);
    if (fromBackend.length > 0) {
      const hasSelected = fromBackend.some((t) => t.id === effectiveTableId);
      return hasSelected
        ? fromBackend
        : [
            {
              id: effectiveTableId,
              label: formatTableLabelFromId(effectiveTableId),
              tableCode: effectiveTableId,
            },
            ...fromBackend,
          ];
    }
    return [
      {
        id: effectiveTableId,
        label: formatTableLabelFromId(effectiveTableId),
        tableCode: effectiveTableId,
      },
    ];
  }, [data, effectiveTableId]);

  const tableCodeForOrder = React.useMemo(() => {
    const row = tableOptions.find((t) => t.id === effectiveTableId);
    return row?.tableCode ?? effectiveTableId;
  }, [tableOptions, effectiveTableId]);

  const selectedTableLabel = React.useMemo(() => {
    const found = tableOptions.find((t) => t.id === effectiveTableId);
    return found?.label ?? formatTableLabelFromId(effectiveTableId);
  }, [tableOptions, effectiveTableId]);

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
    <div
      className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background text-foreground"
      style={themeStyle}
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[min(100%,48rem)] -translate-x-1/2 rounded-[100%] bg-primary/[0.11] blur-[72px] dark:bg-primary/[0.08]" />
        <div className="absolute bottom-[-6rem] left-[-4rem] h-72 w-72 rounded-full bg-brand-navy/[0.06] blur-[56px] dark:bg-brand-navy/[0.12]" />
        <div className="absolute right-[-20%] top-1/3 h-64 w-64 rounded-full bg-primary/[0.05] blur-[48px]" />
      </div>

      <div className="h-1 shrink-0 bg-gradient-to-r from-brand-navy via-primary to-brand-navy" aria-hidden />

      <header className="sticky top-0 z-30 shrink-0 border-b border-black/[0.07] bg-background/80 shadow-sm backdrop-blur-xl dark:border-white/[0.09]">
        <div className="mx-auto max-w-lg px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4">
          <div className="relative overflow-hidden rounded-[1.35rem] border border-black/[0.06] bg-card/95 shadow-card ring-1 ring-primary/[0.08] dark:border-white/[0.08] dark:bg-card/90">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="p-5 sm:p-6">
              <div className="flex justify-center">
                <VenueBrandingLogo
                  logoUrl={venueLogoUrl}
                  height={52}
                  className="mx-auto max-w-[240px] drop-shadow-sm"
                  alt={`${restaurantName} logo`}
                />
              </div>
              <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-primary/90">
                Scan · order · enjoy
              </p>
              <h1 className="mt-2 text-balance text-center font-sans text-2xl font-bold tracking-tight text-foreground sm:text-[1.65rem]">
                {restaurantName}
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-center text-[13px] leading-relaxed text-muted-foreground">
                Tap <span className="font-medium text-foreground/80">+</span> to add dishes. Orders go
                to the kitchen for your table.
              </p>

              {allowTablePicker ? (
                <div className="mt-6 rounded-2xl bg-muted/40 px-3 py-3 dark:bg-muted/25">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
                    Table
                  </div>
                  <Select
                    value={pickerTableId}
                    onValueChange={(value) => setPickerTableId(value ?? "")}
                  >
                    <SelectTrigger className="mt-2 h-11 w-full rounded-xl border-input/80 bg-background font-semibold shadow-sm">
                      <span className="line-clamp-1 flex-1 truncate text-left text-[15px]">
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
              ) : null}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-lg border-t border-black/[0.06] bg-background/60 px-0 pb-3 pt-2 dark:border-white/[0.08]">
          <div
            className="overflow-x-auto overscroll-x-contain px-4 py-1 [scrollbar-width:thin] [touch-action:pan-x] sm:px-5"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div
              role="tablist"
              aria-label="Menu categories"
              className="flex w-max flex-nowrap items-stretch gap-2"
            >
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={c.id === activeCategoryId}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2.5 text-left text-xs font-semibold transition-all sm:text-[13px]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                    c.id === activeCategoryId
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground dark:bg-muted/50",
                  )}
                  onClick={() => setActiveCategoryId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col overflow-hidden px-4 pt-5 sm:px-5 sm:pt-6">
        <div className="mb-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <UtensilsCrossed className="size-4" strokeWidth={2.25} />
              <span className="text-xs font-bold uppercase tracking-[0.12em]">On the menu</span>
            </div>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {activeCategoryName}
            </h2>
          </div>
          <p className="text-sm font-medium tabular-nums text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "dish" : "dishes"}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] pb-[calc(6.5rem+env(safe-area-inset-bottom))] [scrollbar-width:thin]">
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
            <div className="grid grid-cols-2 content-start gap-3 sm:gap-4">
              {filtered.map((item) => (
                <QrMenuItemRow key={item.id} item={item} />
              ))}
            </div>
          </QueryState>
        </div>
      </main>

      <div className="shrink-0 border-t border-black/[0.08] bg-background/90 backdrop-blur-xl dark:border-white/[0.09]">
        <div className="mx-auto max-w-lg px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
          <CartDrawer orderingRestaurantId={restaurantId} orderingTableCode={tableCodeForOrder} />
        </div>
      </div>
    </div>
  );
}

function QrMenuSuspenseFallback() {
  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background">
      <div className="h-1 shrink-0 bg-gradient-to-r from-brand-navy via-primary to-brand-navy" />
      <div className="mx-auto w-full max-w-lg flex-1 px-4 pt-8 sm:px-5">
        <QrMenuSkeleton />
      </div>
    </div>
  );
}

export default function QrMenuPage() {
  return (
    <Suspense fallback={<QrMenuSuspenseFallback />}>
      <QrMenuPageInner />
    </Suspense>
  );
}
