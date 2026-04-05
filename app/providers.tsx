"use client";

import * as React from "react";
import { installSonnerToastSound } from "@/lib/sonner-toast-sound";
import { ThemeProvider } from "next-themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ToastSoundBridge } from "@/components/layout/toast-sound-bridge";
import { makeQueryClient } from "@/lib/query-client";
import { SessionBootstrap } from "@/components/auth/session-bootstrap";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => makeQueryClient());

  React.useLayoutEffect(() => {
    installSonnerToastSound();
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <SessionBootstrap />
        <RegisterServiceWorker />
        <TooltipProvider delay={0}>
          {children}
          <Toaster position="top-right" richColors closeButton />
          <ToastSoundBridge />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

