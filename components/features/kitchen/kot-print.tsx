"use client";

import { format } from "date-fns";
import type { Order } from "@/types/order";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { toast } from "sonner";

function buildKotHtml(order: Order): string {
  const dateStr = format(new Date(order.createdAt), "dd/MM/yy HH:mm");
  const itemsHtml = order.items
    .map(
      (it) =>
        `<div class="kot-row"><span>${it.qty}× ${escapeHtml(it.name)}</span><span>${(it.qty * it.priceCents) / 100} ₹</span></div>`,
    )
    .join("");
  const notesHtml = order.notes
    ? `<div class="kot-row" style="margin-top:8px;font-style:italic">Note: ${escapeHtml(order.notes)}</div>`
    : "";
  return `
    <div class="kot">
      <div class="kot-header">KITCHEN ORDER TICKET</div>
      <div class="kot-row"><span>Order #${order.id.slice(-8)}</span><span>Table ${order.tableNumber}</span></div>
      <div class="kot-row"><span>${dateStr}</span></div>
      <div class="kot-items">${itemsHtml}</div>
      ${notesHtml}
    </div>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function KotPrint({ order }: { order: Order }) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print KOT");
      return;
    }
    const content = buildKotHtml(order);
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>KOT - Order ${order.id}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 16px; margin: 0; }
    .kot { border: 2px solid #000; padding: 16px; max-width: 300px; }
    .kot-header { font-weight: bold; font-size: 18px; margin-bottom: 8px; }
    .kot-row { display: flex; justify-content: space-between; margin: 4px 0; }
    .kot-items { border-top: 1px dashed #000; margin-top: 8px; padding-top: 8px; }
  </style>
</head>
<body>${content}</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      onClick={handlePrint}
      aria-label="Print KOT"
    >
      <Printer className="mr-2 size-4" />
      Print KOT
    </Button>
  );
}
