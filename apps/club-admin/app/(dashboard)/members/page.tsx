'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { Check, X, Search, User, AlertTriangle } from 'lucide-react'

type Member = {
  id: string
  player_id: string
  status: 'pending' | 'active' | 'rejected'
  joined_at: string
  user_profiles: {
    name: string
    email: string
    handicap: number
  } | null
}

export default function MembersPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [clubId, setClubId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const loadClubAndMembers = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: admin } = await supabase
          .from('club_admins')
          .select('club_id')
          .eq('user_id', user.id)
          .single()
        
        if (admin?.club_id) {
          setClubId(admin.club_id)
          fetchMembers(admin.club_id)
        } else {
          setLoading(false)
        }
      }
    }
    loadClubAndMembers()
  }, [])

  const fetchMembers = async (cId: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('player_club_memberships')
      .select('id, player_id, status, joined_at, user_profiles:User!player_club_memberships_player_id_fkey(name, email, handicap:handicapIndex)')
      .eq('club_id', cId)
      .order('joined_at', { ascending: false })

    if (data) {
      setMembers(data as any)
    }
    setLoading(false)
  }

  const handleUpdateStatus = async (membershipId: string, newStatus: 'active' | 'rejected') => {
    if (!clubId) return
    
    // Optimistic UI update
    setMembers(prev => prev.map(m => 
      m.id === membershipId ? { ...m, status: newStatus } : m
    ))

    try {
      const { error } = await supabase
        .from('player_club_memberships')
        .update({ status: newStatus })
        .eq('id', membershipId)
      
      if (error) {
        // 23505 = unique_violation (player already has a home club)
        if (error.code === '23505' && newStatus === 'active') {
          const { error: retryError } = await supabase
            .from('player_club_memberships')
            .update({ status: newStatus, is_home_club: false })
            .eq('id', membershipId)
          
          if (retryError) throw retryError
          
          alert('Player already has a home club. They have been approved as a regular member.')
        } else {
          throw error
        }
      }
    } catch (err: any) {
      console.error('Error updating status:', err)
      alert(err?.message || 'Error updating status')
      // Revert on error
      fetchMembers(clubId)
    }
  }

  const filteredMembers = members.filter(m => 
    m.user_profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.user_profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingMembers = filteredMembers.filter(m => m.status === 'pending')
  const activeMembers = filteredMembers.filter(m => m.status === 'active')

  return (
    <div className="portal-content">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Club Members</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Manage membership requests and active members
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-background border rounded-xl px-4 py-3 mb-6 shadow-sm max-w-md">
        <Search size={18} style={{ color: 'var(--color-light)' }} />
        <input
          type="text"
          placeholder="Search members by name or email…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-sm text-text"
        />
      </div>

      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="space-y-8">
          
          {/* Pending Members */}
          {pendingMembers.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                Pending Requests ({pendingMembers.length})
              </h2>
              <div className="card">
                <div className="table-responsive-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Player Name</th>
                        <th>Email</th>
                        <th>Handicap</th>
                        <th>Request Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingMembers.map(m => (
                        <tr key={m.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--color-lighter)' }}>
                                <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                                  {m.user_profiles?.name?.charAt(0) ?? 'U'}
                                </span>
                              </div>
                              <span className="font-semibold text-sm">{m.user_profiles?.name ?? 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="text-sm text-muted-foreground">{m.user_profiles?.email ?? '—'}</td>
                          <td>
                            <span className="badge bg-green-50 text-green-700">
                              {m.user_profiles?.handicap?.toFixed(1) ?? 'N/A'}
                            </span>
                          </td>
                          <td className="text-sm text-muted-foreground">
                            {new Date(m.joined_at).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleUpdateStatus(m.id, 'active')}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-sm font-semibold transition-colors">
                                <Check size={14} />
                                Approve
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(m.id, 'rejected')}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-sm font-semibold transition-colors">
                                <X size={14} />
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Active Members */}
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Active Members ({activeMembers.length})
            </h2>
            <div className="card">
              <div className="table-responsive-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Player Name</th>
                      <th>Email</th>
                      <th>Handicap</th>
                      <th>Joined Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeMembers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-muted">
                              <User size={22} className="text-muted-foreground" />
                            </div>
                            <p className="font-medium text-foreground">No active members found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      activeMembers.map(m => (
                        <tr key={m.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--color-lighter)' }}>
                                <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                                  {m.user_profiles?.name?.charAt(0) ?? 'U'}
                                </span>
                              </div>
                              <span className="font-semibold text-sm">{m.user_profiles?.name ?? 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="text-sm text-muted-foreground">{m.user_profiles?.email ?? '—'}</td>
                          <td>
                            <span className="badge bg-green-50 text-green-700">
                              {m.user_profiles?.handicap?.toFixed(1) ?? 'N/A'}
                            </span>
                          </td>
                          <td className="text-sm text-muted-foreground">
                            {new Date(m.joined_at).toLocaleDateString()}
                          </td>
                          <td>
                            <span className="badge badge-active">Active</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  )
}
