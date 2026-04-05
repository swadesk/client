import { Skeleton } from "@/components/ui/skeleton";

export function AuthLoadingSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col gap-4 bg-muted/40 p-6 md:p-10">
      <Skeleton className="h-10 w-64 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 flex-1 rounded-xl" />
    </div>
  );
}
