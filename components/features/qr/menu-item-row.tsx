"use client";

import { Minus, Plus } from "lucide-react";
import { MenuItemImage } from "@/components/shared/menu-item-image";
import type { MenuItem } from "@/types/menu";
import { formatMoneyFromCents } from "@/lib/format";
import { useCartStore } from "@/store/cart-store";
import { cn } from "@/lib/utils";

/** `pb-[125%]` = height 5/4 × width (4:5 tile). In-flow padding avoids collapsed grid rows when children are absolute. */
const TILE_ASPECT_PADDING = "pb-[125%]";

const glassFill =
  "bg-black/45 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-black/35";

const glassControls = cn(
  "rounded-full border border-white/15 shadow-lg",
  glassFill,
);

export function QrMenuItemRow({ item }: { item: MenuItem }) {
  const addItem = useCartStore((s) => s.addItem);
  const decItem = useCartStore((s) => s.decItem);
  const qtyInCart = useCartStore((s) => s.lines.find((l) => l.itemId === item.id)?.qty ?? 0);

  return (
    <div
      className={cn(
        "group relative isolate w-full overflow-hidden rounded-2xl border border-black/[0.08] bg-muted shadow-card transition-shadow duration-300 dark:border-white/[0.1]",
        "hover:shadow-card-hover",
        !item.available && "pointer-events-none opacity-55 hover:shadow-card",
      )}
    >
      <div className={cn("relative w-full", TILE_ASPECT_PADDING)}>
        <div className="absolute inset-0 overflow-hidden">
          <MenuItemImage
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width:640px) 46vw, 12rem"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>

        {!item.available ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/55 text-[10px] font-bold uppercase tracking-widest text-foreground backdrop-blur-[1px]">
            Sold out
          </div>
        ) : null}

        {/* Quantity: top-right — same frosted glass as name/price strip */}
        {item.available ? (
          <div className="absolute right-2 top-2 z-30">
            {qtyInCart === 0 ? (
              <button
                type="button"
                onClick={() =>
                  addItem({ id: item.id, name: item.name, priceCents: item.priceCents })
                }
                className={cn(
                  "flex size-9 items-center justify-center rounded-full text-white transition-colors",
                  glassControls,
                  "hover:bg-black/55 active:scale-95 supports-[backdrop-filter]:hover:bg-black/40",
                )}
                aria-label={`Add ${item.name}`}
              >
                <Plus className="size-[18px] stroke-[2.75]" aria-hidden />
              </button>
            ) : (
              <div
                className={cn(
                  "flex h-9 items-stretch overflow-hidden rounded-full",
                  glassControls,
                )}
                role="group"
                aria-label={`Quantity for ${item.name}`}
              >
                <button
                  type="button"
                  onClick={() => decItem(item.id)}
                  className="flex size-9 shrink-0 items-center justify-center text-white transition-colors hover:bg-white/15 active:bg-white/20"
                  aria-label={`Remove one ${item.name}`}
                >
                  <Minus className="size-4 stroke-[2.5]" aria-hidden />
                </button>
                <span
                  className="flex min-w-[2.25rem] shrink-0 items-center justify-center border-x border-white/30 bg-black/20 px-1.5 text-sm font-bold tabular-nums text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]"
                >
                  {qtyInCart}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    addItem({ id: item.id, name: item.name, priceCents: item.priceCents })
                  }
                  className="flex size-9 shrink-0 items-center justify-center text-white transition-colors hover:bg-white/15 active:bg-white/20"
                  aria-label={`Add one ${item.name}`}
                >
                  <Plus className="size-4 stroke-[2.5]" aria-hidden />
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* Bottom stack: optional description on photo, then frosted name + price only */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex w-full flex-col justify-end">
          {item.description ? (
            <p className="pointer-events-none mx-2 mb-1 line-clamp-2 text-left text-[9px] leading-snug text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9),0_0_10px_rgba(0,0,0,0.45)]">
              {item.description}
            </p>
          ) : null}
          <div
            className={cn(
              "rounded-t-md rounded-b-2xl border-x-0 border-b-0 border-t border-white/15 px-2.5 py-1.5",
              "shadow-[0_-6px_24px_-2px_rgba(0,0,0,0.45)]",
              glassFill,
            )}
          >
            <h3 className="line-clamp-2 text-left text-[11px] font-semibold leading-tight tracking-tight text-white">
              {item.name}
            </h3>
            <p className="mt-0.5 text-[11px] font-bold tabular-nums leading-none text-white">
              {formatMoneyFromCents(item.priceCents)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
