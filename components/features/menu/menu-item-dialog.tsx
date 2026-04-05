"use client";

import * as React from "react";
import type { MenuCategory, MenuItem } from "@/types/menu";
import { cn } from "@/lib/utils";
import { ImageAttachmentField } from "@/components/shared/image-attachment-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export type MenuItemFormState = {
  /** Target category for create; for edit, item can be moved to another category. */
  categoryId: string;
  name: string;
  price: string;
  description: string;
  /** Current image URL from the server (preview when not replacing with a new file). */
  imageUrl: string;
  /** New image file to send as multipart field `image`. */
  imageFile: File | null;
  available: boolean;
};

type MenuItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: MenuItem | null;
  form: MenuItemFormState | undefined;
  /** Defaults to [] if omitted (defensive for callers). */
  categories?: MenuCategory[];
  onFormChange: (next: Partial<MenuItemFormState>) => void;
  onSave: () => void;
  canUploadImage?: boolean;
};

const EMPTY_FORM: MenuItemFormState = {
  categoryId: "",
  name: "",
  price: "249",
  description: "",
  imageUrl: "",
  imageFile: null,
  available: true,
};

export function MenuItemDialog({
  open,
  onOpenChange,
  editing,
  form,
  categories = [],
  onFormChange,
  onSave,
  canUploadImage = true,
}: MenuItemDialogProps) {
  // Default params only replace `undefined`, not `null` — normalize for API / callers.
  const categoryList = React.useMemo(
    () => (Array.isArray(categories) ? categories : []),
    [categories],
  );
  const safeForm: MenuItemFormState = { ...EMPTY_FORM, ...(form ?? {}) };

  const onFormChangeRef = React.useRef(onFormChange);
  React.useEffect(() => {
    onFormChangeRef.current = onFormChange;
  });

  React.useEffect(() => {
    if (!open || categoryList.length === 0) return;
    if (!categoryList.some((c) => c.id === safeForm.categoryId)) {
      onFormChangeRef.current({ categoryId: categoryList[0]!.id });
    }
  }, [open, categoryList, safeForm.categoryId]);

  const categorySelectValue =
    categoryList.length === 0
      ? ""
      : categoryList.some((c) => c.id === safeForm.categoryId)
        ? safeForm.categoryId
        : categoryList[0]!.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit item" : "Add item"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="mi-category">Category</Label>
            <select
              id="mi-category"
              className={cn(
                "h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground",
                "outline-none transition-colors",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "dark:bg-input/30",
              )}
              value={categorySelectValue}
              onChange={(e) => onFormChange({ categoryId: e.target.value })}
              disabled={categoryList.length === 0}
            >
              {categoryList.length === 0 ? (
                <option value="">No categories — add one in the sidebar</option>
              ) : (
                categoryList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mi-name">Name</Label>
            <Input
              id="mi-name"
              value={safeForm.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mi-price">Price (₹)</Label>
            <Input
              id="mi-price"
              inputMode="decimal"
              placeholder="e.g. 249"
              value={safeForm.price}
              onChange={(e) => onFormChange({ price: e.target.value })}
            />
          </div>
          <ImageAttachmentField
            label="Image"
            description="Optional. JPEG, PNG, WebP, or GIF — max 5 MB. Sent with save (multipart field image)."
            existingUrl={safeForm.imageUrl}
            imageFile={safeForm.imageFile}
            onFileChange={(imageFile) => onFormChange({ imageFile })}
            disabled={!canUploadImage}
          />
          <div className="grid gap-2">
            <Label htmlFor="mi-desc">Description</Label>
            <Textarea
              id="mi-desc"
              value={safeForm.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="min-w-0">
              <div className="text-sm font-medium">Available</div>
              <div className="text-xs text-muted-foreground">
                Hide unavailable items from customers
              </div>
            </div>
            <Switch
              checked={safeForm.available}
              onCheckedChange={(checked) => onFormChange({ available: checked })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSave}>{editing ? "Save" : "Add"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
