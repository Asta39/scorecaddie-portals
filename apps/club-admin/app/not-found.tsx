import Link from 'next/link'
import { Mascot } from '@/components/mascot'
import { getServerAdmin } from '@/lib/server-admin'

export default async function NotFound() {
  let mascot: string | null = null
  try {
    mascot = (await getServerAdmin())?.mascot ?? null
  } catch {
    // Signed out or no club: the default mascot will do.
  }
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
      <span className="font-mono text-5xl font-semibold text-primary">404</span>
      <Mascot mascot={mascot} size={110} hop />
      <h1 className="text-xl font-bold">This page is in the rough.</h1>
      <p className="text-sm text-muted-foreground">The link may be old, or the page has moved.</p>
      <Link href="/dashboard" className="btn-primary mt-2">Back to the dashboard</Link>
    </div>
  )
}
