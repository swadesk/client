"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { FlowShell } from "@/components/layout/flow-shell";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

export default function RejectedPage() {
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <FlowShell>
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-8 flex size-20 items-center justify-center rounded-3xl bg-red-500/15 ring-1 ring-red-400/30">
          <Ban className="size-10 text-red-300" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Application not approved</h1>
        <p className="mx-auto mt-4 text-pretty text-sm leading-relaxed text-white/65 sm:text-base">
          This venue request was not approved. Contact NamasQr support if you believe this is a mistake, or register a
          new request with updated details.
        </p>
        <Button
          className="mt-10 h-12 rounded-xl bg-white text-[hsl(222_47%_11%)] hover:bg-white/90"
          onClick={() => {
            signOut();
            router.replace("/login");
          }}
        >
          Sign out and return to sign in
        </Button>
      </div>
    </FlowShell>
  );
}
