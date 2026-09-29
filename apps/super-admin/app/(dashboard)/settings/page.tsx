'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Eye, EyeOff, KeyIcon, UserIcon } from 'lucide-react'

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (next.length < 8) return setError('Use at least 8 characters.')
    if (next !== confirm) return setError('The new passwords don’t match.')
    if (next === current) return setError('Pick a password different from your current one.')

    setSaving(true)
    // Confirm the current password first so an unattended signed-in session
    // can't be used to take over the account.
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: current })
    if (authError) {
      setSaving(false)
      return setError('Your current password is incorrect.')
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: next })
    setSaving(false)
    if (updateError) return setError(updateError.message)

    setCurrent('')
    setNext('')
    setConfirm('')
    setSuccess('Password updated.')
  }

  const field = (placeholder: string, value: string, onChange: (v: string) => void, autoComplete: string) => (
    <InputGroup>
      <InputGroupInput
        placeholder={placeholder}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
      />
      <InputGroupAddon align="inline-start">
        <KeyIcon className="w-4 h-4 text-muted-foreground" />
      </InputGroupAddon>
    </InputGroup>
  )

  return (
    <div className="portal-content">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your account and sign-in</p>
      </div>

      <div className="card max-w-2xl mb-6">
        <div className="card-header">
          <p className="text-sm font-semibold text-foreground">Account</p>
        </div>
        <div className="flex items-center gap-3 p-5 text-sm">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
            <UserIcon size={18} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Super admin</p>
            <p className="text-muted-foreground">{email || '—'}</p>
          </div>
        </div>
      </div>

      <div className="card max-w-2xl">
        <div className="card-header flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Change password</p>
            <p className="text-xs text-muted-foreground">You&apos;ll stay signed in on this device</p>
          </div>
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={show ? 'Hide passwords' : 'Show passwords'}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 p-5">
          {field('Current password', current, setCurrent, 'current-password')}
          {field('New password', next, setNext, 'new-password')}
          {field('Confirm new password', confirm, setConfirm, 'new-password')}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">{error}</div>
          )}
          {success && (
            <div className="text-sm text-primary bg-primary/10 p-3 rounded-lg border border-primary/20">{success}</div>
          )}

          <Button type="submit" disabled={saving || !email}>
            {saving ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
