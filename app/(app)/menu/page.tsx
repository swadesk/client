"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MenuCategory, MenuItem } from "@/types/menu";
import { api, type ApiError } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useRestaurantStore } from "@/store/restaurant-store";
import { useAuthStore } from "@/store/auth-store";
import { CategorySidebar } from "@/components/features/menu/category-sidebar";
import { MenuItemCard } from "@/components/features/menu/menu-item-card";
import {
  MenuItemDialog,
  type MenuItemFormState,
} from "@/components/features/menu/menu-item-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageHeader, SectionHeader } from "@/components/shared/page-header";
import {
  QueryState,
  MenuGridSkeleton,
} from "@/components/shared/query-state";
import { EmptyState } from "@/components/shared/empty-state";
import { normalizeAdminMenuPayload } from "@/lib/menu-normalize";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canAccessRouteForUser } from "@/components/layout/nav-items";
import { getPostAuthRedirectPath } from "@/lib/auth-routing";

const defaultForm = (): MenuItemFormState => ({
  categoryId: "",
  name: "",
  price: "249",
  description: "",
  imageUrl: "",
  imageFile: null,
  available: true,
});

export default function MenuPage() {
  const router = useRouter();
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const canViewMenu = canAccessRouteForUser(user, "/menu");
  const canUploadImage =
    user?.globalRole === "SuperAdmin" || user?.role === "Admin" || user?.role === "Manager";

  React.useEffect(() => {
    if (user && !canViewMenu) router.replace(getPostAuthRedirectPath(user));
  }, [user, canViewMenu, router]);

  const { data, isLoading, isError, refetch, error } = useQuery({
    queryKey: qk.adminMenu(restaurantId ?? ""),
    queryFn: () => api.admin.menu(restaurantId!),
    enabled: !!restaurantId && !!user && canViewMenu,
  });

  const { categories, items } = React.useMemo(
    () => normalizeAdminMenuPayload(data),
    [data],
  );
  const [activeCategoryId, setActiveCategoryId] = React.useState("");

  React.useEffect(() => {
    if (categories.length) {
      setActiveCategoryId((prev) =>
        prev && categories.some((c) => c.id === prev) ? prev : categories[0]!.id,
      );
    } else {
      setActiveCategoryId("");
    }
  }, [categories]);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MenuItem | null>(null);
  const [form, setForm] = React.useState<MenuItemFormState>(defaultForm);
  const [itemToDelete, setItemToDelete] = React.useState<MenuItem | null>(null);
  const [categoryToRename, setCategoryToRename] = React.useState<MenuCategory | null>(null);
  const [renameCategoryDraft, setRenameCategoryDraft] = React.useState("");
  const [categoryToDelete, setCategoryToDelete] = React.useState<MenuCategory | null>(null);
  const editingRef = React.useRef<MenuItem | null>(null);
  React.useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  function openAdd() {
    if (categories.length === 0) {
      toast.error("Add a category first");
      return;
    }
    setEditing(null);
    setForm({
      ...defaultForm(),
      categoryId: activeCategoryId || categories[0]?.id || "",
    });
    setOpen(true);
  }

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) =>
      api.admin.createCategory({ restaurantId: restaurantId!, name }),
    onSuccess: (cat) => {
      if (restaurantId) void qc.invalidateQueries({ queryKey: qk.adminMenu(restaurantId) });
      setActiveCategoryId(cat.id);
      toast.success("Category added");
    },
    onError: (err) =>
      toast.error((err as ApiError)?.message ?? "Failed to add category"),
  });

  function openEdit(item: MenuItem) {
    setEditing(item);
    setForm({
      categoryId: item.categoryId,
      name: item.name,
      price: String(item.priceCents / 100),
      description: item.description ?? "",
      imageUrl: item.imageUrl ?? "",
      imageFile: null,
      available: item.available,
    });
    setOpen(true);
  }

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const p = Number(form.price);
      const categoryId = form.categoryId;
      if (editing) {
        return api.admin.updateMenuItem(restaurantId!, editing.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          priceCents: Math.round(p * 100),
          available: form.available,
          categoryId,
          image: form.imageFile ?? undefined,
        });
      }
      return api.admin.createMenuItem({
        restaurantId: restaurantId!,
        categoryId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        priceCents: Math.round(p * 100),
        available: form.available,
        image: form.imageFile ?? undefined,
      });
    },
    onSuccess: () => {
      if (restaurantId) void qc.invalidateQueries({ queryKey: qk.adminMenu(restaurantId) });
      if (form.categoryId) setActiveCategoryId(form.categoryId);
      setOpen(false);
      toast.success(editing ? "Item updated" : "Item added");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save item");
    },
  });

  const availabilityMutation = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      api.admin.updateMenuItem(restaurantId!, id, { available }),
    onSuccess: () => {
      if (restaurantId) void qc.invalidateQueries({ queryKey: qk.adminMenu(restaurantId) });
      toast.success("Availability updated");
    },
    onError: () => toast.error("Failed to update availability"),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (payload: { categoryId: string; name: string }) =>
      api.admin.updateCategory({
        restaurantId: restaurantId!,
        categoryId: payload.categoryId,
        name: payload.name,
      }),
    onSuccess: () => {
      if (restaurantId) void qc.invalidateQueries({ queryKey: qk.adminMenu(restaurantId) });
      setCategoryToRename(null);
      toast.success("Category updated");
    },
    onError: (err) =>
      toast.error((err as ApiError)?.message ?? "Failed to rename category"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => api.admin.deleteCategory(restaurantId!, categoryId),
    onSuccess: (_, deletedId) => {
      toast.success("Category deleted");
      setCategoryToDelete(null);
      const rid = restaurantId;
      if (rid) {
        void qc.invalidateQueries({ queryKey: qk.adminMenu(rid) });
        void qc.invalidateQueries({ queryKey: qk.qrMenu(rid) });
      }
      setActiveCategoryId((prev) => (prev === deletedId ? "" : prev));
    },
    onError: (err) =>
      toast.error((err as ApiError)?.message ?? "Failed to delete category"),
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: (itemId: string) => api.admin.deleteMenuItem(restaurantId!, itemId),
    onSuccess: (_, deletedId) => {
      toast.success("Item deleted");
      setItemToDelete(null);
      const rid = restaurantId;
      if (rid) {
        void qc.invalidateQueries({ queryKey: qk.adminMenu(rid) });
        void qc.invalidateQueries({ queryKey: qk.qrMenu(rid) });
      }
      if (editingRef.current?.id === deletedId) {
        setOpen(false);
        setEditing(null);
      }
    },
    onError: () => toast.error("Failed to delete item"),
  });

  function upsert() {
    const p = Number(form.price);
    if (!form.name.trim()) return toast.error("Name is required");
    if (!Number.isFinite(p) || p <= 0) return toast.error("Price must be valid");
    if (!form.categoryId || !categories.some((c) => c.id === form.categoryId)) {
      return toast.error("Select a category");
    }
    upsertMutation.mutate();
  }

  const filtered = items.filter((i) => i.categoryId === activeCategoryId);

  const categoryBusyId =
    (updateCategoryMutation.isPending && updateCategoryMutation.variables?.categoryId) ||
    (deleteCategoryMutation.isPending && deleteCategoryMutation.variables) ||
    null;

  function openRenameCategory(cat: MenuCategory) {
    setCategoryToRename(cat);
    setRenameCategoryDraft(cat.name);
  }

  if (user && !canViewMenu) {
    return (
      <EmptyState
        title="Menu"
        description="You are being redirected to your allowed workspace."
      />
    );
  }

  if (!restaurantId) {
    return (
      <div className="space-y-12">
        <PageHeader
          title="Menu"
          description="Categories, items, pricing, and availability."
        />
        <EmptyState
          title="Select a restaurant"
          description="Choose a restaurant in the header to view and manage its menu."
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-8">
      <PageHeader
        title="Menu"
        description="Categories, items, pricing, and availability."
        actions={
          <Button
            onClick={openAdd}
            disabled={categories.length === 0}
            title={
              categories.length === 0
                ? "Create a category in the sidebar first"
                : undefined
            }
          >
            <Plus className="mr-2 size-4" />
            Add item
          </Button>
        }
      />

      <div
        className="grid min-h-0 gap-6 lg:h-[calc(100dvh-12rem)] lg:min-h-[min(480px,calc(100dvh-12rem))] lg:grid-cols-[280px_1fr] lg:items-stretch"
      >
        <div className="flex min-h-0 flex-col lg:h-full lg:min-h-0">
          <CategorySidebar
            className="h-full min-h-0"
            categories={categories}
            activeCategoryId={activeCategoryId}
            onSelect={setActiveCategoryId}
            onCreateCategory={(name) =>
              createCategoryMutation.mutate(name.trim())
            }
            isCreatingCategory={createCategoryMutation.isPending}
            onRenameCategory={openRenameCategory}
            onDeleteCategory={(c) => setCategoryToDelete(c)}
            categoryBusyId={categoryBusyId}
          />
        </div>

        <div
          className="flex min-h-[min(360px,50vh)] flex-col overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03] lg:h-full lg:min-h-0"
        >
          <div className="shrink-0 p-6 pb-4">
            <SectionHeader
              title={categories.find((c) => c.id === activeCategoryId)?.name ?? "Items"}
              right={
                <div className="text-xs text-muted-foreground">
                  {filtered.length} item{filtered.length === 1 ? "" : "s"}
                </div>
              }
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6">
            <QueryState
              isLoading={isLoading}
              isError={isError}
              error={error}
              onRetry={() => refetch()}
              empty={
                !isLoading &&
                !isError &&
                (categories.length === 0 || filtered.length === 0)
              }
              errorFallbackMessage="Failed to load menu."
              loadingSkeleton={<MenuGridSkeleton />}
              emptyState={
                categories.length === 0 ? (
                  <EmptyState
                    title="No categories yet"
                    description="Use the sidebar to add your first category (e.g. Mains, Drinks). Then you can add menu items."
                  />
                ) : (
                  <EmptyState
                    title="No items yet"
                    description="Add your first menu item to get started."
                    primaryAction={{ label: "Add item", onClick: openAdd }}
                  />
                )
              }
          >
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onEdit={openEdit}
                    onRequestDelete={(i) => setItemToDelete(i)}
                    onToggleAvailability={(id, nextAvail) =>
                      availabilityMutation.mutate({ id, available: nextAvail })
                    }
                    availabilityPending={
                      availabilityMutation.isPending &&
                      availabilityMutation.variables?.id === item.id
                    }
                  />
                ))}
              </div>
            </QueryState>
          </div>
        </div>
      </div>

      <MenuItemDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        form={form}
        categories={categories}
        onFormChange={(p) =>
          setForm((prev) => ({
            ...(prev ?? defaultForm()),
            ...p,
          }))
        }
        onSave={upsert}
        canUploadImage={canUploadImage}
      />

      <Dialog
        open={!!categoryToRename}
        onOpenChange={(next) => {
          if (!next) setCategoryToRename(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename category</DialogTitle>
            <DialogDescription>
              Update the name shown in your admin menu and guest QR menu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="rename-category">Name</Label>
            <Input
              id="rename-category"
              value={renameCategoryDraft}
              onChange={(e) => setRenameCategoryDraft(e.target.value)}
              disabled={updateCategoryMutation.isPending}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const name = renameCategoryDraft.trim();
                if (name && categoryToRename) {
                  updateCategoryMutation.mutate({
                    categoryId: categoryToRename.id,
                    name,
                  });
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryToRename(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                !renameCategoryDraft.trim() ||
                updateCategoryMutation.isPending ||
                (categoryToRename !== null &&
                  renameCategoryDraft.trim() === categoryToRename.name)
              }
              onClick={() => {
                if (!categoryToRename) return;
                const name = renameCategoryDraft.trim();
                if (!name) return;
                updateCategoryMutation.mutate({
                  categoryId: categoryToRename.id,
                  name,
                });
              }}
            >
              {updateCategoryMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!categoryToDelete}
        onOpenChange={(next) => {
          if (!next) setCategoryToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
            <DialogDescription>
              {categoryToDelete ? (
                <>
                  <span className="font-medium text-foreground">
                    “{categoryToDelete.name}”
                  </span>{" "}
                  will be removed. If it still has menu items, your API may reject this—move or delete
                  items first.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteCategoryMutation.isPending}
              onClick={() => {
                if (!categoryToDelete) return;
                deleteCategoryMutation.mutate(categoryToDelete.id);
              }}
            >
              {deleteCategoryMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!itemToDelete}
        onOpenChange={(next) => {
          if (!next) setItemToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete menu item?</DialogTitle>
            <DialogDescription>
              {itemToDelete
                ? `“${itemToDelete.name}” will be removed from your menu. This can’t be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMenuItemMutation.isPending}
              onClick={() => {
                if (!itemToDelete) return;
                deleteMenuItemMutation.mutate(itemToDelete.id);
              }}
            >
              {deleteMenuItemMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
