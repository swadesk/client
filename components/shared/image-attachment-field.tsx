"use client";

import * as React from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { menuPhotoChain } from "@/lib/dish-photos";
import { MENU_IMAGE_FALLBACK } from "@/lib/menu-images";
import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 5 * 1024 * 1024;

type ImageAttachmentFieldProps = {
  label: string;
  description?: string;
  /** Saved image URL from the server (shown when no new file is selected). */
  existingUrl: string;
  /** New file to send with the next save (field name `image` or `photo` on the API). */
  imageFile: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  previewClassName?: string;
  /** Dish name. Used to show the bundled photo when the saved upload URL is missing. */
  photoName?: string;
};

/**
 * Pick a local image file to attach to a multipart admin request (no separate upload call).
 */
export function ImageAttachmentField({
  label,
  description,
  existingUrl,
  imageFile,
  onFileChange,
  disabled = false,
  previewClassName,
  photoName,
}: ImageAttachmentFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (!imageFile) {
      setObjectUrl(null);
      return;
    }
    const u = URL.createObjectURL(imageFile);
    setObjectUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [imageFile]);

  const chain = React.useMemo(() => {
    const remote = objectUrl || resolveMediaUrl(existingUrl);
    const photos = menuPhotoChain({ remote, name: photoName });
    if (photos.length === 0) return photos;
    return photos.includes(MENU_IMAGE_FALLBACK) ? photos : [...photos, MENU_IMAGE_FALLBACK];
  }, [objectUrl, existingUrl, photoName]);

  React.useEffect(() => {
    setStep(0);
  }, [chain]);

  const displaySrc = chain[Math.min(step, Math.max(chain.length - 1, 0))] || "";

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (disabled) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }
    onFileChange(file);
  }

  function clear() {
    onFileChange(null);
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <Label>{label}</Label>
        {description ? (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className={cn(
            "relative flex min-h-[100px] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/25",
            displaySrc ? "p-2" : "p-6",
            previewClassName,
          )}
        >
          {displaySrc ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displaySrc}
                alt={photoName || ""}
                className="max-h-[140px] w-full max-w-full object-contain"
                onError={() =>
                  setStep((current) => (current + 1 < chain.length ? current + 1 : current))
                }
              />
              {imageFile ? (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute right-2 top-2 size-8 rounded-full shadow-md"
                  onClick={clear}
                  aria-label="Discard new image"
              disabled={disabled}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
              <ImageIcon className="size-8 opacity-50" />
              <span className="text-xs">No image yet</span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:pt-0">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={onPick}
          />
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            <Upload className="size-4 shrink-0" />
            {displaySrc ? "Replace image" : "Choose image"}
          </Button>
        </div>
      </div>
    </div>
  );
}
