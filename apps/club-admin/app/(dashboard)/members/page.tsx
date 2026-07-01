'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { Check, X, Search, User, AlertTriangle, Upload, Plus, Download, Trash, UserPlus, Users } from 'lucide-react'
import Papa from 'papaparse'

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

type RosterMember = {
  id: string
  email: string
  full_name: string
  membership_number: string
  handicap_index: number
  role: 'player' | 'coach'
  status: string
  uploaded_at: string
}

export default function MembersPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'roster' | 'app'>('roster')
  const [clubId, setClubId] = useState<string | null>(null)
  
  // App Members State
  const [members, setMembers] = useState<Member[]>([])
  
  // Roster State
  const [roster, setRoster] = useState<RosterMember[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStats, setUploadStats] = useState<{ success: number; failed: number; errors: any[] } | null>(null)

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addRole, setAddRole] = useState<'player' | 'coach'>('player')
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    membership_number: '',
    handicap_index: ''
  })

  useEffect(() => {
    const loadClubAndData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: admin } = await supabase
          .from('club_admins')
          .select('club_id')
          .eq('user_id', user.id)
          .single()
        
        if (admin?.club_id) {
          setClubId(admin.club_id)
          fetchRoster(admin.club_id)
          fetchAppMembers(admin.club_id)
        } else {
          setLoading(false)
        }
      }
    }
    loadClubAndData()
  }, [])

  const fetchAppMembers = async (cId: string) => {
    const { data } = await supabase
      .from('player_club_memberships')
      .select('id, player_id, status, joined_at, user_profiles:User!player_club_memberships_player_id_fkey(name, email, handicap:handicapIndex)')
      .eq('club_id', cId)
      .order('joined_at', { ascending: false })

    if (data) {
      setMembers(data as any)
    }
  }

  const fetchRoster = async (cId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('club_member_roster')
      .select('*')
      .eq('club_id', cId)
      .order('uploaded_at', { ascending: false })

    if (data) {
      setRoster(data as any)
    }
    setLoading(false)
  }

  // ==== Roster Handlers ====
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !clubId) return

    setIsUploading(true)
    setUploadStats(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[]
        let successCount = 0
        let errors: any[] = []

        const toInsert = rows.map((row) => {
          const hcStr = row['Handicap'] || row['handicap_index'] || '0'
          return {
            club_id: clubId,
            email: (row['Email'] || row['email'])?.toLowerCase().trim(),
            full_name: row['Name'] || row['full_name'] || 'Unknown',
            membership_number: row['Member ID'] || row['membership_number'] || null,
            handicap_index: parseFloat(hcStr) || 0,
            role: 'player'
          }
        }).filter(r => r.email)

        for (const row of toInsert) {
          const { error } = await supabase
            .from('club_member_roster')
            .upsert(row, { onConflict: 'club_id, email' })
          
          if (error) {
            errors.push({ email: row.email, error: error.message })
          } else {
            successCount++
          }
        }

        setUploadStats({ success: successCount, failed: errors.length, errors })
        setIsUploading(false)
        fetchRoster(clubId)
        if (event.target) event.target.value = ''
      },
      error: (error) => {
        alert('Error parsing CSV: ' + error.message)
        setIsUploading(false)
      }
    })
  }

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId) return

    const { error } = await supabase
      .from('club_member_roster')
      .upsert({
        club_id: clubId,
        email: formData.email.toLowerCase().trim(),
        full_name: formData.full_name,
        membership_number: formData.membership_number || null,
        handicap_index: parseFloat(formData.handicap_index) || 0,
        role: addRole
      }, { onConflict: 'club_id, email' })

    if (error) {
      alert('Error adding: ' + error.message)
    } else {
      setShowAddModal(false)
      setFormData({ email: '', full_name: '', membership_number: '', handicap_index: '' })
      fetchRoster(clubId)
    }
  }

  const handleDeleteRoster = async (id: string) => {
    if (!confirm('Are you sure you want to remove this person from the roster?')) return
    
    const { error } = await supabase
      .from('club_member_roster')
      .delete()
      .eq('id', id)
    
    if (error) {
      alert('Error removing: ' + error.message)
    } else {
      fetchRoster(clubId!)
    }
  }

  const downloadDemoCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,Email,Member ID,Handicap\nJohn Doe,john@example.com,M-1234,12.5\nJane Smith,jane@example.com,M-5678,8.2"
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "roster_template.csv")
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  // ==== App Member Handlers ====
  const handleUpdateStatus = async (membershipId: string, newStatus: 'active' | 'rejected') => {
    if (!clubId) return
    
    setMembers(prev => prev.map(m => 
      m.id === membershipId ? { ...m, status: newStatus } : m
    ))

    try {
      const { error } = await supabase
        .from('player_club_memberships')
        .update({ status: newStatus })
        .eq('id', membershipId)
      
      if (error) {
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
      fetchAppMembers(clubId)
    }
  }

  // Derived state
  const filteredRoster = roster.filter(m => 
    m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const rosterPlayers = filteredRoster.filter(m => m.role === 'player')
  const rosterCoaches = filteredRoster.filter(m => m.role === 'coach')

  const filteredAppMembers = members.filter(m => 
    m.user_profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.user_profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const pendingMembers = filteredAppMembers.filter(m => m.status === 'pending')
  const activeMembers = filteredAppMembers.filter(m => m.status === 'active')

  return (
    <div className="portal-content">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Club Members</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Manage your authorized roster and active app users.
          </p>
        </div>
        
        {view === 'roster' && (
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={downloadDemoCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity">
              <Download size={16} />
              Template
            </button>

            <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity cursor-pointer">
              <Upload size={16} />
              {isUploading ? 'Uploading...' : 'Import CSV'}
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>

            <button 
              onClick={() => { setAddRole('player'); setShowAddModal(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border shadow-sm text-sm font-semibold hover:bg-gray-50 transition-colors">
              <UserPlus size={16} />
              Add Player
            </button>

            <button 
              onClick={() => { setAddRole('coach'); setShowAddModal(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold shadow-sm hover:bg-indigo-100 transition-colors">
              <Plus size={16} />
              Add Coach
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setView('roster')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            view === 'roster' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Authorized Roster
        </button>
        <button
          onClick={() => setView('app')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            view === 'app' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Active App Members
        </button>
      </div>

      <div className="flex items-center gap-3 bg-background border rounded-xl px-4 py-3 mb-6 shadow-sm max-w-md">
        <Search size={18} style={{ color: 'var(--color-light)' }} />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-sm text-text"
        />
      </div>

      {loading ? (
        <TableSkeleton />
      ) : view === 'roster' ? (
        // ==== ROSTER VIEW ====
        <div className="space-y-8 animate-in fade-in">
          {uploadStats && (
            <div className="mb-6 p-4 rounded-xl border bg-white shadow-sm">
              <h3 className="font-bold mb-2">Upload Results</h3>
              <p className="text-sm text-green-600 font-medium">Successfully added/updated: {uploadStats.success}</p>
              {uploadStats.failed > 0 && (
                <>
                  <p className="text-sm text-red-600 font-medium mt-1">Failed to import: {uploadStats.failed}</p>
                  <div className="mt-2 text-xs font-mono bg-red-50 p-2 rounded max-h-32 overflow-y-auto">
                    {uploadStats.errors.map((e, i) => (
                      <div key={i}>{e.email}: {e.error}</div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {rosterCoaches.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-700">
                Verified Coaches ({rosterCoaches.length})
              </h2>
              <div className="card">
                <div className="table-responsive-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Added On</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rosterCoaches.map(m => (
                        <tr key={m.id}>
                          <td className="font-semibold">{m.full_name}</td>
                          <td className="text-sm text-muted-foreground">{m.email}</td>
                          <td className="text-sm text-muted-foreground">{new Date(m.uploaded_at).toLocaleDateString()}</td>
                          <td>
                            <button onClick={() => handleDeleteRoster(m.id)} className="text-red-500 hover:text-red-700">
                              <Trash size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              Players Roster ({rosterPlayers.length})
            </h2>
            <div className="card">
              <div className="table-responsive-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Member ID</th>
                      <th>Handicap</th>
                      <th>Added On</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterPlayers.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-10">No players in roster</td></tr>
                    ) : (
                      rosterPlayers.map(m => (
                        <tr key={m.id}>
                          <td className="font-semibold">{m.full_name}</td>
                          <td className="text-sm text-muted-foreground">{m.email}</td>
                          <td className="text-sm font-mono">{m.membership_number || '—'}</td>
                          <td>
                            <span className="badge bg-green-50 text-green-700">
                              {m.handicap_index?.toFixed(1) ?? 'N/A'}
                            </span>
                          </td>
                          <td className="text-sm text-muted-foreground">{new Date(m.uploaded_at).toLocaleDateString()}</td>
                          <td>
                            <button onClick={() => handleDeleteRoster(m.id)} className="text-red-500 hover:text-red-700 p-1">
                              <Trash size={16} />
                            </button>
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
      ) : (
        // ==== APP MEMBERS VIEW ====
        <div className="space-y-8 animate-in fade-in">
          {pendingMembers.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                Waitlisted Requests ({pendingMembers.length})
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

          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Active App Members ({activeMembers.length})
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
                              <Users size={22} className="text-muted-foreground" />
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

      {/* Manual Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add {addRole === 'coach' ? 'Coach' : 'Player'}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleManualAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm" />
              </div>
              
              {addRole === 'player' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Membership Number (Optional)</label>
                    <input type="text" value={formData.membership_number} onChange={e => setFormData({...formData, membership_number: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Handicap Index</label>
                    <input required type="number" step="0.1" value={formData.handicap_index} onChange={e => setFormData({...formData, handicap_index: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm" />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 font-medium text-sm text-gray-600 hover:text-gray-800">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-bold rounded-xl shadow hover:opacity-90">
                  Add {addRole === 'coach' ? 'Coach' : 'Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
