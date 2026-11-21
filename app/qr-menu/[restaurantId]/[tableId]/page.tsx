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
import { Clock3, MapPin } from "lucide-react";

type QrTableOption = {
  id: string;
  label: string;
  tableCode: string;
};

function formatTableLabelFromId(id: string): string {
  const t = id.trim();
  if (t.toLowerCase() === "takeaway" || t.toLowerCase() === "non-table") {
    return "Takeaway / Non-table";
  }
  const room = /^room_(\d+)$/i.exec(t);
  if (room) {
    const n = Number.parseInt(room[1], 10);
    return Number.isFinite(n) ? `Room ${n}` : `Room ${t}`;
  }
  const padded = /^table_(\d+)$/i.exec(t);
  if (padded) {
    const n = Number.parseInt(padded[1], 10);
    return Number.isFinite(n) ? `Table ${n}` : `Table ${t}`;
  }
  if (/^[0-9a-f-]{36}$/i.test(t)) {
    return `Location (${t.slice(0, 8)}…)`;
  }
  return t;
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
        (numberCandidate != null
          ? formatTableLabelFromId(
              typeof obj.code === "string" ? obj.code : `room_${numberCandidate}`,
            )
          : formatTableLabelFromId(id));
      return { id, label: String(labelText), tableCode };
    })
    .filter((v): v is QrTableOption => Boolean(v));
}

function QrMenuTopBar({
  restaurantName,
  venueLogoUrl,
  location,
}: {
  restaurantName: string;
  venueLogoUrl?: string | null;
  location?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex h-11 max-w-lg items-center gap-2 px-3 sm:px-4">
      <div className="flex h-7 max-w-[6.5rem] shrink-0 items-center">
        <VenueBrandingLogo
          logoUrl={venueLogoUrl}
          height={28}
          compact
          className="!h-7 !max-h-7 !w-auto !max-w-[6.5rem] object-contain object-left"
          alt={`${restaurantName} logo`}
        />
      </div>
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold leading-none tracking-tight text-foreground">
        {restaurantName}
      </h1>
      {location}
    </div>
  );
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
  const acceptingOrders = data?.acceptingOrders !== false;
  const closedMessage =
    data?.closedMessage?.trim() ||
    "We are currently closed. Please check back during our open hours.";
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

  const locationControl = allowTablePicker ? (
    <Select value={pickerTableId} onValueChange={(value) => setPickerTableId(value ?? "")}>
      <SelectTrigger
        size="sm"
        aria-label="Room or table"
        className="h-7 w-auto max-w-[7rem] shrink-0 gap-1 overflow-hidden rounded-full border-black/[0.08] bg-muted/70 px-2 text-[11px] font-semibold shadow-none dark:border-white/10 dark:bg-muted/50"
      >
        <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 truncate">{selectedTableLabel}</span>
      </SelectTrigger>
      <SelectContent align="end">
        {tableOptions.map((table) => (
          <SelectItem key={table.id} value={table.id}>
            {table.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : (
    <p className="inline-flex h-7 max-w-[7rem] shrink-0 items-center gap-1 rounded-full bg-muted/80 px-2 text-[11px] font-semibold text-foreground dark:bg-muted/50">
      <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
      <span className="truncate">{selectedTableLabel}</span>
    </p>
  );

  if (!isLoading && !isError && !menuShapeInvalid && data && !acceptingOrders) {
    return (
      <div
        className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background text-foreground"
        style={themeStyle}
      >
        <header className="shrink-0 border-b border-black/[0.07] bg-background pt-[env(safe-area-inset-top)] dark:border-white/[0.09]">
          <QrMenuTopBar
            restaurantName={restaurantName}
            venueLogoUrl={venueLogoUrl}
            location={locationControl}
          />
        </header>
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="w-full rounded-2xl border border-black/[0.06] bg-card p-6 shadow-card dark:border-white/[0.08]">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-primary">
              <Clock3 className="size-6" strokeWidth={2.25} aria-hidden />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-primary/90">
              Restaurant closed
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{closedMessage}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background text-foreground"
      style={themeStyle}
    >
      <header className="z-30 shrink-0 border-b border-black/[0.07] bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-md dark:border-white/[0.09]">
        <QrMenuTopBar
          restaurantName={restaurantName}
          venueLogoUrl={venueLogoUrl}
          location={locationControl}
        />
        {categories.length > 0 ? (
          <div
            className="mx-auto max-w-lg overflow-x-auto overscroll-x-contain px-3 pb-2 [scrollbar-width:none] [touch-action:pan-x] sm:px-4 [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div
              role="tablist"
              aria-label="Menu categories"
              className="flex w-max flex-nowrap items-center gap-1.5"
            >
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={c.id === activeCategoryId}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                    c.id === activeCategoryId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground dark:bg-muted/50",
                  )}
                  onClick={() => setActiveCategoryId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col overflow-hidden px-3 pt-2.5 sm:px-4">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
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
            <div className="grid grid-cols-2 content-start gap-2.5 sm:gap-3">
              {filtered.map((item) => (
                <QrMenuItemRow key={item.id} item={item} />
              ))}
            </div>
          </QueryState>
        </div>
      </main>

      <div className="shrink-0 border-t border-black/[0.08] bg-background/95 backdrop-blur-xl dark:border-white/[0.09]">
        <div className="mx-auto max-w-lg px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
          <CartDrawer orderingRestaurantId={restaurantId} orderingTableCode={tableCodeForOrder} />
        </div>
      </div>
    </div>
  );
}

function QrMenuSuspenseFallback() {
  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background">
      <div className="h-12 shrink-0 border-b border-black/[0.07] bg-background dark:border-white/[0.09]" />
      <div className="mx-auto min-h-0 w-full max-w-lg flex-1 overflow-hidden px-3 pt-2.5 sm:px-4">
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
