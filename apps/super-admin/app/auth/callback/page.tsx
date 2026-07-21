'use client'

import { useEffect, useState } from 'react'

/**
 * Auth callback — establishes a session from whichever link format Supabase sent.
 *
 * This must be a client page, not a server Route Handler. Any admin/
 * dashboard-triggered link (e.g. Supabase dashboard's "Send recovery")
 * delivers the session via the *implicit* flow: tokens arrive in the URL
 * fragment (#access_token=...&type=recovery), and fragments are never sent
 * to the server at all.
 *
 * The actual session establishment happens server-side via
 * /api/auth/set-session, not here — calling supabase.auth.setSession() on
 * the browser client writes cookies via document.cookie, which was not
 * reliably visible to the server on the very next request (confirmed on
 * club-admin's identical setup via runtime logs: middleware logged "Auth
 * session missing!" repeatedly). This page's only job is to extract
 * whichever token format is present and hand it to that endpoint, which
 * returns a real Set-Cookie header.
 */
export default function AuthCallbackPage() {
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const tokenHash = url.searchParams.get('token_hash')
      const type = url.searchParams.get('type')
      const next = url.searchParams.get('next') ?? '/update-password'

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      const errorDescription =
        url.searchParams.get('error_description') ||
        hashParams.get('error_description') ||
        url.searchParams.get('error') ||
        hashParams.get('error')

      if (errorDescription) {
        setError(decodeURIComponent(errorDescription).replace(/\+/g, ' '))
        return
      }

      if (!(accessToken && refreshToken) && !code && !(tokenHash && type)) {
        setError('No auth token present in the link')
        return
      }

      try {
        const res = await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
            code,
            token_hash: tokenHash,
            type,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'This link is invalid or has expired.')
        }

        window.location.href = next
      } catch (err: any) {
        console.error('Auth callback failed:', err)
        setError(err?.message || 'This link is invalid or has expired.')
      }
    }

    run()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      {error ? (
        <div className="text-sm text-center max-w-sm px-6">
          <p className="text-destructive font-medium mb-2">{error}</p>
          <a href="/login" className="underline text-muted-foreground">Back to sign in</a>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      )}
    </div>
  )
}
