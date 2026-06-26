'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { Save, X, Trophy, Image as ImageIcon } from 'lucide-react'

function NewCompetitionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const templateId = searchParams?.get('templateId')
  const isTemplateParam = searchParams?.get('isTemplate')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clubId, setClubId] = useState<string | null>(null)
  
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    competition_type: 'strokeplay',
    start_date: '',
    end_date: '',
    entry_deadline: '',
    entry_fee: '',
    currency: 'KES',
    status: 'upcoming',
    is_template: isTemplateParam === 'true',
    poster_url: ''
  })

  const [rulesConfig, setRulesConfig] = useState({
    handicap_allowance_pct: '100',
    max_handicap: '36',
    min_handicap: '',
    tiebreaker: 'countback'
  })

  const handleRulesChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setRulesConfig(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  useEffect(() => {
    const loadClub = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: admin } = await supabase
          .from('club_admins')
          .select('club_id')
          .eq('user_id', user.id)
          .single()
        if (admin) {
          setClubId(admin.club_id)
        }
      }
    }
    loadClub()
  }, [])

  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateId || !clubId) return
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', templateId)
        .eq('club_id', clubId)
        .single()

      if (data && !error) {
        setFormData(prev => ({
          ...prev,
          name: data.name || '',
          description: data.description || '',
          competition_type: data.competition_type || 'strokeplay',
          entry_fee: data.entry_fee ? data.entry_fee.toString() : '',
          currency: data.currency || 'KES',
          poster_url: data.poster_url || '',
          is_template: false // Publishing a template creates an active competition
        }))
        if (data.poster_url) {
          setPosterPreview(data.poster_url)
        }
        if (data.rules_config) {
          setRulesConfig({
            handicap_allowance_pct: data.rules_config.handicap_allowance_pct !== undefined && data.rules_config.handicap_allowance_pct !== null ? data.rules_config.handicap_allowance_pct.toString() : '100',
            max_handicap: data.rules_config.max_handicap !== undefined && data.rules_config.max_handicap !== null ? data.rules_config.max_handicap.toString() : '36',
            min_handicap: data.rules_config.min_handicap !== null && data.rules_config.min_handicap !== undefined ? data.rules_config.min_handicap.toString() : '',
            tiebreaker: data.rules_config.tiebreaker || 'countback'
          })
        }
      }
    }
    if (clubId) {
      loadTemplate()
    }
  }, [templateId, clubId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB')
        return
      }
      setPosterFile(file)
      setPosterPreview(URL.createObjectURL(file))
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId) return
    setLoading(true)
    setError('')

    try {
      let finalPosterUrl = formData.poster_url

      if (posterFile) {
        const fileExt = posterFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `posters/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('club-assets')
          .upload(filePath, posterFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('club-assets')
          .getPublicUrl(filePath)

        finalPosterUrl = publicUrlData.publicUrl
      }

      const { data, error: insertError } = await supabase
        .from('competitions')
        .insert({
          club_id: clubId,
          name: formData.name,
          description: formData.description,
          competition_type: formData.competition_type,
          start_date: formData.is_template ? '1970-01-01' : formData.start_date, // templates don't need a real date, use epoch fallback
          end_date: formData.is_template ? null : (formData.end_date || null),
          entry_deadline: (formData.is_template || !formData.entry_deadline) ? null : new Date(formData.entry_deadline).toISOString(),
          entry_fee: formData.entry_fee ? parseFloat(formData.entry_fee) : 0,
          currency: formData.currency,
          status: formData.status,
          is_template: formData.is_template,
          poster_url: finalPosterUrl || null,
          rules_config: {
            handicap_allowance_pct: rulesConfig.handicap_allowance_pct ? parseInt(rulesConfig.handicap_allowance_pct) : 100,
            max_handicap: rulesConfig.max_handicap ? parseInt(rulesConfig.max_handicap) : 36,
            min_handicap: rulesConfig.min_handicap ? parseInt(rulesConfig.min_handicap) : null,
            tiebreaker: rulesConfig.tiebreaker || 'countback'
          }
        })
        .select()
        .single()

      if (insertError) throw insertError

      router.push('/competitions')
    } catch (err: any) {
      console.error('Error creating competition:', err)
      setError(err.message || 'Failed to create competition')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="portal-content max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lighter flex items-center justify-center text-secondary">
            <Trophy size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
              {formData.is_template ? 'Create Recurring Template' : 'Create Competition'}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {formData.is_template 
                ? 'Set up a competition template that can be published repeatedly' 
                : 'Set up a new formal competition for your club members'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-4">Basic Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Competition Name *</label>
              <input 
                type="text" 
                name="name" 
                required 
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Monthly Mug"
                className="input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Format *</label>
              <select 
                name="competition_type" 
                value={formData.competition_type}
                onChange={handleChange}
                className="input"
              >
                <option value="strokeplay">Strokeplay</option>
                <option value="stableford">Stableford</option>
                <option value="matchplay">Matchplay</option>
                <option value="betterball">Betterball</option>
                <option value="foursome">Foursome</option>
                <option value="bogey">Bogey</option>
              </select>
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold">Description</label>
              <textarea 
                name="description" 
                value={formData.description}
                onChange={handleChange}
                placeholder="Details about the competition rules, prizes, etc."
                className="input min-h-[100px]"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold">Poster Image (Optional)</label>
              <div className="flex flex-col gap-4">
                {posterPreview || formData.poster_url ? (
                  <div className="relative w-full max-w-sm aspect-[16/9] rounded-xl overflow-hidden border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={posterPreview || formData.poster_url} alt="Poster preview" className="object-cover w-full h-full" />
                    <button
                      type="button"
                      onClick={() => {
                        setPosterFile(null)
                        setPosterPreview(null)
                        setFormData(prev => ({ ...prev, poster_url: '' }))
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full max-w-sm h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50/50 hover:border-gray-400 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-500">
                      <ImageIcon size={24} className="mb-2" />
                      <p className="text-sm font-medium">Click to upload image</p>
                      <p className="text-xs mt-1">JPEG, PNG, WEBP up to 5MB</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/jpeg,image/png,image/webp,image/jpg" 
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="md:col-span-2 pt-2">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  name="is_template" 
                  id="is_template"
                  checked={formData.is_template}
                  onChange={e => setFormData(prev => ({ ...prev, is_template: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
                <label htmlFor="is_template" className="text-sm font-semibold cursor-pointer text-text select-none">
                  Save as Recurring Template
                </label>
              </div>
            </div>
          </div>
        </div>

        {!formData.is_template && (
          <div className="card p-6 space-y-6">
            <h2 className="text-lg font-semibold border-b pb-4">Schedule</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Start Date *</label>
                <input 
                  type="date" 
                  name="start_date" 
                  required={!formData.is_template}
                  value={formData.start_date}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">End Date (Optional)</label>
                <input 
                  type="date" 
                  name="end_date" 
                  value={formData.end_date}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Status *</label>
                <select 
                  name="status" 
                  value={formData.status}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="upcoming">Upcoming (Hidden from entry)</option>
                  <option value="open_for_entry">Open for Entry</option>
                  <option value="in_progress">In Progress</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-4">Entry & Fees</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Entry Fee Amount</label>
              <input 
                type="number" 
                name="entry_fee" 
                value={formData.entry_fee}
                onChange={handleChange}
                placeholder="0.00"
                className="input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Currency</label>
              <select 
                name="currency" 
                value={formData.currency}
                onChange={handleChange}
                className="input"
              >
                <option value="KES">KES - Kenyan Shilling</option>
                <option value="ZAR">ZAR - South African Rand</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>
            {!formData.is_template && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Entry Deadline (Optional)</label>
                <input 
                  type="datetime-local" 
                  name="entry_deadline" 
                  value={formData.entry_deadline}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            )}
          </div>
        </div>

        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-4">Rules & Handicaps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Handicap Allowance (%) *</label>
              <input 
                type="number" 
                name="handicap_allowance_pct" 
                required
                value={rulesConfig.handicap_allowance_pct}
                onChange={handleRulesChange}
                placeholder="100"
                min="0"
                max="100"
                className="input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Max Handicap *</label>
              <input 
                type="number" 
                name="max_handicap" 
                required
                value={rulesConfig.max_handicap}
                onChange={handleRulesChange}
                placeholder="36"
                min="0"
                className="input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Min Handicap (Optional)</label>
              <input 
                type="number" 
                name="min_handicap" 
                value={rulesConfig.min_handicap}
                onChange={handleRulesChange}
                placeholder="None"
                min="0"
                className="input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Tiebreaker *</label>
              <select 
                name="tiebreaker" 
                value={rulesConfig.tiebreaker}
                onChange={handleRulesChange}
                className="input"
              >
                <option value="countback">Countback (Matching Scorecards)</option>
                <option value="playoff">Playoff</option>
                <option value="sudden_death">Sudden Death</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button 
            type="button" 
            onClick={() => router.push('/competitions')}
            className="btn-secondary"
          >
            <X size={18} />
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary"
          >
            <Save size={18} />
            {loading ? 'Creating...' : formData.is_template ? 'Create Template' : 'Create Competition'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewCompetitionPage() {
  return (
    <Suspense fallback={<div className="portal-content text-sm text-text-muted">Loading page parameters…</div>}>
      <NewCompetitionForm />
    </Suspense>
  )
}
