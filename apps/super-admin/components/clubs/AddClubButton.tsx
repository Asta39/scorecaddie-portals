'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, ChevronDown, Search, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AddClubButton({ courses = [] }: { courses?: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const [form, setForm] = useState({
    location: '', region: '', contact_name: '', contact_phone: '',
    course_id: '', name: '',
  })

  const selectedCourse = courses.find(c => c.id === form.course_id)

  const filteredCourses = courses.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCourseSelect = (course: any) => {
    setForm(f => ({ ...f, course_id: course.id, name: course.name }))
    setDropdownOpen(false)
    setSearch('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.course_id) {
      setError('Please select a club from the database.')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/create-club', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to create club')
      setLoading(false)
      return
    }

    setOpen(false)
    setForm({ location: '', region: '', contact_name: '', contact_phone: '', course_id: '', name: '' })
    router.refresh()
  }

  const handleClose = () => {
    setOpen(false)
    setForm({ location: '', region: '', contact_name: '', contact_phone: '', course_id: '', name: '' })
    setError('')
    setSearch('')
    setDropdownOpen(false)
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Add New Club
      </button>

      {open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Add New Club</h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Onboard a new golf club to the platform</p>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--color-lighter)' }}>
                <X size={16} style={{ color: 'var(--color-primary)' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Club Name — derived from database, cannot be changed */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                  Club Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Select a course from the database. The club name is set from the database and cannot be changed later.
                </p>

                {/* Custom Dropdown */}
                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => { setDropdownOpen(v => !v); setSearch('') }}
                    className="input w-full flex items-center justify-between text-left"
                    style={{
                      color: selectedCourse ? 'var(--color-text)' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="truncate">
                      {selectedCourse ? selectedCourse.name : '— Select a club from the database —'}
                    </span>
                    <ChevronDown
                      size={16}
                      className="shrink-0 ml-2 transition-transform"
                      style={{
                        transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </button>

                  {dropdownOpen && (
                    <div
                      className="absolute z-50 w-full mt-1 rounded-xl shadow-xl border border-border overflow-hidden flex flex-col bg-popover text-popover-foreground"
                      style={{ maxHeight: 280 }}
                    >
                      {/* Search bar */}
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                        <Search size={14} className="text-muted-foreground" />
                        <input
                          autoFocus
                          type="text"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Search clubs..."
                          className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                        />
                      </div>

                      {/* Options list */}
                      <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                        {filteredCourses.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                            No clubs found
                          </div>
                        ) : (
                          filteredCourses.map(course => (
                            <button
                              key={course.id}
                              type="button"
                              onClick={() => handleCourseSelect(course)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors hover:bg-accent hover:text-accent-foreground ${
                                form.course_id === course.id ? 'bg-accent text-accent-foreground' : 'text-foreground'
                              }`}
                            >
                              <span>{course.name}</span>
                              {form.course_id === course.id && (
                                <Check size={14} className="text-primary" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Read-only locked name badge, shown after selection */}
                {selectedCourse && (
                  <div className="mt-2 flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'var(--color-lighter)', color: 'var(--color-text-muted)' }}>
                    <span>🔒</span>
                    <span>Club name is locked to: <strong style={{ color: 'var(--color-text)' }}>{selectedCourse.name}</strong></span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Location</label>
                  <input className="input" placeholder="e.g. Karen, Nairobi"
                    value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Region</label>
                  <input className="input" placeholder="e.g. Nairobi"
                    value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Secretary Name</label>
                <input className="input" placeholder="Contact person's name"
                  value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Secretary Phone</label>
                <input className="input" placeholder="+254 7XX XXX XXX"
                  value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleClose} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button type="submit" disabled={loading || !form.course_id} className="btn-primary flex-1 justify-center"
                  style={{ opacity: !form.course_id ? 0.5 : 1 }}>
                  {loading ? 'Creating…' : 'Create Club'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
