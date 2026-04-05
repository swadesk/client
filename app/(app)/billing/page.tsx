"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { api, type ApiError } from "@/lib/api";
import { invalidateStaffTableQueries, qk } from "@/lib/query-keys";
import { formatMoneyFromCents } from "@/lib/format";
import { useRestaurantStore } from "@/store/restaurant-store";
import { useAuthStore } from "@/store/auth-store";
import { canAccessRouteForUser } from "@/components/layout/nav-items";
import { getPostAuthRedirectPath, canCollectTablePayments } from "@/lib/auth-routing";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryState } from "@/components/shared/query-state";
import { InvoiceView } from "@/components/features/billing/invoice-view";
import { BillCustomerContactForm } from "@/components/features/billing/bill-customer-contact-form";
import {
  RecordPaymentDialog,
  type RecordPaymentBillSummary,
} from "@/components/features/billing/record-payment-dialog";
import { tableLabelForBill } from "@/lib/billing-table-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Invoice } from "@/types/invoice";
import type { Bill } from "@/types/bill";
import { isPrepaidEntity, isVerifiedPrepaid } from "@/lib/prepaid";
import { normalizeTablesResponse } from "@/lib/tables-normalize";

function isTakeawayBill(inv: Invoice | null | undefined, bill: Bill): boolean {
  return inv?.channel === "TAKEAWAY" || bill.channel === "TAKEAWAY";
}

function billToSummary(bill: Bill): RecordPaymentBillSummary {
  return {
    id: bill.id,
    totalCents: bill.totalCents,
    paidCents: bill.paidCents,
    dueCents: bill.dueCents,
    tableId: bill.tableId?.trim() ? bill.tableId : null,
  };
}

