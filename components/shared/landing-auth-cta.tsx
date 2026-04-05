"use client";

import Link from "next/link";

import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

function firstName(name: string | undefined) {
  if (!name) return "";
  const [head] = name.trim().split(/\s+/);
  return head ?? "";
}

export function LandingAuthCta({
  primaryButtonClassName,
  outlineButtonClassName,
}: {
  primaryButtonClassName: string;
  outlineButtonClassName: string;
}) {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <>
        <Link
          href="/login"
          className={cn(outlineButtonClassName, "hidden md:inline-flex")}
        >
          Sign in
        </Link>
        <Link href="/login" className={primaryButtonClassName}>
          Request a demo
        </Link>
      </>
    );
  }

  return (
    <Link href="/dashboard" className={primaryButtonClassName}>
      {firstName(user.name) ? `${firstName(user.name)} • Dashboard` : "Go to dashboard"}
    </Link>
  );
}
