'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase-client'
import { format, differenceInDays, parseISO } from 'date-fns'
import { 
  CreditCard, Check, ShieldAlert, Sparkles, CheckSquare, 
  Square, RefreshCw, Calendar, AlertTriangle, Search, 
  HelpCircle, Clock, X 
} from 'lucide-react'

type Caddie = {
  id: string
  name: string
  phone: string
  paid_until: string | null
  is_marketplace_visible: boolean
}

export default function PaymentsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [caddies, setCaddies] = useState<Caddie[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [clubId, setClubId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Payment simulation state
  const [paymentInProgress, setPaymentInProgress] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

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

  // 2. Fetch caddies payment statuses
  const fetchCaddiesData = async () => {
    if (!clubId) return
    setLoading(true)
    const { data } = await supabase
      .from('caddies')
      .select('id, name, phone, paid_until, is_marketplace_visible')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (data) setCaddies(data)
    setLoading(false)
  }

  useEffect(() => {
    if (clubId) {
      fetchCaddiesData()
    }
  }, [clubId])

  const toggleSelectCaddie = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  // Filter caddies by search query first
  const filteredCaddies = useMemo(() => {
    if (!searchQuery.trim()) return caddies
    return caddies.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
    )
  }, [caddies, searchQuery])

  // Group filtered caddies into batches
  const { activeBatches, unpaidList } = useMemo(() => {
    const now = new Date()
    const active: { [dateKey: string]: { dateStr: string; caddies: Caddie[] } } = {}
    const unpaid: Caddie[] = []

    filteredCaddies.forEach(c => {
      const isPaid = c.paid_until && new Date(c.paid_until) > now
      if (isPaid && c.paid_until) {
        const dateKey = format(new Date(c.paid_until), 'yyyy-MM-dd')
        const formattedLabel = format(new Date(c.paid_until), 'd MMM yyyy')
        if (!active[dateKey]) {
          active[dateKey] = { dateStr: formattedLabel, caddies: [] }
        }
        active[dateKey].caddies.push(c)
      } else {
        unpaid.push(c)
      }
    })

    // Sort active batches by expiry date (earliest first)
    const sortedKeys = Object.keys(active).sort()
    const sortedBatches = sortedKeys.map(key => ({
      expiryDateRaw: key,
      ...active[key]
    }))

    return {
      activeBatches: sortedBatches,
      unpaidList: unpaid
    }
  }, [filteredCaddies])

  // Helper: toggle selection of an entire list of caddies (e.g. a batch or unpaid list)
  const toggleSelectBatch = (batchCaddies: Caddie[]) => {
    const batchIds = batchCaddies.map(c => c.id)
    const allSelected = batchIds.every(id => selectedIds.includes(id))

    if (allSelected) {
      // Deselect all caddies in this batch
      setSelectedIds(prev => prev.filter(id => !batchIds.includes(id)))
    } else {
      // Select all caddies in this batch
      setSelectedIds(prev => {
        const toAdd = batchIds.filter(id => !prev.includes(id))
        return [...prev, ...toAdd]
      })
    }
  }

  const isBatchFullySelected = (batchCaddies: Caddie[]) => {
    if (batchCaddies.length === 0) return false
    return batchCaddies.every(c => selectedIds.includes(c.id))
  }

  const isBatchPartiallySelected = (batchCaddies: Caddie[]) => {
    if (batchCaddies.length === 0) return false
    const selectedCount = batchCaddies.filter(c => selectedIds.includes(c.id)).length
    return selectedCount > 0 && selectedCount < batchCaddies.length
  }

  const getDaysRemainingText = (dateRaw: string) => {
    const diff = differenceInDays(new Date(dateRaw), new Date())
    if (diff === 0) return 'Expires today'
    if (diff === 1) return 'Expires tomorrow'
    if (diff < 0) return 'Expired'
    return `${diff} days left`
  }

  const handleSimulatePayment = async () => {
    if (selectedIds.length === 0 || !clubId) return
    setPaymentInProgress(true)
    setPaymentSuccess(false)

    // Simulate Paystack processing
    await new Promise(resolve => setTimeout(resolve, 1500))

    try {
      const nextPaidUntil = new Date()
      nextPaidUntil.setDate(nextPaidUntil.getDate() + 30) // 30-day subscription

      // 1. Update caddies subscription status and marketplace visibility
      const { error: caddieError } = await supabase
        .from('caddies')
        .update({
          paid_until: nextPaidUntil.toISOString(),
          is_marketplace_visible: true
        })
        .in('id', selectedIds)

      if (caddieError) throw caddieError

      // 2. Record payment in caddie_payments log
      const amountKes = selectedIds.length * 280
      const { error: paymentError } = await supabase
        .from('caddie_payments')
        .insert({
          club_id: clubId,
          paystack_reference: `demo_${Math.random().toString(36).substring(2, 15)}`,
          amount_kes: amountKes,
          caddie_count: selectedIds.length,
          caddie_ids: selectedIds,
          status: 'confirmed',
          paid_at: new Date().toISOString()
        })

      if (paymentError) throw paymentError

      setPaymentSuccess(true)
      setSelectedIds([])
      fetchCaddiesData()
    } catch (err) {
      console.error('Payment simulation failed:', err)
    } finally {
      setPaymentInProgress(false)
    }
  }

  const pricePerCaddie = 280
  const totalAmount = selectedIds.length * pricePerCaddie

  // Find names of selected caddies to display in checkout summary
  const selectedCaddiesNames = useMemo(() => {
    return caddies.filter(c => selectedIds.includes(c.id)).map(c => c.name)
  }, [caddies, selectedIds])

  return (
    <div className="portal-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Payments & Subscriptions</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Renew and manage batch subscription payments for caddies at KES {pricePerCaddie}/month per caddie
          </p>
        </div>
      </div>

      {/* Filter and search row */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search caddies by name or phone..."
            className="input w-full max-w-md"
            style={{ paddingLeft: '2.5rem' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="text-sm font-medium"
            style={{ color: 'var(--color-primary)' }}
          >
            Clear Search
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-text-muted">
          Loading subscription records…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Caddies Lists (Main area) */}
          <div className="col-span-3 space-y-6">
            
            {/* Active Batches Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
                <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Active Batches</h2>
              </div>

              {activeBatches.length === 0 ? (
                <div className="card p-6 text-center text-text-muted" style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  No caddies with active subscriptions found.
                </div>
              ) : (
                <div className="space-y-4">
                  {activeBatches.map(batch => {
                    const fullySelected = isBatchFullySelected(batch.caddies)
                    const partiallySelected = isBatchPartiallySelected(batch.caddies)
                    const daysRemaining = differenceInDays(new Date(batch.expiryDateRaw), new Date())
                    const daysText = getDaysRemainingText(batch.expiryDateRaw)
                    
                    // Style badges based on expiry urgency
                    let badgeBg = 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    if (daysRemaining <= 3) {
                      badgeBg = 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                    } else if (daysRemaining <= 7) {
                      badgeBg = 'bg-amber-50 text-amber-700 border border-amber-200'
                    }

                    return (
                      <div key={batch.expiryDateRaw} className="card p-0 overflow-hidden">
                        {/* Batch Header */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem 1.25rem',
                          background: 'var(--color-lighter)',
                          borderBottom: '1px solid var(--color-light)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button 
                              onClick={() => toggleSelectBatch(batch.caddies)}
                              style={{ color: fullySelected || partiallySelected ? 'var(--color-primary)' : 'var(--color-light)' }}
                              className="flex items-center"
                            >
                              {fullySelected ? (
                                <CheckSquare size={18} />
                              ) : (
                                <Square size={18} />
                              )}
                            </button>
                            <div>
                              <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                                Expiry Date: {batch.dateStr}
                              </span>
                              <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>
                                ({batch.caddies.length} caddies)
                              </span>
                            </div>
                          </div>
                          
                          <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeBg}`}>
                            {daysText}
                          </div>
                        </div>

                        {/* Batch Table */}
                      <div className="table-responsive-wrapper">
                        <table className="data-table" style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              <th style={{ width: '40px' }}></th>
                              <th>Caddie Name</th>
                              <th>Phone</th>
                              <th>Subscription End</th>
                            </tr>
                          </thead>
                          <tbody>
                            {batch.caddies.map(c => {
                              const isSelected = selectedIds.includes(c.id)
                              return (
                                <tr key={c.id} className={isSelected ? 'bg-light/10' : ''}>
                                  <td>
                                    <button 
                                      onClick={() => toggleSelectCaddie(c.id)} 
                                      style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-light)' }}
                                    >
                                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                    </button>
                                  </td>
                                  <td className="font-semibold">{c.name}</td>
                                  <td className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>{c.phone}</td>
                                  <td className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                                    {format(new Date(c.paid_until!), 'd MMM yyyy')}
                                  </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Unpaid / Expired Caddies Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Unpaid & Expired Caddies</h2>
              </div>

              <div className="card p-0 overflow-hidden" style={{ borderLeft: '4px solid #ef4444' }}>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  background: '#fef2f2',
                  borderBottom: '1px solid #fee2e2'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button 
                      onClick={() => toggleSelectBatch(unpaidList)}
                      style={{ color: isBatchFullySelected(unpaidList) ? '#ef4444' : 'var(--color-light)' }}
                      className="flex items-center"
                    >
                      {isBatchFullySelected(unpaidList) && unpaidList.length > 0 ? (
                        <CheckSquare size={18} style={{ color: '#ef4444' }} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                    <div>
                      <span className="font-bold text-sm text-red-800">
                        General Unpaid / Expired List
                      </span>
                      <span className="text-xs text-red-600 ml-2">
                        ({unpaidList.length} caddies require payment)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="table-responsive-wrapper">
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>Caddie Name</th>
                        <th>Phone</th>
                        <th>Expiry Status</th>
                        <th>Last Expiry Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unpaidList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-text-muted" style={{ color: 'var(--color-text-muted)' }}>
                            No unpaid or expired caddies. All registered caddies are fully paid!
                          </td>
                        </tr>
                      ) : (
                        unpaidList.map(c => {
                          const isSelected = selectedIds.includes(c.id)
                          return (
                            <tr key={c.id} className={isSelected ? 'bg-red-50/30' : ''}>
                              <td>
                                <button 
                                  onClick={() => toggleSelectCaddie(c.id)} 
                                  style={{ color: isSelected ? '#ef4444' : 'var(--color-light)' }}
                                >
                                  {isSelected ? <CheckSquare size={18} style={{ color: '#ef4444' }} /> : <Square size={18} />}
                                </button>
                              </td>
                              <td className="font-semibold">{c.name}</td>
                              <td className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>{c.phone}</td>
                              <td>
                                <span className="badge badge-warning" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2' }}>
                                  {c.paid_until ? 'Expired' : 'Unpaid'}
                                </span>
                              </td>
                              <td className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                                {c.paid_until ? format(new Date(c.paid_until), 'd MMM yyyy') : 'Never'}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Side Checkout Summary */}
          <div className="col-span-1 space-y-4">
            <div className="card p-6" style={{ position: 'sticky', top: '1.5rem' }}>
              <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--color-text)' }}>Checkout Summary</h3>
              
              <div className="space-y-3 pb-4 mb-4 border-b text-sm" style={{ borderColor: 'var(--color-lighter)' }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>Selected caddies</span>
                  <span className="font-semibold">{selectedIds.length}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>Cost per caddie</span>
                  <span className="font-semibold">KES {pricePerCaddie}</span>
                </div>
              </div>

              {/* Selected caddies tags listing */}
              {selectedCaddiesNames.length > 0 && (
                <div className="mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Paying for:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {selectedCaddiesNames.map((name, index) => (
                      <span 
                        key={index} 
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1"
                        style={{ background: 'var(--color-lighter)', color: 'var(--color-text)' }}
                      >
                        {name.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-end mb-6">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Total Amount</span>
                <span className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>KES {totalAmount.toLocaleString()}</span>
              </div>

              <div className="space-y-2">
                <button
                  disabled={selectedIds.length === 0 || paymentInProgress}
                  className="w-full btn-primary justify-center py-3 text-sm font-bold"
                  style={{ background: selectedIds.length === 0 ? 'var(--color-light)' : 'var(--color-primary)' }}
                  onClick={handleSimulatePayment}
                >
                  {paymentInProgress ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} />
                      Processing Test...
                    </>
                  ) : (
                    'Pay Now (Test Mode)'
                  )}
                </button>
              </div>

              {/* Sandbox Tip Banner */}
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 flex gap-2">
                <Sparkles size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-amber-800">
                  <strong>Sandbox Integration:</strong> Tapping "Pay Now" simulates the Paystack checkout webhook, immediately updating your caddies' subscriptions for 30 days.
                </p>
              </div>
            </div>

            {paymentSuccess && (
              <div className="card bg-emerald-50 border border-emerald-200 p-4 flex gap-3">
                <Check size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-800">Payment Successful</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">Selected caddies subscriptions have been renewed and are now visible on the marketplace.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
