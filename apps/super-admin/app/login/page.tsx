'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

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

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-primary)' }}>
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-16 text-white">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <img src="/logo.png" alt="Score Caddie Logo" className="h-16 w-auto object-contain" />
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>Score Caddie</p>
              <p className="text-lg font-bold">Super Admin</p>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Platform<br />Control Centre
          </h1>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Manage clubs, secretaries, caddies, and platform settings from one secure location.
          </p>
        </div>
        <div className="flex gap-8 mt-8">
          {[
            { label: 'Clubs', value: '—' },
            { label: 'Caddies', value: '—' },
            { label: 'MRR', value: 'KES —' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-10">
          <div className="mb-8">
            <img src="/logo.png" alt="Score Caddie Logo" className="h-14 w-auto object-contain mb-4" />
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Sign in</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>Super Admin access only</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ian@scorecaddie.co.ke"
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

          <p className="text-center text-xs mt-8" style={{ color: 'var(--color-light)' }}>
            This portal is restricted to Score Caddie platform administrators.
          </p>
        </div>
      </div>
    </div>
  )
}
