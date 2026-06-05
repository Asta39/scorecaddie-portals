'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

/**
 * /auth/confirm — Set Password Page
 *
 * The user lands here after /auth/callback has already exchanged
 * the one-time code for a real session. We just need to:
 *  1. Verify the session is present
 *  2. Let them set their password
 *  3. Redirect to dashboard
 */
export default function ConfirmPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [sessionReady, setSessionReady] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // The callback route already set the session cookie.
    // Just verify it is accessible here on the client.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      } else {
        setError('Your activation link has expired or was already used. Please ask your administrator to resend the invitation.')
      }
    })
  }, [])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-primary)' }}>
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-16 text-white">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M14 3L25 9V19L14 25L3 19V9L14 3Z" fill="white" fillOpacity="0.9"/>
                <path d="M14 8L20 11.5V18.5L14 22L8 18.5V11.5L14 8Z" fill="white" fillOpacity="0.3"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>Score Caddie</p>
              <p className="text-lg font-bold">Club Admin</p>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Welcome aboard!
          </h1>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Set your password to activate your club secretary account and start managing your club's caddies.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-10">
          <div className="mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--color-lighter)' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 2L21 7V15L11 20L1 15V7L11 2Z" fill="var(--color-primary)"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
              Set your password
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Activate your club secretary account
            </p>
          </div>

          {!sessionReady && !error && (
            <div className="text-sm p-4 rounded-lg border flex items-center gap-3 mb-6"
              style={{ background: 'var(--color-lighter)', borderColor: 'var(--color-light)', color: 'var(--color-secondary)' }}>
              <svg className="animate-spin flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/>
              </svg>
              Verifying your activation link…
            </div>
          )}

          {error && !sessionReady && (
            <div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200 mb-6">
              {error}
              <div className="mt-3">
                <a href="/login" className="font-semibold underline">Back to sign in</a>
              </div>
            </div>
          )}

          {sessionReady && (
            <form onSubmit={handleSetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary justify-center py-3 text-base"
                style={{ background: loading ? 'var(--color-secondary)' : 'var(--color-primary)' }}
              >
                {loading ? 'Saving…' : 'Activate Account & Sign In →'}
              </button>
            </form>
          )}

          <p className="text-center text-xs mt-8" style={{ color: 'var(--color-light)' }}>
            This portal is restricted to authorized Score Caddie club secretaries.
          </p>
        </div>
      </div>
    </div>
  )
}
