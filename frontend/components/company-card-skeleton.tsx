import { Skeleton } from "@/components/ui/skeleton"

export function CompanyCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  )
}
