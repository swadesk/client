"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, MoreVertical, Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useRestaurantStore } from "@/store/restaurant-store";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryState } from "@/components/shared/query-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AdminCreateInventoryItemRequest } from "@/types/api";
import type { InventoryItem } from "@/types/inventory";

function getHealth(item: InventoryItem) {
  if (item.quantity <= item.minQuantity) return "low";
  if (item.quantity <= item.minQuantity * 1.5) return "watch";
  return "healthy";
}

function sortItems(items: InventoryItem[]) {
  const rank = { low: 0, watch: 1, healthy: 2 } as const;
  return [...items].sort((a, b) => {
    const diff = rank[getHealth(a)] - rank[getHealth(b)];
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}

function InventoryCard({
  item,
  onUpdate,
  onDelete,
}: {
  item: InventoryItem;
  onUpdate?: (item: InventoryItem, data: { quantity?: number; minQuantity?: number }) => void;
  onDelete?: (item: InventoryItem) => void;
}) {
  const health = getHealth(item);
  const ratio = item.minQuantity === 0 ? 100 : Math.min((item.quantity / item.minQuantity) * 100, 100);

  return (
    <div
      className={cn(
        "rounded-2xl border p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.12)]",
        health === "low"
          ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30"
          : "border-black/[0.04] bg-white dark:border-white/[0.06] dark:bg-white/[0.03]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-foreground">{item.name}</span>
            {health === "low" ? (
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            ) : null}
          </div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {item.unit}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span
            className={cn(
              "text-2xl font-semibold tabular-nums tracking-tight",
              health === "low" ? "text-amber-700 dark:text-amber-400" : "text-foreground",
            )}
          >
            {item.quantity}
          </span>
          <div className="mt-1 text-xs text-muted-foreground">min {item.minQuantity}</div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Stock health</span>
          <span>{Math.round(ratio)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div
            className={cn(
              "h-2 rounded-full",
              health === "low"
                ? "bg-amber-500"
                : health === "watch"
                  ? "bg-blue-500"
                  : "bg-emerald-500",
            )}
            style={{ width: `${Math.max(8, ratio)}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Badge variant={health === "low" ? "outline" : "secondary"}>
          {health === "low" ? "Low stock" : health === "watch" ? "Watch level" : "Healthy"}
        </Badge>
        {(onUpdate || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
                  aria-label="Actions"
                />
              }
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onUpdate && (
                <DropdownMenuItem onClick={() => onUpdate(item, {})}>
                  Adjust stock
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(item)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03]">
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<InventoryItem | null>(null);
  const [editQty, setEditQty] = React.useState("");
  const [editMin, setEditMin] = React.useState("");
  const [name, setName] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [minQuantity, setMinQuantity] = React.useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qk.adminInventory(restaurantId ?? ""),
    queryFn: () => api.admin.inventory(restaurantId!),
    enabled: !!restaurantId,
  });

  const items = data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({
      itemId,
      quantity,
      minQuantity,
    }: {
      itemId: string;
      quantity?: number;
      minQuantity?: number;
    }) =>
      api.admin.updateInventoryItem(restaurantId!, itemId, {
        quantity,
        minQuantity,
      }),
    onSuccess: () => {
      toast.success("Inventory updated");
      setEditItem(null);
      if (restaurantId) {
        void qc.invalidateQueries({ queryKey: qk.adminInventory(restaurantId) });
      }
    },
    onError: () => toast.error("Failed to update inventory"),
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) =>
      api.admin.deleteInventoryItem(restaurantId!, itemId),
    onSuccess: () => {
      toast.success("Item removed");
      if (restaurantId) {
        void qc.invalidateQueries({ queryKey: qk.adminInventory(restaurantId) });
      }
    },
    onError: () => toast.error("Failed to delete item"),
  });

  const addMutation = useMutation({
    mutationFn: (payload: AdminCreateInventoryItemRequest) =>
      api.admin.createInventoryItem(payload),
    onSuccess: () => {
      toast.success("Inventory item added");
      setOpen(false);
      setName("");
      setUnit("");
      setQuantity("");
      setMinQuantity("");
      if (restaurantId) {
        void qc.invalidateQueries({ queryKey: qk.adminInventory(restaurantId) });
      }
    },
    onError: () => toast.error("Failed to add inventory item"),
  });

  function addItem() {
    if (!restaurantId) return;
    if (!name.trim()) {
      toast.error("Enter an item name");
      return;
    }
    if (!unit.trim()) {
      toast.error("Enter a stock unit");
      return;
    }
    const qty = Number(quantity);
    const minQty = Number(minQuantity);
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    if (!Number.isFinite(minQty) || minQty < 0) {
      toast.error("Enter a valid minimum quantity");
      return;
    }
    addMutation.mutate({
      restaurantId,
      name: name.trim(),
      unit: unit.trim(),
      quantity: qty,
      minQuantity: minQty,
    });
  }

  function openEdit(item: InventoryItem) {
    setEditItem(item);
    setEditQty(String(item.quantity));
    setEditMin(String(item.minQuantity));
  }

  function saveEdit() {
    if (!editItem || !restaurantId) return;
    const qty = Number(editQty);
    const minQty = Number(editMin);
    if (!Number.isFinite(qty) || qty < 0 || !Number.isFinite(minQty) || minQty < 0) {
      toast.error("Enter valid numbers");
      return;
    }
    updateMutation.mutate({
      itemId: editItem.id,
      quantity: qty,
      minQuantity: minQty,
    });
  }

  if (!restaurantId) {
    return (
      <div className="space-y-12">
        <PageHeader
          title="Inventory"
          description="Track stock levels and manage supplies."
        />
        <EmptyState
          title="Select a restaurant"
          description="Choose a restaurant in the header to manage its inventory."
        />
      </div>
    );
  }

  const lowItems = items.filter((item) => getHealth(item) === "low");
  const healthyItems = items.filter((item) => getHealth(item) === "healthy");
  const watchItems = items.filter((item) => getHealth(item) === "watch");
  const sortedItems = sortItems(items);
  const attentionItems = sortItems(items).slice(0, 5);

  return (
    <div className="space-y-12">
      <PageHeader
        title="Inventory"
        description="Track stock levels and manage supplies."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add item
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Total SKUs" value={`${items.length}`} />
        <SummaryCard label="Low stock" value={`${lowItems.length}`} />
        <SummaryCard label="Healthy stock" value={`${healthyItems.length}`} />
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        empty={!isLoading && !isError && items.length === 0}
        errorFallbackMessage="Failed to load inventory."
        className="space-y-10"
        loadingSkeleton={
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-44 rounded-2xl bg-muted/50" />
            ))}
          </div>
        }
        emptyState={
          <EmptyState
            title="No inventory items yet"
            description="Add your first stock item to start tracking inventory."
            primaryAction={{ label: "Add item", onClick: () => setOpen(true) }}
          />
        }
      >
        {lowItems.length > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 px-6 py-5 dark:border-amber-800 dark:bg-amber-950/30">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="font-semibold text-amber-800 dark:text-amber-300">
                {lowItems.length} item{lowItems.length === 1 ? "" : "s"} below minimum stock
              </span>
            </div>
            <p className="mt-2 text-sm text-amber-700/80 dark:text-amber-400/80">
              Prioritize replenishment to avoid service disruption.
            </p>
          </div>
        ) : null}

        <div className="grid gap-10 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Live inventory
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Low stock is surfaced first so urgent items stay visible.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {sortedItems.map((item) => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  onUpdate={(i) => openEdit(i)}
                  onDelete={(i) => {
                    if (confirm(`Delete "${i.name}"?`)) deleteMutation.mutate(i.id);
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-8 rounded-2xl border border-black/[0.04] bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03]">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/5">
                <Package className="size-6 text-primary/80" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">Inventory workflow</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Use minimum levels to catch shortages early and keep service
                  consistent during peak hours.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-xl border border-border/40 bg-muted/20 px-5 py-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Low stock
                </div>
                <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {lowItems.length}
                </div>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/20 px-5 py-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Watch list
                </div>
                <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {watchItems.length}
                </div>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/20 px-5 py-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Reorder guidance
                </div>
                <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Review low stock first, then items nearing threshold.
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Attention needed</h4>
              <div className="space-y-3">
                {attentionItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      <Badge variant={getHealth(item) === "low" ? "outline" : "secondary"}>
                        {getHealth(item)}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {item.quantity} in stock · minimum {item.minQuantity} · {item.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </QueryState>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="grid gap-6">
              <p className="text-sm text-muted-foreground">{editItem.name}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Quantity</Label>
                  <Input
                    inputMode="numeric"
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Minimum</Label>
                  <Input
                    inputMode="numeric"
                    value={editMin}
                    onChange={(e) => setEditMin(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditItem(null)}>
                  Cancel
                </Button>
                <Button onClick={saveEdit} disabled={updateMutation.isPending}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add inventory item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="inventory-name">Name</Label>
              <Input
                id="inventory-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Paneer"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inventory-unit">Unit</Label>
              <Input
                id="inventory-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. kg, l, packs"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="inventory-qty">Quantity</Label>
                <Input
                  id="inventory-qty"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 24"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inventory-min">Minimum</Label>
                <Input
                  id="inventory-min"
                  inputMode="numeric"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                  placeholder="e.g. 10"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addItem} disabled={addMutation.isPending}>
                {addMutation.isPending ? "Adding..." : "Add item"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
