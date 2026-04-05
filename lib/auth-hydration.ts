"use client";

import * as React from "react";
import { useAuthStore } from "@/store/auth-store";

/** True after zustand persist has rehydrated from storage (client only). */
export function useAuthHydration(): boolean {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const p = useAuthStore.persist;
    if (!p) {
      setReady(true);
      return;
    }
    const done = () => setReady(true);
    if (p.hasHydrated()) done();
    else return p.onFinishHydration(done);
  }, []);

  return ready;
}
