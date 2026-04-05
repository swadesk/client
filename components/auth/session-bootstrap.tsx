"use client";

import * as React from "react";
import { api, type ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && "status" in e;
}

async function bootstrapSession(): Promise<void> {
  const { accessToken, setUser, setAccessToken, signOut } = useAuthStore.getState();
  if (!accessToken) return;
  try {
    const { user } = await api.auth.me();
    setUser(user);
  } catch (e) {
    if (isApiError(e) && e.status === 401) {
      try {
        const { token } = await api.auth.refresh();
        setAccessToken(token);
        const { user } = await api.auth.me();
        setUser(user);
      } catch {
        signOut();
      }
    }
  }
}

/** Validates persisted JWT via /auth/me; refreshes on 401. */
export function SessionBootstrap() {
  const ran = React.useRef(false);

  React.useEffect(() => {
    const p = useAuthStore.persist;
    if (!p) return;

    const finish = () => {
      if (ran.current) return;
      ran.current = true;
      void bootstrapSession();
    };

    if (p.hasHydrated()) finish();
    return p.onFinishHydration(finish);
  }, []);

  return null;
}
