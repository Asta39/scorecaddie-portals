'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { DashboardSkeleton } from '@/components/dashboard-skeleton'
import { Shield, Settings as SettingsIcon, Check, AlertCircle, Building, Key, FileText, Sun, Moon, Laptop } from 'lucide-react'
import { useTheme } from 'next-themes'

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [clubInfo, setClubInfo] = useState<any>(null)
  const [adminInfo, setAdminInfo] = useState<any>(null)
  
  const { theme, setTheme } = useTheme()

  // Caddies About form states
  const [caddiesAbout, setCaddiesAbout] = useState('')
  const [updatingClub, setUpdatingClub] = useState(false)
  const [clubSuccessMsg, setClubSuccessMsg] = useState('')
  const [clubErrorMsg, setClubErrorMsg] = useState('')

  // Password change form states
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updating, setUpdating] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Load details
  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: admin } = await supabase
          .from('club_admins')
          .select('name, email, clubs(*)')
          .eq('user_id', user.id)
          .single()
        if (admin) {
          setAdminInfo(admin)
          const club = Array.isArray(admin.clubs) ? admin.clubs[0] : admin.clubs
          setClubInfo(club)
          setCaddiesAbout(club?.caddies_about || '')
        }
      }
      setLoading(false)
    }
    loadDetails()
  }, [])

  const handleUpdateCaddiesAbout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubInfo?.id) return
    
    setClubSuccessMsg('')
    setClubErrorMsg('')
    setUpdatingClub(true)

    const { error } = await supabase
      .from('clubs')
      .update({ caddies_about: caddiesAbout })
      .eq('id', clubInfo.id)

    if (error) {
      setClubErrorMsg(error.message)
    } else {
      setClubSuccessMsg('Caddie bio template updated successfully!')
      setClubInfo({ ...clubInfo, caddies_about: caddiesAbout })
    }
    setUpdatingClub(false)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg('')
    setErrorMsg('')

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }

    setUpdating(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setErrorMsg(error.message)
    } else {
      setSuccessMsg('Password updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
    }
    setUpdating(false)
  }

  return (
    <div className="portal-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm mt-0.5 text-muted-foreground">
            Manage your account security and view golf club configuration
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-8">
          <DashboardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Club Info (Read-Only) */}
          <div className="lg:col-span-1 space-y-4">
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                  <Building size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Club Info</h3>
                  <p className="text-xs text-muted-foreground">Assigned golf club details</p>
                </div>
              </div>

              {clubInfo ? (
                <div className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Club Name</label>
                    <p className="font-semibold text-foreground">{clubInfo.name}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Location</label>
                    <p className="font-semibold text-foreground">{clubInfo.location ?? '—'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Region</label>
                    <p className="font-semibold text-foreground">{clubInfo.region ?? '—'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Contact Name</label>
                    <p className="font-semibold text-foreground">{clubInfo.contact_name ?? '—'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Contact Phone</label>
                    <p className="font-semibold text-foreground font-mono">{clubInfo.contact_phone ?? '—'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No club info linked to this account.</p>
              )}
            </div>

            {/* Caddie Marketplace Bio */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                  <FileText size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Marketplace Bio</h3>
                  <p className="text-xs text-muted-foreground">Template for all your caddies</p>
                </div>
              </div>

              {clubInfo ? (
                <form onSubmit={handleUpdateCaddiesAbout} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-foreground">Caddie Description (What You'll Get)</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      This text appears on the mobile app marketplace for every caddie registered under your club.
                    </p>
                    <textarea
                      value={caddiesAbout}
                      onChange={e => setCaddiesAbout(e.target.value)}
                      placeholder="E.g., Sigona caddies are professionally trained with excellent knowledge of our greens..."
                      className="input min-h-[100px] resize-y"
                    />
                  </div>

                  {clubSuccessMsg && (
                    <div className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex items-start gap-2">
                      <Check size={16} className="flex-shrink-0 mt-0.5" />
                      <span>{clubSuccessMsg}</span>
                    </div>
                  )}

                  {clubErrorMsg && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2">
                      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>{clubErrorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={updatingClub}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {updatingClub ? 'Saving…' : 'Save Template'}
                  </button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">No club info linked to this account.</p>
              )}
            </div>
          </div>

          {/* Account Security (Password change) */}
          <div className="lg:col-span-2 card p-6">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                <Key size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Account Security</h3>
                <p className="text-xs text-muted-foreground">Update password for {adminInfo?.email}</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-foreground">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-foreground">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                />
              </div>

              {successMsg && (
                <div className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex items-start gap-2">
                  <Check size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={updating}
                className="btn-primary disabled:opacity-50"
              >
                {updating ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Theme Settings */}
          <div className="lg:col-span-3 card p-6 mt-2">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted">
                <Sun size={20} className="text-primary dark:hidden" />
                <Moon size={20} className="text-primary hidden dark:block" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Appearance</h3>
                <p className="text-xs text-muted-foreground">Customize your portal experience</p>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                <Sun className={theme === 'light' ? 'text-primary' : 'text-muted-foreground'} />
                <span className="text-sm font-medium">Light</span>
              </button>
              
              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                <Moon className={theme === 'dark' ? 'text-primary' : 'text-muted-foreground'} />
                <span className="text-sm font-medium">Dark</span>
              </button>

              <button
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                <Laptop className={theme === 'system' ? 'text-primary' : 'text-muted-foreground'} />
                <span className="text-sm font-medium">System</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
