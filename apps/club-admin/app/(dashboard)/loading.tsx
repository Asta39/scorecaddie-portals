import { HeaderSkeleton, StatGridSkeleton, RowsSkeleton } from '@/components/ui/page-skeletons'

// Shown while navigating between dashboard pages.
export default function Loading() {
  return (
    <div className="portal-content">
      <HeaderSkeleton action />
      <StatGridSkeleton count={4} />
      <div className="card p-6 mt-6">
        <RowsSkeleton rows={8} cols={4} />
      </div>
    </div>
  )
}
