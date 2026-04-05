"use client";

import * as React from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getExistingPushSubscription,
  getVapidPublicKey,
  isPwaPushRuntimeEnabled,
  registerPushSubscriptionWithServer,
  subscribeWebPush,
} from "@/lib/web-push-client";
import { useRestaurantStore } from "@/store/restaurant-store";
import { useAuthStore } from "@/store/auth-store";

/**
 * Web Push when `NODE_ENV === "production"` or `NEXT_PUBLIC_ENABLE_PUSH=1`, plus `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
 * Needs HTTPS (except localhost). API must accept `/api/push/register` proxy and send pushes with VAPID private key.
 */
export function EnablePushNotificationsButton() {
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = React.useState(false);
  const [checked, setChecked] = React.useState(false);
  const [subscribed, setSubscribed] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const vapidOk = Boolean(getVapidPublicKey());
  const pushRuntime = isPwaPushRuntimeEnabled();
  const apisOk =
    mounted && typeof window !== "undefined" && "PushManager" in window && "Notification" in window;

  React.useEffect(() => {
    if (!mounted || !user || !pushRuntime || !vapidOk || !apisOk) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    void getExistingPushSubscription()
      .then((s) => {
        if (!cancelled) setSubscribed(Boolean(s));
      })
      .catch(() => {
        if (!cancelled) setSubscribed(false);
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, user, pushRuntime, vapidOk, apisOk]);

  if (!mounted || !user || !pushRuntime || !vapidOk || !apisOk || !checked) return null;

  if (subscribed) {
    return (
      <Button variant="outline" size="sm" className="hidden rounded-xl md:inline-flex" disabled>
        <BellRing className="mr-1 size-4" />
        Push on
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="hidden rounded-xl md:inline-flex"
      onClick={async () => {
        try {
          const perm = await Notification.requestPermission();
          if (perm !== "granted") {
            toast.error("Allow notifications in your browser to use push alerts.");
            return;
          }
          const sub = await subscribeWebPush();
          if (!sub) {
            toast.error("Push is not available on this device or install is incomplete.");
            return;
          }
          const res = await registerPushSubscriptionWithServer({
            subscription: sub.toJSON(),
            restaurantId: restaurantId ?? null,
          });
          if (!res.ok) {
            let msg = `Could not save subscription (${res.status})`;
            try {
              const j = (await res.json()) as { message?: unknown };
              if (typeof j.message === "string") msg = j.message;
            } catch {
              /* ignore */
            }
            toast.error(msg);
            return;
          }
          setSubscribed(true);
          toast.success("Background push alerts enabled for this device");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Push setup failed");
        }
      }}
    >
      <BellRing className="mr-1 size-4" />
      Push alerts
    </Button>
  );
}
