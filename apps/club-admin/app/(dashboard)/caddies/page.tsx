'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Plus, Search, User, Check, X, Camera, Edit2, AlertTriangle, Upload, Download, BarChart3 } from 'lucide-react'
import Papa from 'papaparse'
import { CaddieStatsDrawer } from '@/components/caddies/CaddieStatsDrawer'

type Caddie = {
  id: string
  name: string
  phone: string
  id_number: string | null
  experience_level: 'beginner' | 'intermediate' | 'expert'
  photo_url: string | null
  is_active: boolean
  is_marketplace_visible: boolean
  paid_until: string | null
  is_present: boolean
}

export default function CaddiesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [caddies, setCaddies] = useState<Caddie[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [clubId, setClubId] = useState<string | null>(null)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCaddie, setEditingCaddie] = useState<Caddie | null>(null)
  
  // Form states
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'expert'>('beginner')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoUrlPreview, setPhotoUrlPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // CSV Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [parsedCaddies, setParsedCaddies] = useState<any[]>([])
  const [duplicateErrors, setDuplicateErrors] = useState<{row: number, phone: string}[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Stats Drawer States
  const [isStatsDrawerOpen, setIsStatsDrawerOpen] = useState(false)
  const [statsCaddie, setStatsCaddie] = useState<Caddie | null>(null)

  // 1. Fetch user club details
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

  // 2. Fetch caddies list
  const fetchCaddies = async () => {
    if (!clubId) return
    setLoading(true)
    
    const todayStr = new Date().toISOString().split('T')[0]
    
    const [caddiesRes, attendanceRes] = await Promise.all([
      supabase
        .from('caddies')
        .select('*')
        .eq('club_id', clubId)
        .order('name', { ascending: true }),
      supabase
        .from('caddie_attendance')
        .select('caddie_id, time_in, time_out, is_absent')
        .eq('club_id', clubId)
        .eq('date', todayStr)
    ])

    if (caddiesRes.data) {
      const attendanceMap = new Map<string, any>()
      ;(attendanceRes.data ?? []).forEach(att => {
        attendanceMap.set(att.caddie_id, att)
      })

      const mappedCaddies = caddiesRes.data.map((c: any) => {
        const att = attendanceMap.get(c.id)
        const isPresent = att 
          ? att.time_in !== null && att.time_out === null && !att.is_absent
          : false
        return {
          ...c,
          is_present: isPresent
        }
      })
      setCaddies(mappedCaddies)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (clubId) {
      fetchCaddies()
    }
  }, [clubId])

  const openAddModal = () => {
    setEditingCaddie(null)
    setName('')
    setPhone('')
    setIdNumber('')
    setExperienceLevel('beginner')
    setPhotoFile(null)
    setPhotoUrlPreview(null)
    setFormError('')
    setIsModalOpen(true)
  }

  const openImportModal = () => {
    setIsImportModalOpen(true)
    setParsedCaddies([])
    setDuplicateErrors([])
    setValidationErrors([])
    setImportError('')
  }

  const downloadTemplate = () => {
    const csvContent = "Name,Phone,ID Number,Experience\nJohn Doe,+254700000000,12345678,beginner\nJane Smith,+254711111111,87654321,expert"
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'caddies_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportError('')
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[]
        const validCaddies: any[] = []
        const vErrors: string[] = []
        const duplicates: {row: number, phone: string}[] = []
        
        // Use a Set to track phones (existing + newly parsed ones in the same file)
        const currentPhones = new Set(caddies.map(c => c.phone ? c.phone.replace(/[^0-9+]/g, '') : ''))

        rows.forEach((row, index) => {
          const rowNum = index + 2 // +2 because 1-indexed and header row
          const name = row['Name']?.trim()
          let phone = row['Phone']?.trim()
          const idNumber = row['ID Number']?.trim()
          let exp = row['Experience']?.trim()?.toLowerCase()

          if (!name || !phone) {
            vErrors.push(`Row ${rowNum}: Missing required Name or Phone`)
            return
          }

          const normalizedPhone = phone.replace(/[^0-9+]/g, '')

          if (!['beginner', 'intermediate', 'expert'].includes(exp)) {
            exp = 'beginner'
          }

          if (currentPhones.has(normalizedPhone)) {
            duplicates.push({ row: rowNum, phone })
            return // Skip duplicate
          }

          currentPhones.add(normalizedPhone)

          validCaddies.push({
            club_id: clubId,
            name,
            phone: normalizedPhone,
            id_number: idNumber || null,
            experience_level: exp,
            photo_url: null,
            is_active: true,
            is_marketplace_visible: true,
          })
        })

        setValidationErrors(vErrors)
        setDuplicateErrors(duplicates)
        setParsedCaddies(validCaddies)
        
        // Reset file input so same file can be selected again
        e.target.value = ''
      },
      error: (error) => {
        setImportError(error.message)
      }
    })
  }

  const handleProcessImport = async () => {
    if (parsedCaddies.length === 0) return
    setImporting(true)
    setImportError('')

    try {
      const { error } = await supabase.from('caddies').insert(parsedCaddies)
      if (error) throw error

      await fetchCaddies()
      setIsImportModalOpen(false)
      setParsedCaddies([])
      setDuplicateErrors([])
      setValidationErrors([])
    } catch (err: any) {
      console.error('Error importing caddies:', err)
      setImportError(err.message || 'Error importing caddies')
    } finally {
      setImporting(false)
    }
  }

  const openEditModal = (caddie: Caddie) => {
    setEditingCaddie(caddie)
    setName(caddie.name)
    setPhone(caddie.phone)
    setIdNumber(caddie.id_number || '')
    setExperienceLevel(caddie.experience_level)
    setPhotoFile(null)
    setPhotoUrlPreview(caddie.photo_url)
    setFormError('')
    setIsModalOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPhotoFile(file)
      setPhotoUrlPreview(URL.createObjectURL(file))
    }
  }

  const handleSaveCaddie = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId) return
    setSaving(true)
    setFormError('')

    try {
      let finalPhotoUrl = photoUrlPreview

      // 1. Upload photo to Supabase Storage if file selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        // Generate a random ID if registering, or use existing ID
        const caddieId = editingCaddie ? editingCaddie.id : crypto.randomUUID()
        const filePath = `${clubId}/${caddieId}_${Date.now()}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('caddie-photos')
          .upload(filePath, photoFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('caddie-photos')
          .getPublicUrl(filePath)

        finalPhotoUrl = publicUrl
      }

      // 2. Insert or update caddie record
      if (editingCaddie) {
        const { error } = await supabase
          .from('caddies')
          .update({
            name,
            phone,
            id_number: idNumber || null,
            experience_level: experienceLevel,
            photo_url: finalPhotoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCaddie.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('caddies')
          .insert({
            club_id: clubId,
            name,
            phone,
            id_number: idNumber || null,
            experience_level: experienceLevel,
            photo_url: finalPhotoUrl,
            is_active: true,
            is_marketplace_visible: true,
          })

        if (error) throw error
      }

      fetchCaddies()
      setIsModalOpen(false)
    } catch (err: any) {
      console.error('Error saving caddie:', err)
      setFormError(err.message || 'An error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  const toggleCaddieStatus = async (caddie: Caddie) => {
    try {
      const nextStatus = !caddie.is_active
      await supabase
        .from('caddies')
        .update({ 
          is_active: nextStatus,
          // Hide from marketplace if suspended
          is_marketplace_visible: nextStatus ? caddie.is_marketplace_visible : false 
        })
        .eq('id', caddie.id)

      fetchCaddies()
    } catch (err) {
      console.error('Error toggling status:', err)
    }
  }

  const filteredCaddies = caddies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    (c.id_number && c.id_number.includes(searchQuery))
  )

  return (
    <div className="portal-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Caddie Profiles</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {caddies.length} caddie{caddies.length !== 1 ? 's' : ''} registered at your club
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-secondary" onClick={openImportModal}>
            <Upload size={18} />
            Import CSV
          </button>
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={18} />
            Register Caddie
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white border border-light rounded-xl px-4 py-3 mb-6 shadow-sm max-w-md">
        <Search size={18} style={{ color: 'var(--color-light)' }} />
        <input
          type="text"
          placeholder="Search by name, phone or ID number…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-sm text-text"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-text-muted">
          Loading caddie profiles…
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Caddie Name</th>
                <th>Phone Number</th>
                <th>ID Number</th>
                <th>Experience</th>
                <th>Roster Status</th>
                <th>Subscription Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCaddies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-lighter)' }}>
                        <User size={22} style={{ color: 'var(--color-secondary)' }} />
                      </div>
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>No caddies found</p>
                      <p className="text-sm" style={{ color: 'var(--color-light)' }}>Try adjusting your search query or add a caddie.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCaddies.map(c => {
                const isPaid = c.paid_until && new Date(c.paid_until) > new Date()
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt={c.name}
                            className="w-10 h-10 rounded-full object-cover"
                            style={{ border: '1px solid var(--color-light)' }} />
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--color-lighter)' }}>
                            <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                              {c.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{c.name}</span>
                          <span className="text-[11px]" style={{ color: 'var(--color-light)' }}>
                            {c.is_present ? 'Currently Present' : 'Checked Out'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>{c.phone}</td>
                    <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{c.id_number || '—'}</td>
                    <td>
                      <span className="capitalize">{c.experience_level}</span>
                    </td>
                    <td>
                      <button onClick={() => toggleCaddieStatus(c)}
                        className={`badge ${c.is_active ? 'badge-active' : 'badge-suspended'}`}>
                        {c.is_active ? 'Active' : 'Suspended'}
                      </button>
                    </td>
                    <td>
                      <span className={`badge ${isPaid ? 'badge-active' : 'badge-warning'}`}>
                        {isPaid ? 'Paid' : 'Expired'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <button onClick={() => { setStatsCaddie(c); setIsStatsDrawerOpen(true); }}
                          title="View Performance Stats"
                          className="p-1 hover:bg-lighter rounded-lg text-primary">
                          <BarChart3 size={16} />
                        </button>
                        <button onClick={() => openEditModal(c)}
                          className="p-1 hover:bg-lighter rounded-lg text-primary">
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b mb-5" style={{ borderColor: 'var(--color-light)' }}>
              <div>
                <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                  {editingCaddie ? 'Edit Caddie Profile' : 'Register New Caddie'}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Set up a proxy profile for app marketplace bookings
                </p>
              </div>
              <button className="p-1 hover:bg-lighter rounded-lg text-primary" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCaddie} className="space-y-4">
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-2 mb-4">
                <div className="relative w-20 h-20 rounded-full border border-light overflow-hidden flex items-center justify-center bg-lighter">
                  {photoUrlPreview ? (
                    <img src={photoUrlPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User size={36} className="text-secondary" />
                  )}
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                    <Camera size={18} className="text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
                <span className="text-[11px] text-text-muted">Click photo to upload</span>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-text">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-text">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +254712345678"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-text">ID Number / Passport (Optional)</label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={e => setIdNumber(e.target.value)}
                  placeholder="e.g. 34567890"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-text">Experience Level</label>
                <select
                  value={experienceLevel}
                  onChange={e => setExperienceLevel(e.target.value as any)}
                  className="input"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              {formError && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t" style={{ borderColor: 'var(--color-lighter)' }}>
                <button type="button" className="btn-secondary flex-1 justify-center py-2.5 text-sm font-semibold"
                  onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center py-2.5 text-sm font-semibold"
                  style={{ background: saving ? 'var(--color-secondary)' : 'var(--color-primary)' }}>
                  {saving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="modal-overlay" onClick={() => !importing && setIsImportModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '32rem' }}>
            <div className="flex items-center justify-between pb-4 border-b mb-5" style={{ borderColor: 'var(--color-light)' }}>
              <div>
                <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                  Import Caddies via CSV
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Upload a CSV file to bulk register caddies
                </p>
              </div>
              <button 
                className="p-1 hover:bg-lighter rounded-lg text-primary" 
                onClick={() => !importing && setIsImportModalOpen(false)}
                disabled={importing}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
                    <Download size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">Need the correct format?</h4>
                    <p className="text-xs text-blue-800 mb-2">
                      Your CSV must have the exact column headers: <code className="font-bold">Name, Phone, ID Number, Experience</code>
                    </p>
                    <button onClick={downloadTemplate} className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline">
                      Download Template CSV
                    </button>
                  </div>
                </div>
              </div>

              {parsedCaddies.length === 0 && validationErrors.length === 0 && duplicateErrors.length === 0 ? (
                <div className="border-2 border-dashed rounded-xl p-8 text-center" style={{ borderColor: 'var(--color-light)' }}>
                  <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--color-light)' }} />
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Select a CSV file to upload</p>
                  <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Max file size: 5MB</p>
                  <label className="btn-secondary cursor-pointer inline-flex">
                    <span>Browse Files</span>
                    <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Results Summary */}
                  <div className="bg-lighter p-4 rounded-xl border" style={{ borderColor: 'var(--color-light)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">Ready to import</span>
                      <span className="text-sm font-bold text-green-600">{parsedCaddies.length} caddies</span>
                    </div>
                    {duplicateErrors.length > 0 && (
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-orange-700">Skipped (duplicates)</span>
                        <span className="text-xs font-bold text-orange-700">{duplicateErrors.length} rows</span>
                      </div>
                    )}
                    {validationErrors.length > 0 && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-red-600">Skipped (invalid)</span>
                        <span className="text-xs font-bold text-red-600">{validationErrors.length} rows</span>
                      </div>
                    )}
                  </div>

                  {/* Warning Details */}
                  {(duplicateErrors.length > 0 || validationErrors.length > 0) && (
                    <div className="max-h-40 overflow-y-auto border rounded-xl p-3 text-xs space-y-2 bg-white" style={{ borderColor: 'var(--color-light)' }}>
                      {duplicateErrors.map((err, i) => (
                        <div key={`dup-${i}`} className="text-orange-700 flex gap-2">
                          <AlertTriangle size={14} className="flex-shrink-0" />
                          <span>Row {err.row}: Phone {err.phone} is already registered.</span>
                        </div>
                      ))}
                      {validationErrors.map((err, i) => (
                        <div key={`val-${i}`} className="text-red-600 flex gap-2">
                          <X size={14} className="flex-shrink-0" />
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {importError && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2">
                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>{importError}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t" style={{ borderColor: 'var(--color-lighter)' }}>
                    <button 
                      type="button" 
                      className="btn-secondary flex-1 justify-center py-2.5 text-sm font-semibold"
                      onClick={() => {
                        setParsedCaddies([])
                        setDuplicateErrors([])
                        setValidationErrors([])
                        setImportError('')
                      }}
                      disabled={importing}
                    >
                      Reset / Choose Another
                    </button>
                    <button 
                      type="button" 
                      onClick={handleProcessImport}
                      disabled={importing || parsedCaddies.length === 0} 
                      className="btn-primary flex-1 justify-center py-2.5 text-sm font-semibold"
                      style={{ background: importing || parsedCaddies.length === 0 ? 'var(--color-secondary)' : 'var(--color-primary)' }}
                    >
                      {importing ? 'Importing…' : `Import ${parsedCaddies.length} Caddies`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Caddie Stats Side Drawer */}
      <CaddieStatsDrawer
        caddie={statsCaddie}
        isOpen={isStatsDrawerOpen}
        onClose={() => setIsStatsDrawerOpen(false)}
      />
    </div>
  )
}
