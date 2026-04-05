"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

export function FlowShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <div
      className={cn(
        "relative min-h-dvh w-full overflow-hidden",
        "bg-[hsl(222_47%_11%)] text-white",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% -10%, hsl(24 95% 55% / 0.2), transparent 50%), radial-gradient(ellipse 60% 40% at 100% 100%, hsl(222 60% 35% / 0.35), transparent 55%), linear-gradient(180deg, hsl(222 44%_8%) 0%, hsl(222 47%_6%) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <header className="relative z-10 border-b border-white/[0.06] bg-black/10 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/login" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <div className="rounded-xl bg-white p-2 shadow-lg ring-1 ring-white/20">
              <Image
                src="/branding/namasqr-logo.svg"
                alt="NamasQr"
                width={120}
                height={32}
                className="h-7 w-auto"
                unoptimized
              />
            </div>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50 sm:block">
              Tradition meets technology
            </span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 rounded-xl text-white/90 hover:bg-white/10 hover:text-white"
            onClick={() => {
              signOut();
              router.replace("/login");
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {(title || subtitle) && (
          <div className="mb-10 text-center sm:mb-12">
            {title ? (
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
            ) : null}
            {subtitle ? (
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/65 sm:text-base">{subtitle}</p>
            ) : null}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