export default function BillingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const user = useAuthStore((s) => s.user);
  const canViewBilling = canAccessRouteForUser(user, "/billing");
  const canRecordPayments = canCollectTablePayments(user);

  const [status, setStatus] = React.useState<"all" | "OPEN" | "PARTIAL" | "PAID">("all");
  const [channel, setChannel] = React.useState<"all" | "DINE_IN" | "TAKEAWAY">("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string | null>(null);
  const [recordPaymentBill, setRecordPaymentBill] = React.useState<RecordPaymentBillSummary | null>(
    null,
  );
  const [recordPaymentInvoiceId, setRecordPaymentInvoiceId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user && !canViewBilling) router.replace(getPostAuthRedirectPath(user));
  }, [user, canViewBilling, router]);

  const tablesQuery = useQuery({
    queryKey: qk.adminTables(restaurantId ?? ""),
    queryFn: async () => {
      const raw = await api.admin.tables(restaurantId!);
      return normalizeTablesResponse(raw);
    },
    enabled: !!restaurantId && !!user && canViewBilling,
  });

  const query = useQuery({
    queryKey: qk.billingList(restaurantId ?? "", {
      status: status === "all" ? undefined : status,
      channel: channel === "all" ? undefined : channel,
      from: from || undefined,
      to: to || undefined,
    }),
    queryFn: () =>
      api.billing.list(restaurantId!, {
        status: status === "all" ? undefined : status,
        channel: channel === "all" ? undefined : channel,
        from: from || undefined,
        to: to || undefined,
      }),
    enabled: !!restaurantId && !!user && canViewBilling,
    refetchInterval: 10_000,
  });

  const createTableInvoiceMutation = useMutation({
    mutationFn: (tableId: string) => {
      if (!restaurantId) throw new Error("Select a restaurant first.");
      return api.billing.createTableInvoice({ restaurantId, tableId });
    },
    onSuccess: (res) => {
      toast.success(`Invoice ready (${res.invoice.invoiceNumber})`);
      setSelectedInvoiceId(res.invoice.id);
      if (!restaurantId) return;
      void qc.invalidateQueries({ queryKey: qk.billingList(restaurantId) });
      void qc.invalidateQueries({ queryKey: qk.billingByRestaurant(restaurantId) });
      invalidateStaffTableQueries(qc, restaurantId);
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e?.message || "Failed to create table invoice");
    },
  });

  const selectedInvoiceQuery = useQuery({
    queryKey: qk.invoiceDetail(restaurantId ?? "", selectedInvoiceId ?? ""),
    queryFn: () => api.invoices.get(restaurantId!, selectedInvoiceId!),
    enabled: !!restaurantId && !!selectedInvoiceId,
  });

  const restaurantQuery = useQuery({
    queryKey: ["restaurant", restaurantId],
    queryFn: () => api.restaurants.get(restaurantId!),
    enabled: !!restaurantId && !!selectedInvoiceId,
  });

  const listRowForSelectedInvoice = React.useMemo(() => {
    if (!selectedInvoiceId) return null;
    return (query.data ?? []).find((row) => row.invoice?.id === selectedInvoiceId) ?? null;
  }, [query.data, selectedInvoiceId]);

  const openRecordPayment = (bill: Bill, invoiceId: string | null) => {
    setRecordPaymentBill(billToSummary(bill));
    setRecordPaymentInvoiceId(invoiceId);
  };

  if (!restaurantId) {
    return (
      <div className="space-y-12">
        <PageHeader title="Billing" description="Invoices and payment tracking." />
        <EmptyState
          title="Select a restaurant"
          description="Choose a restaurant in the header to manage billing."
        />
      </div>
    );
  }

  if (user && !canViewBilling) {
    return (
      <EmptyState
        title="Billing is restricted"
        description="You are being redirected to your allowed workspace."
      />
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Billing"
        description="Track bills, record payments, and view invoices for your venue."
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Narrow billing records by status, channel, and date.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
            <SelectTrigger>
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="DINE_IN">Dine-in</SelectItem>
              <SelectItem value="TAKEAWAY">Takeaway</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </CardContent>
      </Card>

      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        empty={!query.isLoading && !query.isError && (query.data ?? []).length === 0}
        loadingSkeleton={
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        }
        errorFallbackMessage="Failed to load billing records."
        emptyState={
          <EmptyState
            title="No billing records"
            description="Bills and invoices for this restaurant will appear here."
          />
        }
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {(query.data ?? []).map((row) => {
            const bill = row.bill;
            const inv = row.invoice;
            const takeaway = isTakeawayBill(inv, bill);
            const prepaid = isPrepaidEntity(inv ?? bill);
            const prepaidVerified = isVerifiedPrepaid(inv ?? bill);
            const hasTable = Boolean(bill.tableId?.trim());
            const tableLine = takeaway
              ? "Takeaway"
              : hasTable
                ? tableLabelForBill(bill, tablesQuery.data)
                : "Dine-in";
            return (
              <Card key={bill.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        {inv?.invoiceNumber ?? `Bill ${bill.id.slice(-8).toUpperCase()}`}
                      </CardTitle>
                      <CardDescription>{tableLine}</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {prepaid ? (
                        <Badge
                          variant="secondary"
                          className={
                            prepaidVerified
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          }
                        >
                          {prepaidVerified ? "Prepaid" : "Prepaid pending"}
                        </Badge>
                      ) : null}
                      <Badge variant={bill.status === "PAID" ? "secondary" : "destructive"}>
                        {bill.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold">{formatMoneyFromCents(bill.totalCents)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid</span>
                    <span>{formatMoneyFromCents(bill.paidCents)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className="font-semibold">{formatMoneyFromCents(bill.dueCents)}</span>
                  </div>
                  <BillCustomerContactForm
                    bill={bill}
                    restaurantId={restaurantId}
                    invoiceId={inv?.id ?? null}
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {inv ? (
                      <Button variant="outline" size="sm" onClick={() => setSelectedInvoiceId(inv.id)}>
                        <FileText className="mr-2 size-4" />
                        View invoice
                      </Button>
                    ) : hasTable ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => createTableInvoiceMutation.mutate(bill.tableId)}
                        disabled={createTableInvoiceMutation.isPending}
                      >
                        <FileText className="mr-2 size-4" />
                        Create invoice
                      </Button>
                    ) : null}
                    {bill.status !== "PAID" && canRecordPayments ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => openRecordPayment(bill, inv?.id ?? null)}
                        >
                          Record payment
                        </Button>
                        {!takeaway && hasTable ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.push("/tables")}
                          >
                            Open table billing
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </QueryState>

      <RecordPaymentDialog
        open={!!recordPaymentBill}
        onOpenChange={(o) => {
          if (!o) {
            setRecordPaymentBill(null);
            setRecordPaymentInvoiceId(null);
          }
        }}
        restaurantId={restaurantId}
        bill={recordPaymentBill}
        invoiceId={recordPaymentInvoiceId}
      />

      <Dialog open={!!selectedInvoiceId} onOpenChange={(o) => !o && setSelectedInvoiceId(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice</DialogTitle>
          </DialogHeader>
          {selectedInvoiceQuery.data && restaurantQuery.data ? (
            <>
              <InvoiceView invoice={selectedInvoiceQuery.data} restaurant={restaurantQuery.data} />
              {canRecordPayments &&
              listRowForSelectedInvoice &&
              listRowForSelectedInvoice.bill.status !== "PAID" &&
              listRowForSelectedInvoice.bill.dueCents > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t pt-4 print:hidden">
                  <Button
                    onClick={() =>
                      openRecordPayment(
                        listRowForSelectedInvoice.bill,
                        selectedInvoiceId,
                      )
                    }
                  >
                    Record payment
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
