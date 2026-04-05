"use client";

import { Plus } from "lucide-react";
import { MenuItemImage } from "@/components/shared/menu-item-image";
import type { MenuItem } from "@/types/menu";
import { Button } from "@/components/ui/button";
import { formatMoneyFromCents } from "@/lib/format";
import { useCartStore } from "@/store/cart-store";
import { cn } from "@/lib/utils";

export function QrMenuItemRow({ item }: { item: MenuItem }) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <div
      className={cn(
        "flex gap-3 overflow-hidden rounded-2xl border border-black/[0.04] bg-card p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-200 dark:border-white/[0.06]",
        !item.available && "opacity-75",
      )}
    >
      <div className="relative size-[4.75rem] shrink-0 overflow-hidden rounded-xl bg-muted">
        <MenuItemImage
          src={item.imageUrl}
          alt={item.name}
          fill
          sizes="76px"
          className="object-cover"
        />
        {!item.available ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-[2px]">
            Unavailable
          </div>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-medium leading-snug text-foreground">{item.name}</h3>
            <p className="mt-0.5 font-semibold tabular-nums text-foreground">
              {formatMoneyFromCents(item.priceCents)}
            </p>
            {item.description ? (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            size="icon-lg"
            className="size-10 shrink-0 rounded-lg"
            disabled={!item.available}
            variant={item.available ? "default" : "secondary"}
            onClick={() =>
              addItem({ id: item.id, name: item.name, priceCents: item.priceCents })
            }
            aria-label={`Add ${item.name}`}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
