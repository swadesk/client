import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/layout/auth-guard";
import { MainAppGate } from "@/components/layout/main-app-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <MainAppGate>
        <AppShell>{children}</AppShell>
      </MainAppGate>
    </AuthGuard>
  );
}

