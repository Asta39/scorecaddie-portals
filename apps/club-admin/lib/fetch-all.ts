// PostgREST returns at most 1000 rows per request, so a plain select
// silently stops there. This pages through with .range() until a short page
// comes back. Club-sized lists (members, caddies, a week of attendance) stay
// well within what a browser can hold; rendering is paged separately.

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

export async function fetchAll<T>(
  query: (from: number, to: number) => Page<T>,
  pageSize = 1000,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query(from, from + pageSize - 1)
    if (error) return { data: rows, error }
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < pageSize) return { data: rows, error: null }
  }
}
