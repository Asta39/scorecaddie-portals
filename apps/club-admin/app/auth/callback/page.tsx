'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

/**
 * Auth callback — establishes a session from whichever link format Supabase sent.
 *
 * This must be a client page, not a server Route Handler. Admin-generated
 * links (supabaseAdmin.auth.admin.generateLink(), used by the club-admin
 * invite flow) deliver the session via the *implicit* flow: tokens arrive in
 * the URL fragment (#access_token=...&refresh_token=...&type=recovery).
 * Fragments are never sent to the server — a Route Handler literally cannot
 * see them, which is why invite links were failing ("expired or already
 * used" immediately, even for the actual recipient). Client-initiated flows
 * (e.g. a user clicking "Forgot password?" themselves) use PKCE instead,
 * delivering a `?code=` query param. This page handles both, plus the
 * OTP `?token_hash=&type=` email-template format, and picks whichever is
 * present.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    const run = async () => {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const tokenHash = url.searchParams.get('token_hash')
      const type = url.searchParams.get('type')
      const next = url.searchParams.get('next') ?? '/auth/confirm'

      // Implicit flow: tokens live in the fragment, e.g.
      // #access_token=...&refresh_token=...&type=recovery
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      // Supabase reports a failed verify (expired/used/invalid link) via an
      // `error`/`error_description` param instead of a token, in either the
      // query string or the fragment. Surface that real reason instead of a
      // generic message.
      const errorDescription =
        url.searchParams.get('error_description') ||
        hashParams.get('error_description') ||
        url.searchParams.get('error') ||
        hashParams.get('error')

      try {
        if (errorDescription) {
          throw new Error(decodeURIComponent(errorDescription).replace(/\+/g, ' '))
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            type: type as any,
            token_hash: tokenHash,
          })
          if (error) throw error
        } else {
          throw new Error('No auth token present in the link')
        }

        router.replace(next)
      } catch (err: any) {
        console.error('Auth callback failed:', err)
        setError(err?.message || 'This link is invalid or has expired.')
      }
    }

    run()
  }, [router])

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
