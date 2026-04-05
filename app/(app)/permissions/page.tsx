"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { api, type ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { isSuperAdmin } from "@/lib/auth-routing";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryState } from "@/components/shared/query-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Restaurant } from "@/types/restaurant";

function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && "message" in e;
}

export default function PermissionsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const [rejectFor, setRejectFor] = React.useState<Restaurant | null>(null);
  const [reason, setReason] = React.useState("");

  const superAdmin = isSuperAdmin(user);

  React.useEffect(() => {
    if (user && !superAdmin) router.replace("/dashboard");
  }, [user, superAdmin, router]);

  const query = useQuery({
    queryKey: ["super-admin", "pending"],
    queryFn: () => api.superAdmin.pendingRestaurants(),
    enabled: superAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.superAdmin.approveRestaurant(id),
    onSuccess: async (data) => {
      if (data.user) {
        setSession(data.token, data.user);
      } else {
        const { setAccessToken } = useAuthStore.getState();
        setAccessToken(data.token);
        const { user: nextUser } = await api.auth.me();
        setSession(data.token, nextUser);
      }
      toast.success("Venue approved");
      void qc.invalidateQueries({ queryKey: ["super-admin", "pending"] });
      void qc.invalidateQueries({ queryKey: ["restaurants"] });
    },
    onError: (e) => toast.error(isApiError(e) ? e.message : "Approve failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason: r }: { id: string; reason?: string }) =>
      api.superAdmin.rejectRestaurant(id, r ? { reason: r } : undefined),
    onSuccess: () => {
      toast.success("Venue rejected");
      setRejectFor(null);
      setReason("");
      void qc.invalidateQueries({ queryKey: ["super-admin", "pending"] });
      void qc.invalidateQueries({ queryKey: ["restaurants"] });
    },
    onError: (e) => toast.error(isApiError(e) ? e.message : "Reject failed"),
  });

  if (user && !superAdmin) {
    return (
      <EmptyState
        title="Only super admins can view permissions"
        description="You are being redirected to the dashboard."
      />
    );
  }

  const restaurants = query.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Permissions"
        description="Review and manage restaurant onboarding access requests."
      />

      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        empty={!query.isLoading && !query.isError && restaurants.length === 0}
        errorFallbackMessage="Failed to load access requests."
        loadingSkeleton={<div className="h-56 animate-pulse rounded-2xl bg-muted/40" />}
        emptyState={
          <EmptyState
            title="No pending requests"
            description="New restaurant onboarding requests will appear here."
          />
        }
      >
        <div className="overflow-hidden rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venue</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[220px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restaurants.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <div>{r.name}</div>
                    {r.address ? (
                      <div className="mt-0.5 text-xs font-normal text-muted-foreground">{r.address}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.gstin ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-full">
                      {r.approvalStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(r.id)}
                      >
                        <Check className="mr-1 size-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={rejectMutation.isPending}
                        onClick={() => setRejectFor(r)}
                      >
                        <X className="mr-1 size-4" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </QueryState>

      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject {rejectFor?.name}</DialogTitle>
            <DialogDescription>Optional note for internal records.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejectFor) return;
                rejectMutation.mutate({ id: rejectFor.id, reason: reason.trim() || undefined });
              }}
            >
              Reject venue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
