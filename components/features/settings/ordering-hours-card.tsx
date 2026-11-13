"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { WeeklyHours, WeekdayKey } from "@/types/api";

const DAY_ROWS: { key: WeekdayKey; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const DEFAULT_INTERVAL = { start: "09:00", end: "22:00" };

function defaultWeek(): WeeklyHours {
  return Object.fromEntries(
    DAY_ROWS.map(({ key }) => [key, [{ ...DEFAULT_INTERVAL }]]),
  ) as WeeklyHours;
}

type Props = {
  orderingEnabled: boolean;
  timezone: string;
  closedMessage: string;
  weeklyHours: WeeklyHours | null;
  saving?: boolean;
  onSave: (patch: {
    orderingEnabled?: boolean;
    timezone?: string;
    closedMessage?: string | null;
    weeklyHours?: WeeklyHours | null;
  }) => void;
};

export function OrderingHoursCard({
  orderingEnabled,
  timezone,
  closedMessage,
  weeklyHours,
  saving,
  onSave,
}: Props) {
  const orderingId = React.useId();
  const scheduleId = React.useId();
  const [enabled, setEnabled] = React.useState(orderingEnabled);
  const [useSchedule, setUseSchedule] = React.useState(weeklyHours != null);
  const [tz, setTz] = React.useState(timezone || "Asia/Kolkata");
  const [message, setMessage] = React.useState(closedMessage);
  const [hours, setHours] = React.useState<WeeklyHours>(weeklyHours ?? defaultWeek());

  React.useEffect(() => {
    setEnabled(orderingEnabled);
    setUseSchedule(weeklyHours != null);
    setTz(timezone || "Asia/Kolkata");
    setMessage(closedMessage);
    setHours(weeklyHours ?? defaultWeek());
  }, [orderingEnabled, timezone, closedMessage, weeklyHours]);

  const setDayOpen = (key: WeekdayKey, open: boolean) => {
    setHours((prev) => {
      const next = { ...prev };
      if (open) next[key] = [{ ...(prev[key]?.[0] ?? DEFAULT_INTERVAL) }];
      else next[key] = [];
      return next;
    });
  };

  const setDayTime = (key: WeekdayKey, field: "start" | "end", value: string) => {
    setHours((prev) => {
      const current = prev[key]?.[0] ?? { ...DEFAULT_INTERVAL };
      return {
        ...prev,
        [key]: [{ ...current, [field]: value }],
      };
    });
  };

  const handleSave = () => {
    onSave({
      orderingEnabled: enabled,
      timezone: tz.trim() || "Asia/Kolkata",
      closedMessage: message.trim() ? message.trim() : null,
      weeklyHours: useSchedule ? hours : null,
    });
  };

  return (
    <Card className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03] lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-lg">Ordering hours</CardTitle>
        <CardDescription>
          Schedule when the QR menu accepts orders. Guests see a closed message outside these hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={cn(
            "flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 p-4",
            enabled ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-muted",
          )}
        >
          <div className="min-w-0 space-y-1">
            <Label htmlFor={orderingId} className="text-sm font-medium leading-snug">
              Accepting QR orders
            </Label>
            <p id={`${orderingId}-desc`} className="text-xs text-muted-foreground">
              Turn off to close ordering immediately, even during scheduled hours.
            </p>
          </div>
          <Switch
            id={orderingId}
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-describedby={`${orderingId}-desc`}
          />
        </div>

        <div
          className={cn(
            "flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 p-4",
            useSchedule ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-muted",
          )}
        >
          <div className="min-w-0 space-y-1">
            <Label htmlFor={scheduleId} className="text-sm font-medium leading-snug">
              Use weekly schedule
            </Label>
            <p id={`${scheduleId}-desc`} className="text-xs text-muted-foreground">
              When off, the venue stays open whenever accepting orders is on.
            </p>
          </div>
          <Switch
            id={scheduleId}
            checked={useSchedule}
            onCheckedChange={(v) => {
              setUseSchedule(v);
              if (v && !weeklyHours) setHours(defaultWeek());
            }}
            aria-describedby={`${scheduleId}-desc`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ordering-timezone">Timezone</Label>
            <Input
              id="ordering-timezone"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              placeholder="Asia/Kolkata"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="closed-message">Closed message</Label>
            <Textarea
              id="closed-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="We are currently closed. Please check back during our open hours."
              rows={2}
            />
          </div>
        </div>

        {useSchedule ? (
          <>
            <Separator />
            <div className="space-y-3">
              {DAY_ROWS.map(({ key, label }) => {
                const open = (hours[key]?.length ?? 0) > 0;
                const interval = hours[key]?.[0] ?? DEFAULT_INTERVAL;
                return (
                  <div
                    key={key}
                    className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-[8rem] items-center justify-between gap-3 sm:justify-start">
                      <span className="text-sm font-medium">{label}</span>
                      <Switch checked={open} onCheckedChange={(v) => setDayOpen(key, v)} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        disabled={!open}
                        value={interval.start}
                        onChange={(e) => setDayTime(key, "start", e.target.value)}
                        className="w-[8.5rem]"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input
                        type="time"
                        disabled={!open}
                        value={interval.end}
                        onChange={(e) => setDayTime(key, "end", e.target.value)}
                        className="w-[8.5rem]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save hours"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
