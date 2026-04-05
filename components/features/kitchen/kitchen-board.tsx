"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  defaultDropAnimation,
  type DragEndEvent,
  type DragStartEvent,
  type CollisionDetection,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import type { Order } from "@/types/order";
import { OrderCard } from "@/components/features/orders/order-card";
import { KotPrint } from "@/components/features/kitchen/kot-print";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

type KanbanStatus = "Pending" | "Preparing" | "Ready";

const COLUMNS: { id: KanbanStatus; title: string; emptyTitle: string; tone: Tone }[] = [
  { id: "Pending", title: "Pending", emptyTitle: "Nothing pending", tone: "amber" },
  { id: "Preparing", title: "Preparing", emptyTitle: "No active prep", tone: "blue" },
  { id: "Ready", title: "Ready", emptyTitle: "Nothing ready", tone: "emerald" },
];

type Tone = "amber" | "blue" | "emerald";

const COLUMN_IDS = new Set<string>(["Pending", "Preparing", "Ready"]);

/** Prefer column droppables so drops register as column moves, not only as “over another card”. */
const kitchenCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    const columnHit = pointerCollisions.find((c) => COLUMN_IDS.has(String(c.id)));
    if (columnHit) return [columnHit];
    return pointerCollisions;
  }
  return closestCorners(args);
};

const toneStyles: Record<
  Tone,
  { ring: string; headerBorder: string; headerBg: string; title: string }
> = {
  amber: {
    ring: "ring-amber-500/20",
    headerBorder: "border-amber-500/20",
    headerBg: "bg-amber-500/5",
    title: "text-amber-900 dark:text-amber-200",
  },
  blue: {
    ring: "ring-blue-500/20",
    headerBorder: "border-blue-500/20",
    headerBg: "bg-blue-500/5",
    title: "text-blue-900 dark:text-blue-200",
  },
  emerald: {
    ring: "ring-emerald-500/20",
    headerBorder: "border-emerald-500/20",
    headerBg: "bg-emerald-500/5",
    title: "text-emerald-900 dark:text-emerald-200",
  },
};

function DraggableOrderCard({
  order,
  isDragging,
  onDelete,
}: {
  order: Order;
  isDragging?: boolean;
  onDelete?: (orderId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggingFromHook,
  } = useDraggable({
    id: `order-${order.id}`,
    data: { order },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all duration-200",
        (isDragging ?? isDraggingFromHook) && "opacity-0 pointer-events-none",
      )}
    >
      <OrderCard order={order} variant="kds" onDelete={onDelete} />
    </div>
  );
}

function KitchenColumn({
  id,
  title,
  orders,
  emptyTitle,
  tone,
  isDragging,
  onOrderDelete,
}: {
  id: KanbanStatus;
  title: string;
  orders: Order[];
  emptyTitle: string;
  tone: Tone;
  isDragging: boolean;
  onOrderDelete?: (orderId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const t = toneStyles[tone];

  return (
    <section
      className={cn(
        "flex min-h-[300px] flex-col overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all duration-200 dark:border-white/[0.06] dark:bg-white/[0.03]",
        t.ring,
        "ring-1",
        isOver && "ring-2 ring-primary/40 bg-primary/5 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1)]",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b px-5 py-4",
          t.headerBorder,
          t.headerBg,
        )}
      >
        <div className={cn("text-base font-semibold tracking-tight", t.title)}>{title}</div>
        <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground dark:bg-white/10">
          {orders.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-1 flex-col gap-4 p-5",
          isOver && orders.length === 0 && "rounded-lg border-2 border-dashed border-primary/30",
        )}
      >
        {orders.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8">
            {isDragging && isOver ? (
              <p className="text-center text-sm font-medium text-primary">
                Drop orders here
              </p>
            ) : (
              <EmptyState title={emptyTitle} />
            )}
          </div>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="space-y-2">
              <DraggableOrderCard order={o} onDelete={onOrderDelete} />
              <KotPrint order={o} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function KitchenBoard({
  orders,
  restaurantId,
  onOrderStatusChange,
  onOrderDelete,
}: {
  orders: Order[];
  restaurantId?: string;
  onOrderStatusChange?: (orderId: string, status: KanbanStatus) => void;
  onOrderDelete?: (orderId: string) => void;
}) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 8,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !onOrderStatusChange || !restaurantId) return;

    const dragged = active.data.current?.order as Order | undefined;
    const orderId = dragged?.id;
    if (!orderId) return;

    let newStatus: KanbanStatus;
    const overId = String(over.id);
    if (COLUMN_IDS.has(overId)) {
      newStatus = overId as KanbanStatus;
    } else if (overId.startsWith("order-")) {
      const targetId = overId.slice("order-".length);
      const targetOrder = orders.find((o) => o.id === targetId);
      if (!targetOrder) return;
      newStatus = targetOrder.status as KanbanStatus;
    } else {
      return;
    }

    const currentStatus = dragged.status as KanbanStatus;
    if (currentStatus === newStatus) return;

    onOrderStatusChange(orderId, newStatus);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const pending = orders.filter((o) => o.status === "Pending");
  const preparing = orders.filter((o) => o.status === "Preparing");
  const ready = orders.filter((o) => o.status === "Ready");
  const isDragging = activeId !== null;

  const activeOrder = activeId
    ? orders.find((o) => `order-${o.id}` === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      collisionDetection={kitchenCollisionDetection}
    >
      <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="min-w-[85vw] shrink-0 snap-center sm:min-w-[320px] lg:min-w-0 lg:shrink"
          >
            <KitchenColumn
              id={col.id}
              title={col.title}
              orders={
                col.id === "Pending"
                  ? pending
                  : col.id === "Preparing"
                    ? preparing
                    : ready
              }
              emptyTitle={col.emptyTitle}
              tone={col.tone}
              isDragging={isDragging}
              onOrderDelete={onOrderDelete}
            />
          </div>
        ))}
      </div>

      <DragOverlay
        dropAnimation={defaultDropAnimation}
        modifiers={[snapCenterToCursor]}
        zIndex={9999}
      >
        {activeOrder ? (
          <div className="scale-105 cursor-grabbing shadow-[0_8px_24px_-4px_rgba(0,0,0,0.15)]">
            <OrderCard order={activeOrder} variant="kds" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
