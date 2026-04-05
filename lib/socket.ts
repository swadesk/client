import { io, type Socket } from "socket.io-client";
import { getApiOrigin } from "@/lib/api-origin";

let socket: Socket | null = null;
let lastKey: string | null = null;

export function disconnectKitchenSocket(): void {
  socket?.disconnect();
  socket = null;
  lastKey = null;
}

/**
 * Kitchen namespace `/kitchen` with JWT and restaurantId (see NamasQR Socket.IO guide).
 */
export function getKitchenSocket(
  restaurantId: string | null,
  token: string | null,
): Socket | null {
  if (typeof window === "undefined") return null;

  const rawSocket = process.env.NEXT_PUBLIC_SOCKET_ORIGIN?.trim();
  const origin = rawSocket
    ? rawSocket.replace(/\/$/, "")
    : getApiOrigin();

  if (!origin) return null;

  if (!restaurantId || !token) {
    disconnectKitchenSocket();
    return null;
  }

  const key = `${restaurantId}:${token}`;
  if (lastKey !== key) {
    disconnectKitchenSocket();
    lastKey = key;
  }

  if (!socket) {
    socket = io(`${origin}/kitchen`, {
      path: "/socket.io/",
      // Keep both transports for compatibility with proxies / sticky-session setups.
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: {
        token,
        accessToken: token,
        authorization: `Bearer ${token}`,
        restaurantId,
      },
      query: {
        restaurantId,
        token,
        accessToken: token,
      },
    });

    socket.on("connect_error", (err) => {
      // Useful for diagnosing env/handshake mismatch without crashing UI.
      console.warn("[socket] kitchen connect_error", err?.message ?? err);
    });
  }

  return socket;
}
