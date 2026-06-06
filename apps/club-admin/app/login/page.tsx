'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), [])
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
    <div className="relative w-full overflow-hidden px-4 md:h-screen bg-background">
      <div className="relative mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center border-x border-border/50 *:px-6">
        
        {/* Header */}
        <div className="flex flex-col space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <img src="/logo.png" alt="Score Caddie" className="h-6 w-auto brightness-0 invert" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Score Caddie</p>
              <p className="text-sm font-bold text-foreground leading-none">Club Admin</p>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <h1 className="font-semibold text-2xl tracking-tight text-foreground">
              {isRecoveryMode ? 'Set your password' : 'Hey, welcome!'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isRecoveryMode 
                ? 'Activate your club secretary account below.' 
                : 'Log in to manage your club roster and settings.'}
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="relative my-6 flex w-full flex-col gap-4 py-8 border-y border-border/50">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 font-medium">
              {error === 'Invalid login credentials' ? 'Incorrect email or password.' : error}
            </div>
          )}

          {isRecoveryMode ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 mt-4"
              >
                {loading ? 'Activating…' : 'Activate Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="secretary@sigonagolfclub.com"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:opacity-90 h-10 px-4 py-2 mt-4"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="30 70" opacity="0.3"/>
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Signing in...
                  </>
                ) : 'Sign in'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-xs font-medium">
          Authorized Score Caddie administrators only.
        </p>
      </div>
    </div>
  )
}
