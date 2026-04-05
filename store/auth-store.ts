import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types/auth";
import { setApiAccessTokenGetter, setApiAccessTokenSetter } from "@/lib/api-access-token";
import { disconnectKitchenSocket } from "@/lib/socket";

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: AuthUser) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: (accessToken, user) => set({ accessToken, user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      signOut: () => {
        disconnectKitchenSocket();
        set({ accessToken: null, user: null });
      },
    }),
    { name: "qryte.auth" },
  ),
);

setApiAccessTokenGetter(() => useAuthStore.getState().accessToken ?? null);
setApiAccessTokenSetter((token) => useAuthStore.getState().setAccessToken(token));
