"use client";

import { Pencil, Trash2 } from "lucide-react";
import { MenuItemImage } from "@/components/shared/menu-item-image";
import type { MenuItem } from "@/types/menu";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { formatMoneyFromCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MenuItemCard({
  item,
  onToggleAvailability,
  onEdit,
  onRequestDelete,
  availabilityPending,
}: {
  item: MenuItem;
  onToggleAvailability: (itemId: string, available: boolean) => void;
  onEdit: (item: MenuItem) => void;
  onRequestDelete?: (item: MenuItem) => void;
  /** Disables the availability switch while the PATCH is in flight. */
  availabilityPending?: boolean;
}) {
  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] dark:border-white/[0.06] dark:bg-white/[0.03]",
        !item.available && "opacity-80",
      )}
    >
      <div className="relative h-36 w-full overflow-hidden bg-muted">
        <MenuItemImage
          src={item.imageUrl}
          alt={item.name}
          width={800}
          height={450}
          className="h-36 w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-medium text-foreground">{item.name}</h3>
            <p className="mt-0.5 font-semibold tabular-nums text-foreground">
              {formatMoneyFromCents(item.priceCents)}
            </p>
            {item.description ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {item.description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px] hover:bg-muted sm:min-h-8 sm:min-w-8"
              aria-label="Edit item"
              onClick={() => onEdit(item)}
            >
              <Pencil className="size-4" />
            </Button>
            {onRequestDelete ? (
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px] text-destructive hover:bg-destructive/10 hover:text-destructive sm:min-h-8 sm:min-w-8"
                aria-label="Delete menu item"
                onClick={() => onRequestDelete(item)}
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
        <div
          className={cn(
            "mt-4 flex items-center justify-between gap-3 rounded-lg px-3 py-2",
            item.available
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-400",
          )}
        >
          <span className="text-xs font-medium">
            {item.available ? "Available" : "Unavailable"}
          </span>
          <Switch
            checked={item.available}
            disabled={availabilityPending}
            onCheckedChange={(checked) => onToggleAvailability(item.id, checked)}
            aria-label="Toggle availability"
          />
        </div>
      </div>
    </div>
  );
}
