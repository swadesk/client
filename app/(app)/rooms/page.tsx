"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DoorClosed, Plus, QrCode, Trash2, UserRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Room } from "@/types/room";
import type { AdminAssignRoomRequest, AdminCreateRoomRequest } from "@/types/api";
import { api, type ApiError } from "@/lib/api";
import { useRestaurantStore, useActiveRestaurant } from "@/store/restaurant-store";
import { useAuthStore } from "@/store/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryState } from "@/components/shared/query-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { canAccessRouteForUser } from "@/components/layout/nav-items";
import { getPostAuthRedirectPath } from "@/lib/auth-routing";
import { RoomQrDialog } from "@/components/features/rooms/room-qr-dialog";

function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && "message" in e;
}

export default function RoomsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const activeRestaurant = useActiveRestaurant();
  const hasRoomSections = Boolean(activeRestaurant?.roomSections?.trim());
  const user = useAuthStore((s) => s.user);
  const canViewRooms = canAccessRouteForUser(user, "/rooms");
  const canManageRooms = user?.role === "Admin" || user?.role === "Manager";

  const [createOpen, setCreateOpen] = React.useState(false);
  const [roomName, setRoomName] = React.useState("");
  const [qrRoom, setQrRoom] = React.useState<Room | null>(null);
  const [deleteRoom, setDeleteRoom] = React.useState<Room | null>(null);

  React.useEffect(() => {
    if (user && !canViewRooms) router.replace(getPostAuthRedirectPath(user));
  }, [user, canViewRooms, router]);

  const roomsQuery = useQuery({
    queryKey: ["admin.rooms", restaurantId],
    queryFn: () => api.admin.rooms(restaurantId!),
    enabled: !!restaurantId,
  });

  const waitersQuery = useQuery({
    queryKey: ["admin.waiters", restaurantId],
    queryFn: () => api.admin.waiters(restaurantId!),
    enabled: !!restaurantId,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: AdminCreateRoomRequest) => api.admin.createRoom(payload),
    onSuccess: async () => {
      toast.success("Room created");
      setRoomName("");
      setCreateOpen(false);
      await qc.invalidateQueries({ queryKey: ["admin.rooms", restaurantId] });
    },
    onError: (e) => toast.error(isApiError(e) ? e.message : "Create room failed"),
  });

  const assignMutation = useMutation({
    mutationFn: (payload: AdminAssignRoomRequest) => api.admin.assignRoomToWaiter(payload),
    onSuccess: async () => {
      toast.success("Room updated");
      await qc.invalidateQueries({ queryKey: ["admin.rooms", restaurantId] });
    },
    onError: (e) => toast.error(isApiError(e) ? e.message : "Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ rid, roomId }: { rid: string; roomId: string }) =>
      api.admin.deleteRoom(rid, roomId),
    onSuccess: async () => {
      toast.success("Room deleted");
      setDeleteRoom(null);
      await qc.invalidateQueries({ queryKey: ["admin.rooms", restaurantId] });
    },
    onError: (e) => toast.error(isApiError(e) ? e.message : "Delete failed"),
  });

  if (!restaurantId) {
    return (
      <div className="space-y-12">
        <PageHeader
          title="Rooms"
          description="Create rooms/areas and assign a waiter for each area."
        />
        <EmptyState
          title="Select a restaurant"
          description="Choose a restaurant in the header to manage rooms."
        />
      </div>
    );
  }

  if (user && !canViewRooms) {
    return (
      <EmptyState
        title="Rooms"
        description="You are being redirected to your allowed workspace."
      />
    );
  }

  if (!hasRoomSections) {
    return (
      <div className="space-y-12">
        <PageHeader
          title="Rooms"
          description="Create rooms/areas and assign a waiter for each area."
        />
        <EmptyState
          title="Room setup required"
          description="Room / dining sections were not provided during onboarding, so room setup is hidden for this venue."
        />
      </div>
    );
  }

  const rooms = roomsQuery.data ?? [];
  const waiters = waitersQuery.data ?? [];
  const waiterIdToName = new Map(waiters.map((w) => [w.id, w.name]));
  const assignedCount = rooms.filter((r) => !!r.waiterId).length;
  const unassignedCount = rooms.length - assignedCount;

  return (
    <div className="space-y-12">
      <PageHeader
        title="Rooms"
        description="Create rooms/areas, assign a waiter, and generate a room QR for guest entry."
        actions={
          canManageRooms ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add room
            </Button>
          ) : undefined
        }
      />

      <QueryState
        isLoading={roomsQuery.isLoading || waitersQuery.isLoading}
        isError={roomsQuery.isError || waitersQuery.isError}
        error={roomsQuery.error ?? waitersQuery.error}
        onRetry={() => {
          void roomsQuery.refetch();
          void waitersQuery.refetch();
        }}
        empty={!roomsQuery.isLoading && !roomsQuery.isError && rooms.length === 0}
        errorFallbackMessage="Failed to load rooms."
        loadingSkeleton={<div className="h-56 animate-pulse rounded-2xl bg-muted/40" />}
        emptyState={
          <EmptyState
            title="No rooms"
            description={
              canManageRooms
                ? "Create your first room to assign staff and generate a room QR."
                : "Rooms will appear once an admin creates them."
            }
            primaryAction={
              canManageRooms ? { label: "Add room", onClick: () => setCreateOpen(true) } : undefined
            }
          />
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <DoorClosed className="size-4" />
              Rooms
            </div>
            <div className="mt-2 text-2xl font-semibold">{rooms.length}</div>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <UserRound className="size-4" />
              Assigned
            </div>
            <div className="mt-2 text-2xl font-semibold">{assignedCount}</div>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <UserRound className="size-4 opacity-60" />
              Unassigned
            </div>
            <div className="mt-2 text-2xl font-semibold">{unassignedCount}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rooms.map((r) => {
            const assignedName = r.waiterId ? waiterIdToName.get(r.waiterId) ?? null : null;
            return (
              <Card
                key={r.id}
                className="rounded-2xl border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] dark:border-white/[0.08] dark:bg-white/[0.02]"
              >
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{r.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {assignedName ? `Assigned to ${assignedName}` : "Unassigned"}
                    </p>
                  </div>
                  <Badge variant={r.waiterId ? "default" : "secondary"}>
                    {r.waiterId ? "Assigned" : "Unassigned"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground">Assigned waiter</Label>
                    {canManageRooms ? (
                      <Select
                        value={r.waiterId ?? "__none__"}
                        onValueChange={(v) => {
                          assignMutation.mutate({
                            restaurantId,
                            roomId: r.id,
                            waiterId: v === "__none__" ? null : v,
                          });
                        }}
                        disabled={assignMutation.isPending}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Unassigned</SelectItem>
                          {waiters.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {assignedName ?? "Unassigned"}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setQrRoom(r)}>
                      <QrCode className="mr-2 size-4" />
                      Room QR
                    </Button>
                    {canManageRooms ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteRoom(r)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </QueryState>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add room</DialogTitle>
            <DialogDescription>Example: Main hall, Patio, Private room.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="room-name">Room name</Label>
            <Input
              id="room-name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Main hall"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const name = roomName.trim();
                if (!name) {
                  toast.error("Enter a room name");
                  return;
                }
                createMutation.mutate({ restaurantId, name });
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Saving…" : "Create room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteRoom} onOpenChange={(o) => !o && setDeleteRoom(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete room</DialogTitle>
            <DialogDescription>
              This removes <span className="font-medium">{deleteRoom?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRoom(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteRoom) return;
                deleteMutation.mutate({ rid: restaurantId, roomId: deleteRoom.id });
              }}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RoomQrDialog
        open={!!qrRoom}
        onOpenChange={(o) => !o && setQrRoom(null)}
        restaurantId={restaurantId}
        room={qrRoom}
      />
    </div>
  );
}

