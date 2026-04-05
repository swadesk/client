"use client";

import type { Table, TableStatus } from "@/types/table";
import { normalizeTableStatus } from "@/lib/table-status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FileText, QrCode, Trash2 } from "lucide-react";

function statusVariant(status: TableStatus) {
  if (status === "Available") return "secondary";
  if (status === "Billing") return "destructive";
  return "default";
}

/** Post-paid: guests order while Occupied; staff still need billing actions before table is in Billing. */
function showTablePaymentActions(status: TableStatus): boolean {
  return status === "Billing" || status === "Occupied";
}

type WaiterOption = { id: string; name: string };

export function TableCard({
  table,
  /** Overrides `table.status` for badge and payment actions (e.g. Occupied while kitchen is active). */
  displayStatus,
  waiterName,
  waiters = [],
  onAssign,
  isAssigning,
  onClick,
  onCollectPayment,
  onCreateInvoice,
  onViewLatestInvoice,
  onRequestDelete,
  onShowQr,
  isCreateInvoicePending,
}: {
  table: Table;
  displayStatus?: TableStatus;
  waiterName?: string | null;
  waiters?: WaiterOption[];
  onAssign?: (tableId: string, waiterId: string | null) => void;
  isAssigning?: boolean;
  onClick?: (table: Table) => void;
  onCollectPayment?: (table: Table) => void;
  onCreateInvoice?: (table: Table) => void;
  onViewLatestInvoice?: (table: Table) => void;
  onRequestDelete?: (table: Table) => void;
  onShowQr?: (table: Table) => void;
  isCreateInvoicePending?: boolean;
}) {
  const statusForUi = displayStatus ?? normalizeTableStatus(table.status);

  return (
    <Card
      className={cn(
        "rounded-2xl border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] dark:border-white/[0.08] dark:bg-white/[0.02]",
        onClick && "cursor-pointer",
      )}
      onClick={() => onClick?.(table)}
    >
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Table {table.number}</CardTitle>
          <div className="text-xs text-muted-foreground">{table.seats} seats</div>
        </div>
        <Badge variant={statusVariant(statusForUi)}>{statusForUi}</Badge>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {onAssign ? (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Assigned waiter</Label>
            <Select
              value={table.waiterId ?? "unassigned"}
              onValueChange={(v) => onAssign(table.id, v === "unassigned" ? null : v)}
              disabled={isAssigning}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Unassigned">
                  {(value) => {
                    if (value === "unassigned" || value == null) return "Unassigned";
                    return (
                      waiters.find((w) => w.id === value)?.name ??
                      waiterName ??
                      "Unknown waiter"
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {waiters.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="text-[13px] text-muted-foreground">
            {waiterName ? `Assigned to ${waiterName}` : "Unassigned"}
          </div>
        )}
        {showTablePaymentActions(statusForUi) && onCollectPayment ? (
          <Button
            variant="default"
            size="sm"
            className="mt-3 w-full"
            onClick={(e) => {
              e.stopPropagation();
              onCollectPayment(table);
            }}
          >
            Collect payment
          </Button>
        ) : null}
        {showTablePaymentActions(statusForUi) && onCreateInvoice ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={isCreateInvoicePending}
            onClick={(e) => {
              e.stopPropagation();
              onCreateInvoice(table);
            }}
          >
            <FileText className="mr-2 size-4" />
            {isCreateInvoicePending ? "Creating…" : "Create invoice"}
          </Button>
        ) : null}
        {onViewLatestInvoice ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onViewLatestInvoice(table);
            }}
          >
            <FileText className="mr-2 size-4" />
            View latest invoice
          </Button>
        ) : null}
        {onShowQr ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onShowQr(table);
            }}
          >
            <QrCode className="mr-2 size-4" />
            Table QR
          </Button>
        ) : null}
        {onRequestDelete ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete(table);
            }}
          >
            <Trash2 className="mr-2 size-4" />
            Delete table
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
