import { Skeleton } from "@/components/ui/skeleton"

// Building blocks for page-shaped loading states. Compose them to mirror the
// real layout, so content doesn't jump when data arrives.

export function HeaderSkeleton({ icon = false, action = false }: { icon?: boolean; action?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        {icon && <Skeleton className="h-12 w-12 rounded-xl" />}
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      {action && <Skeleton className="h-10 w-28 rounded-xl" />}
    </div>
  )
}

export function TabsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-4 border-b border-light mb-6 pb-2">
      {Array.from({ length: count }, (_, i) => <Skeleton key={i} className="h-6 w-24" />)}
    </div>
  )
}

export function CardSkeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`card p-6 space-y-3 ${className}`}>
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  )
}

export function FormSkeleton({ sections = 3, fields = 3 }: { sections?: number; fields?: number }) {
  return (
    <div className="space-y-8">
      {Array.from({ length: sections }, (_, s) => (
        <div key={s} className="card p-6 space-y-5">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: fields }, (_, f) => (
            <div key={f} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function RowsSkeleton({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className={`h-9 ${c === 0 ? "w-16" : "flex-1"}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card p-5 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}
