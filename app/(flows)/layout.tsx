import { AuthGuard } from "@/components/layout/auth-guard";
import { FlowAccessGate } from "@/components/layout/flow-access-gate";

export default function FlowsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <FlowAccessGate>{children}</FlowAccessGate>
    </AuthGuard>
  );
}
