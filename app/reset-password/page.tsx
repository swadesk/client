"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { api, type ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && "message" in e;
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) {
      toast.error("Invalid or missing reset link. Request a new one from sign in.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await api.auth.resetPassword({ token: token.trim(), password });
      toast.success("Password updated. Sign in with your new password.");
      router.replace("/login");
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errorCode === "INVALID_RESET_TOKEN") {
        toast.error(apiErr.message || "This reset link is invalid or has expired.");
      } else {
        toast.error(isApiError(err) ? err.message : "Could not reset password");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
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
            <KeyRound className="size-5 text-foreground/80" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Choose a strong password (min. 8 characters).</p>
        </div>

        {!token ? (
          <p className="text-center text-sm text-destructive">
            This page needs a valid token from your email link.{" "}
            <Link href="/forgot-password" className="font-medium underline underline-offset-4">
              Request a new reset
            </Link>
            .
          </p>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-dvh w-full bg-background">
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
