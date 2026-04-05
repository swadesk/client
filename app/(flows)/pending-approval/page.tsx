"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api, type ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { FlowShell } from "@/components/layout/flow-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && "message" in e;
}

export default function PendingApprovalPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [busy, setBusy] = React.useState(false);

  async function refreshStatus() {
    setBusy(true);
    try {
      const { token } = await api.auth.refresh();
      const { user } = await api.auth.me();
      setSession(token, user);
      if (user.canAccessDashboard) {
        toast.success("You're approved — welcome in.");
        router.replace("/dashboard");
      } else {
        toast.message("Still pending review");
      }
    } catch (e) {
      toast.error(isApiError(e) ? e.message : "Could not refresh status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <FlowShell>
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-8 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400/20 to-orange-500/10 ring-1 ring-amber-400/30">
          <Clock className="size-10 text-amber-200" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Awaiting approval</h1>
        <p className="mx-auto mt-4 text-pretty text-sm leading-relaxed text-white/65 sm:text-base">
          Your venue is in the review queue. We&apos;ll email you when it&apos;s live. You can check again anytime.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Badge className="rounded-full border-amber-400/40 bg-amber-500/15 px-4 py-1.5 text-amber-100 hover:bg-amber-500/20">
            PendingApproval
          </Badge>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          className="mt-10 h-12 rounded-xl border-white/20 bg-white/10 px-8 text-white hover:bg-white/15"
          onClick={() => void refreshStatus()}
        >
          <RefreshCw className={busy ? "mr-2 size-4 animate-spin" : "mr-2 size-4"} />
          {busy ? "Checking…" : "I’ve been approved — refresh"}
        </Button>
      </div>
    </FlowShell>
  );
}
