'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Password Recovery / Activation States
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    // If there's a PKCE `code` param, forward to /auth/callback to exchange it
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      router.replace(`/auth/callback?code=${code}`)
      return
    }

    // Show expired-link error if redirected back from /auth/callback
    if (params.get('error') === 'link_expired') {
      setError('Your activation link has expired or was already used. Please ask your administrator to resend the invitation.')
    }

    // Legacy: detect hash-based token (older Supabase links without PKCE)
    const hash = window.location.hash
    if (
      hash.includes('type=recovery') ||
      hash.includes('type=signup') ||
      hash.includes('access_token=')
    ) {
      setIsRecoveryMode(true)

      // Manually extract and set the session so updateUser doesn't fail
      // if the automatic detection is delayed or blocked
      const hashParams = new URLSearchParams(hash.substring(1))
      const access_token = hashParams.get('access_token')
      const refresh_token = hashParams.get('refresh_token')
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
          if (error) {
            console.error('Manual setSession error:', error)
            setError('Your activation link has expired or was already used. Please ask your administrator to resend the invitation.')
          }
        })
      }
    }

    // Listen for PASSWORD_RECOVERY event (fires when hash token is consumed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const handleResetPassword = async (e: React.FormEvent) => {
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
      if (error.message.toLowerCase().includes('session')) {
        setError('Your activation link has expired. Please ask your administrator to resend the invitation.')
      } else {
        setError(error.message)
      }
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
          <div className="flex items-center gap-4 mb-6">
            <img src="/logo.png" alt="Score Caddie Logo" className="h-16 w-auto object-contain" />
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>Score Caddie</p>
              <p className="text-lg font-bold">Club Admin</p>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Club Secretary<br />Portal
          </h1>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Manage your club's caddie roster, daily attendance, payments, and marketplace visibility.
          </p>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-10">
          <div className="mb-8">
            <img src="/logo.png" alt="Score Caddie Logo" className="h-14 w-auto object-contain mb-4" />
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
              {isRecoveryMode ? 'Set your password' : 'Sign in'}
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {isRecoveryMode ? 'Activate your club secretary account' : 'Club Secretary access only'}
            </p>
          </div>

          {isRecoveryMode ? (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>New Password</label>
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
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Confirm New Password</label>
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
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="secretary@sigonagolfclub.com"
                  required
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  {error === 'Invalid login credentials' ? 'Incorrect email or password.' : error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary justify-center py-3 text-base"
                style={{ background: loading ? 'var(--color-secondary)' : 'var(--color-primary)' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="30 70"/>
                    </svg>
                    Signing in…
                  </>
                ) : 'Sign in →'}
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
