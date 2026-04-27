"use client";

import * as React from "react";
import { Copy, Download, QrCode } from "lucide-react";
import { toast } from "sonner";
import type { Room } from "@/types/room";
import { getPublicWebAppOrigin } from "@/lib/qr-menu-url";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function buildRoomQrUrl(restaurantId: string, roomId: string): string {
  const origin = getPublicWebAppOrigin();
  const path = `/qr-menu/${encodeURIComponent(restaurantId)}/${encodeURIComponent(`room_${roomId}`)}?pickTable=1&roomId=${encodeURIComponent(roomId)}`;
  return origin ? `${origin}${path}` : path;
}

export function RoomQrDialog({
  open,
  onOpenChange,
  restaurantId,
  room,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string | null;
  room: Room | null;
}) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const url = React.useMemo(() => {
    if (!restaurantId || !room) return "";
    return buildRoomQrUrl(restaurantId, room.id);
  }, [restaurantId, room]);

  React.useEffect(() => {
    if (!open || !restaurantId || !room || !url) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    setPending(true);
    void import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(url, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: "#0f172a", light: "#ffffff" },
        }),
      )
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        toast.error("Could not generate QR code");
        if (!cancelled) setDataUrl(null);
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, restaurantId, room, url]);

  const copyLink = () => {
    if (!url) return;
    void navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  const downloadPng = () => {
    if (!dataUrl || !room) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `room-${room.name.replaceAll(/[^a-z0-9_-]+/gi, "-").toLowerCase()}-qr.png`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-5" />
            Room QR — {room?.name ?? "—"}
          </DialogTitle>
          <DialogDescription>
            Print this code and place it at the room entrance / host stand. Guests can open the menu
            and pick a table.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-muted/30 p-6">
            {pending ? (
              <div className="flex h-[200px] w-[200px] items-center justify-center text-sm text-muted-foreground">
                Generating…
              </div>
            ) : dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dataUrl} alt="" className="size-[200px] max-w-full" />
            ) : (
              <div className="text-sm text-muted-foreground">QR unavailable</div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="room-qr-url">Order link</Label>
            <div className="flex gap-2">
              <Input id="room-qr-url" readOnly value={url} className="font-mono text-xs" />
              <Button type="button" variant="secondary" size="icon" onClick={copyLink} aria-label="Copy link">
                <Copy className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" className="flex-1" onClick={downloadPng} disabled={!dataUrl}>
              <Download className="mr-2 size-4" />
              Download PNG
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

