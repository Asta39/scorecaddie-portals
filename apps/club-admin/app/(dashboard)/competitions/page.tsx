'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { createClient } from '@/lib/supabase-client'
import { Plus, Search, Trophy, Edit2, Eye } from 'lucide-react'

type Competition = {
  id: string
  club_id: string
  name: string
  competition_type: string
  status: 'upcoming' | 'open' | 'in_progress' | 'closed'
  start_date: string
  end_date: string | null
  entry_fee: number | null
  created_at: string
  is_template: boolean
  poster_url: string | null
}

export default function CompetitionsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [clubId, setClubId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'template'>('active')

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

  const fetchCompetitions = async () => {
    if (!clubId) return
    setLoading(true)
    
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .eq('club_id', clubId)
      .order('start_date', { ascending: false })

    if (data && !error) {
      setCompetitions(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (clubId) {
      fetchCompetitions()
    }
  }, [clubId])

  const filteredCompetitions = competitions.filter(c => {
    const matchesTab = c.is_template === (activeTab === 'template')
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.competition_type.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'open': return 'badge-active'
      case 'in_progress': return 'badge-warning'
      case 'closed': return 'badge-suspended'
      case 'upcoming': return 'badge-neutral'
      default: return 'badge-neutral'
    }
  }

  return (
    <div className="portal-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Competitions</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Manage competitions and templates at your club
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'template' ? (
            <button className="btn-primary" onClick={() => router.push('/competitions/new?isTemplate=true')}>
              <Plus size={18} />
              Create Template
            </button>
          ) : (
            <button className="btn-primary" onClick={() => router.push('/competitions/new')}>
              <Plus size={18} />
              Create Competition
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-light mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'active'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
          onClick={() => setActiveTab('active')}
        >
          Active Competitions
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'template'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
          onClick={() => setActiveTab('template')}
        >
          Recurring Templates
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-background border rounded-xl px-4 py-3 mb-6 shadow-sm max-w-md">
        <Search size={18} style={{ color: 'var(--color-light)' }} />
        <input
          type="text"
          placeholder={activeTab === 'template' ? "Search templates…" : "Search competitions…"}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-sm text-text"
        />
      </div>

      {loading ? (
        <div className="mt-8">
          <TableSkeleton />
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive-wrapper">
            <table className="data-table">
            <thead>
              <tr>
                <th>{activeTab === 'template' ? 'Template Name' : 'Competition Name'}</th>
                <th>Format</th>
                <th>Status</th>
                {activeTab !== 'template' && <th>Start Date</th>}
                <th>Entry Fee</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompetitions.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'template' ? 5 : 6} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-lighter)' }}>
                        <Trophy size={22} style={{ color: 'var(--color-secondary)' }} />
                      </div>
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                        No {activeTab === 'template' ? 'templates' : 'competitions'} found
                      </p>
                      <p className="text-sm" style={{ color: 'var(--color-light)' }}>
                        {activeTab === 'template' 
                          ? 'Create a template to easily publish recurring competitions.' 
                          : 'Try adjusting your search query or create a new competition.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredCompetitions.map(c => {
                const startDate = new Date(c.start_date).toLocaleDateString()
                const feeText = c.entry_fee ? `KES ${c.entry_fee.toLocaleString()}` : 'Free'
                
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{c.name}</span>
                      </div>
                    </td>
                    <td className="capitalize text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {(c.competition_type || '').replace('_', ' ')}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(c.status)} capitalize`}>
                        {(c.status || '').replace('_', ' ')}
                      </span>
                    </td>
                    {activeTab !== 'template' && <td className="text-sm">{startDate}</td>}
                    <td className="text-sm font-mono">{feeText}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        {c.is_template ? (
                          <>
                            <button onClick={() => router.push(`/competitions/new?templateId=${c.id}`)}
                              title="Publish Competition Instance"
                              className="px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-semibold border border-green-200 flex items-center gap-1">
                              <Plus size={12} /> Publish
                            </button>
                            <button onClick={() => router.push(`/competitions/${c.id}/edit`)}
                              title="Edit Template"
                              className="p-1 hover:bg-lighter rounded-lg text-primary">
                              <Edit2 size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => router.push(`/competitions/${c.id}`)}
                              title="View Details & Entries"
                              className="p-1 hover:bg-lighter rounded-lg text-primary">
                              <Eye size={16} />
                            </button>
                            <button onClick={() => router.push(`/competitions/${c.id}/edit`)}
                              title="Edit Competition"
                              className="p-1 hover:bg-lighter rounded-lg text-primary">
                              <Edit2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
