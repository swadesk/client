"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { MenuCategory } from "@/types/menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CategorySidebar({
  className,
  categories,
  activeCategoryId,
  onSelect,
  onCreateCategory,
  isCreatingCategory,
}: {
  className?: string;
  categories: MenuCategory[];
  activeCategoryId: string;
  onSelect: (categoryId: string) => void;
  onCreateCategory?: (name: string) => void;
  isCreatingCategory?: boolean;
}) {
  const [draftName, setDraftName] = React.useState("");
  React.useEffect(() => {
    if (categories.length > 0) setDraftName("");
  }, [categories.length]);

  const categoryButtons = categories.map((c) => (
    <Button
      key={c.id}
      variant="ghost"
      size="sm"
      className={cn(
        "shrink-0 rounded-full px-4 font-medium transition-colors",
        c.id === activeCategoryId
          ? "bg-primary/10 font-semibold text-primary ring-2 ring-primary/20"
          : "hover:bg-muted/60",
      )}
      onClick={() => onSelect(c.id)}
    >
      {c.name}
    </Button>
  ));

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03]",
        className,
      )}
    >
      <div className="shrink-0 p-4">
        <div className="text-sm font-semibold">Categories</div>
        <div className="text-xs text-muted-foreground">
          Manage and browse items
        </div>
      </div>
      {/* Mobile: horizontal scrollable pills */}
      {categories.length > 0 ? (
        <div className="overflow-x-auto px-4 pb-4 lg:hidden">
          <div className="flex gap-2 pb-1">{categoryButtons}</div>
        </div>
      ) : null}
      {categories.length === 0 && onCreateCategory ? (
        <div className="shrink-0 space-y-3 px-4 pb-4">
          <p className="text-sm text-muted-foreground">
            Add a category first, then you can add menu items under it.
          </p>
          <div className="space-y-2">
            <Label htmlFor="new-category-name">Category name</Label>
            <Input
              id="new-category-name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="e.g. Mains, Drinks"
              disabled={isCreatingCategory}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const n = draftName.trim();
                if (n && !isCreatingCategory) onCreateCategory(n);
              }}
            />
            <Button
              type="button"
              className="w-full"
              disabled={!draftName.trim() || isCreatingCategory}
              onClick={() => {
                const n = draftName.trim();
                if (n) onCreateCategory(n);
              }}
            >
              {isCreatingCategory ? "Creating…" : "Add category"}
            </Button>
          </div>
        </div>
      ) : null}
      {/* Desktop: fills column height */}
      {categories.length > 0 ? (
        <div className="hidden min-h-0 flex-1 flex-col overflow-hidden lg:flex">
          <ScrollArea className="min-h-0 flex-1 px-4 pt-0">
            <div className="space-y-2 pr-2">
              {categories.map((c) => (
                <Button
                  key={c.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start rounded-lg px-3 py-2.5 hover:bg-muted/60",
                    c.id === activeCategoryId &&
                      "border-l-2 border-l-primary bg-primary/10 font-medium text-primary",
                  )}
                  onClick={() => onSelect(c.id)}
                >
                  {c.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      ) : null}
      {onCreateCategory && categories.length > 0 ? (
        <div className="shrink-0 border-t border-border/60 p-4">
          <Label htmlFor="add-category-more" className="text-xs font-medium text-muted-foreground">
            Add another category
          </Label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              id="add-category-more"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Category name"
              disabled={isCreatingCategory}
              className="min-w-0 flex-1"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const n = draftName.trim();
                if (n && !isCreatingCategory) onCreateCategory(n);
              }}
            />
            <Button
              type="button"
              className="shrink-0 sm:w-auto"
              disabled={!draftName.trim() || isCreatingCategory}
              onClick={() => {
                const n = draftName.trim();
                if (n) onCreateCategory(n);
              }}
            >
              {isCreatingCategory ? "Adding…" : "Add"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
