'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Renders a long list a page at a time; resets to page 1 when the list changes. */
export function usePaged<T>(items: T[], pageSize = 50) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))

  useEffect(() => { setPage(1) }, [items.length, pageSize])

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  )

  return { page: Math.min(page, pageCount), setPage, pageCount, pageItems, total: items.length, pageSize }
}

export function Pager({
  page, pageCount, setPage, total, pageSize,
}: { page: number; pageCount: number; setPage: (p: number) => void; total: number; pageSize: number }) {
  if (pageCount <= 1) return null
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-text-muted border-t border-light">
      <span>{first}–{last} of {total}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-light disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="tabular-nums">{page} / {pageCount}</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= pageCount}
          className="p-1.5 rounded-lg border border-light disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
