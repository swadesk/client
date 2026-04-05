"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { api, type ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && "message" in e;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim();
    if (!em) {
      toast.error("Enter your email");
      return;
    }
    setBusy(true);
    try {
      const res = await api.auth.forgotPassword({ email: em });
      toast.success(
        res.message ??
          "If an account exists for that email, you will receive reset instructions shortly.",
      );
      router.push("/login");
    } catch (err) {
      toast.error(isApiError(err) ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh w-full bg-background">
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10 sm:px-6">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>

        <div
          className={cn(
            "rounded-2xl border border-black/[0.06] bg-white p-6 shadow-lg",
            "dark:border-white/[0.08] dark:bg-white/[0.06]",
            "sm:p-8",
          )}
        >
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-muted/80 dark:bg-white/10">
              <Mail className="size-5 text-foreground/80" aria-hidden />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Forgot password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your work email. We’ll send reset instructions if an account exists.
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@restaurant.com"
              />
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
