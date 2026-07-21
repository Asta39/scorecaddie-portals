'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { DecorIcon } from "@/components/decor-icon"
import { KeyIcon } from "lucide-react"

export default function UpdatePasswordPage() {
  const supabase = useMemo(() => createClient(), [])
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // null = still checking for a recovery session; true = ready to accept a new
  // password; false = no session materialized, this page was reached directly
  // with no valid recovery link, so redirect away instead of showing a bare form.
  const [ready, setReady] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    let settled = false
    const markReady = () => {
      if (!settled) {
        settled = true
        setReady(true)
      }
    }

    // If the URL has a recovery token, Supabase JS picks it up asynchronously
    // and either fires PASSWORD_RECOVERY or establishes a session directly.
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        markReady()
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady()
    })

    // Give Supabase a moment to process any recovery token in the URL before
    // concluding there isn't one.
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        setReady(false)
      }
    }, 2000)

    return () => {
      authListener.subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [supabase.auth])

  useEffect(() => {
    if (ready === false) {
      router.replace('/login')
    }
  }, [ready, router])

  if (ready !== true) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Checking your reset link…</p>
      </div>
    )
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Success! Go to dashboard.
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden px-6 md:px-8 bg-background text-foreground">
      <div
        className={cn(
          "relative flex w-full max-w-sm flex-col justify-between p-6 md:p-8",
          "dark:bg-[radial-gradient(50%_80%_at_20%_0%,--theme(--color-foreground/.1),transparent)]"
        )}
      >
        <div className="absolute -inset-y-6 -left-px w-px bg-border" />
        <div className="absolute -inset-y-6 -right-px w-px bg-border" />
        <div className="absolute -inset-x-6 -top-px h-px bg-border" />
        <div className="absolute -inset-x-6 -bottom-px h-px bg-border" />
        <DecorIcon position="top-left" />
        <DecorIcon position="bottom-right" />

        <div className="w-full max-w-sm animate-in space-y-8">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Score Caddie Logo" className="h-10 w-auto object-contain" />
              <h1 className="font-bold text-xl tracking-wide">Update Password</h1>
            </div>
            <p className="text-base text-muted-foreground">
              Please enter your new password below.
            </p>
          </div>
          
          <div className="space-y-4">
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <InputGroup>
                  <InputGroupInput
                    placeholder="New Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <InputGroupAddon align="inline-start">
                    <KeyIcon className="w-4 h-4 text-muted-foreground" />
                  </InputGroupAddon>
                </InputGroup>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}

              <Button className="w-full" size="default" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : 'Update Password'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
