'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import {
  Trophy, Users, Edit2, ArrowLeft, CheckCircle, XCircle,
  Calendar, Shuffle, ArrowUpNarrowWide, Clock, Wand2, Download,
  Printer, Save, RefreshCw, AlertTriangle, X
} from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

type Competition = {
  id: string
  name: string
  competition_type: string
  status: string
  start_date: string
  entry_fee: number | null
  currency: string
  is_template: boolean
  poster_url: string | null
  description: string | null
}

type Entry = {
  id: string
  player_id: string
  entry_status: string
  payment_status: string
  playing_handicap: number | null
  preferred_time_window?: 'morning' | 'midday' | 'afternoon'
  user: {
    name: string
    handicapIndex: number
  }
  created_at?: string
}

type StartListItem = {
  round_number: number
  tee_time: string
  tee_number: number
  group_number: number
  full_name: string
  handicap_index: number
  playing_handicap: number
  tee_color: string
}

type LeaderboardItem = {
  position: number | null
  full_name: string
  handicap_index: number
  playing_handicap: number
  gross_score: number | null
  net_score: number | null
  stableford_points: number | null
  result_status: string
}

type SortMethod = 'random' | 'handicap' | 'entry_date'
type TeeConfig = 'hole1' | 'both'

type GeneratedGroup = {
  teeTime: string
  teeNumber: number
  groupNumber: number
  players: {
    name: string
    handicapIndex: number
    playingHandicap: number | null
    entryId: string | null
  }[]
}

export default function CompetitionDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const competitionId = (params?.id ?? '') as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [startList, setStartList] = useState<StartListItem[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([])
  const [activeTab, setActiveTab] = useState('entries')

  // Starting Sheet Generator state
  const [sortMethod, setSortMethod] = useState<SortMethod>('handicap')
  const [startTime, setStartTime] = useState('07:00')
  const [teeConfig, setTeeConfig] = useState<TeeConfig>('hole1')
  const [groupSize, setGroupSize] = useState(3)
  const [intervalMinutes, setIntervalMinutes] = useState(10)
  const [generatedGroups, setGeneratedGroups] = useState<GeneratedGroup[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Scorecard entry and course holes state
  const [courseHoles, setCourseHoles] = useState<any[]>([])
  const [isScorecardModalOpen, setIsScorecardModalOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [scorecardInputs, setScorecardInputs] = useState<Record<number, number | string>>({})
  const [isSavingScorecard, setIsSavingScorecard] = useState(false)

  useEffect(() => {
    const fetchDetails = async () => {
      if (!competitionId) return

      const { data: compData } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .single()

      if (compData) {
        setCompetition(compData)
        
        // Fetch course holes for the competition course
        const { data: holesData } = await supabase
          .from('CourseHole')
          .select('*')
          .eq('courseId', compData.club_id)
          .order('holeNumber', { ascending: true })
        
        if (holesData) {
          setCourseHoles(holesData)
        }
      }

      const { data: entriesData } = await supabase
        .from('competition_entries')
        .select(`
          id,
          player_id,
          entry_status,
          payment_status,
          playing_handicap,
          preferred_time_window,
          created_at,
          user:User!player_id (name, "handicapIndex")
        `)
        .eq('competition_id', competitionId)

      if (entriesData) {
        // @ts-ignore
        setEntries(entriesData)
      }

      const { data: slData } = await supabase
        .from('competition_starting_sheet')
        .select('*')
        .eq('competition_id', competitionId)
        .order('tee_time', { ascending: true })

      if (slData) setStartList(slData)

      const { data: lbData } = await supabase
        .from('competition_leaderboard')
        .select('*')
        .eq('competition_id', competitionId)
        .order('position', { ascending: true })

      if (lbData) setLeaderboard(lbData)

      setLoading(false)
    }

    fetchDetails()
  }, [competitionId])

  const handleUpdatePaymentStatus = async (entryId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('competition_entries')
        .update({ payment_status: newStatus })
        .eq('id', entryId)

      if (error) throw error

      setEntries(entries.map(e =>
        e.id === entryId ? { ...e, payment_status: newStatus } : e
      ))
    } catch (err) {
      console.error('Failed to update status:', err)
      alert('Failed to update status')
    }
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!competitionId) return
    try {
      const { error } = await supabase
        .from('competitions')
        .update({ status: newStatus })
        .eq('id', competitionId)

      if (error) throw error

      if (competition) {
        setCompetition({ ...competition, status: newStatus })
      }
    } catch (err) {
      console.error('Failed to update competition status:', err)
      alert('Failed to update competition status')
    }
  }

  // ─── PDF Downloads ──────────────────────────────────────────────────────────

  const downloadLeaderboardPDF = () => {
    if (!competition) return
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.setTextColor(40)
    doc.text(competition.name, 14, 22)
    doc.setFontSize(14)
    doc.text("Competition Leaderboard", 14, 30)
    
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Date: ${new Date(competition.start_date).toLocaleDateString()}`, 14, 38)
    doc.text(`Format: ${(competition.competition_type || '').replace('_', ' ').toUpperCase()}`, 14, 44)

    const tableRows = leaderboard.map(lb => [
      lb.position != null ? `#${lb.position}` : '-',
      lb.full_name || 'Unknown',
      lb.handicap_index != null ? lb.handicap_index.toFixed(1) : '-',
      lb.playing_handicap != null ? lb.playing_handicap.toFixed(1) : '-',
      (lb.result_status || '').toUpperCase(),
      lb.gross_score != null ? lb.gross_score : '-',
      lb.net_score != null ? Number(lb.net_score).toFixed(0) : '-',
      lb.stableford_points != null ? lb.stableford_points : '-'
    ])

    const headers = [["Pos", "Player Name", "H.I.", "P.H.", "Status", "Gross", "Net", "Points"]]

    // @ts-ignore
    doc.autoTable({
      head: headers,
      body: tableRows,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 10, cellPadding: 3 }
    })

    doc.save(`${competition.name.replace(/\s+/g, '_')}_Leaderboard.pdf`)
  }

  const downloadEntriesPDF = () => {
    if (!competition) return
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.setTextColor(40)
    doc.text(competition.name, 14, 22)
    doc.setFontSize(14)
    doc.text("Player Entries & Payments", 14, 30)
    
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Date: ${new Date(competition.start_date).toLocaleDateString()}`, 14, 38)
    doc.text(`Total Entries: ${entries.length}`, 14, 44)

    const tableRows = entries.map(entry => [
      entry.user?.name || 'Unknown User',
      entry.user?.handicapIndex != null ? entry.user.handicapIndex.toFixed(1) : '-',
      (entry.entry_status || '').toUpperCase(),
      (entry.payment_status || '').toUpperCase()
    ])

    const headers = [["Player Name", "H.I.", "Entry Status", "Payment Status"]]

    // @ts-ignore
    doc.autoTable({
      head: headers,
      body: tableRows,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 10, cellPadding: 3 }
    })

    doc.save(`${competition.name.replace(/\s+/g, '_')}_Entries.pdf`)
  }

  const downloadStartingSheetPDF = () => {
    if (!competition) return
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.setTextColor(40)
    doc.text(competition.name, 14, 22)
    doc.setFontSize(14)
    doc.text("Official Starting Sheet", 14, 30)
    
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Date: ${new Date(competition.start_date).toLocaleDateString()}`, 14, 38)
    doc.text(`Total Players: ${startList.length}`, 14, 44)

    const tableRows = startList.map(st => [
      new Date(st.tee_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      `Hole #${st.tee_number}`,
      `Group ${st.group_number}`,
      st.full_name || 'Unknown',
      st.handicap_index != null ? st.handicap_index.toFixed(1) : '-',
      st.playing_handicap != null ? st.playing_handicap.toFixed(0) : '-'
    ])

    const headers = [["Time", "Tee", "Group", "Player Name", "H.I.", "P.H."]]

    // @ts-ignore
    doc.autoTable({
      head: headers,
      body: tableRows,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 10, cellPadding: 3 }
    })

    doc.save(`${competition.name.replace(/\s+/g, '_')}_Starting_Sheet.pdf`)
  }

  const printStartingSheetPDF = () => {
    if (!competition) return
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.setTextColor(40)
    doc.text(competition.name, 14, 22)
    doc.setFontSize(14)
    doc.text("Official Starting Sheet", 14, 30)
    
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Date: ${new Date(competition.start_date).toLocaleDateString()}`, 14, 38)
    doc.text(`Total Players: ${startList.length}`, 14, 44)

    const tableRows = startList.map(st => [
      new Date(st.tee_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      `Hole #${st.tee_number}`,
      `Group ${st.group_number}`,
      st.full_name || 'Unknown',
      st.handicap_index != null ? st.handicap_index.toFixed(1) : '-',
      st.playing_handicap != null ? st.playing_handicap.toFixed(0) : '-'
    ])

    const headers = [["Time", "Tee", "Group", "Player Name", "H.I.", "P.H."]]

    // @ts-ignore
    doc.autoTable({
      head: headers,
      body: tableRows,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 10, cellPadding: 3 }
    })

    doc.autoPrint()
    const blobUrl = doc.output('bloburl')
    window.open(blobUrl, '_blank')
  }

  const downloadStartingSheetCSV = () => {
    if (!competition) return
    
    const headers = ["Time", "Tee", "Group", "Player Name", "H.I.", "P.H."]
    const rows = startList.map(st => [
      new Date(st.tee_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      `Hole ${st.tee_number}`,
      `Group ${st.group_number}`,
      st.full_name || 'Unknown',
      st.handicap_index != null ? st.handicap_index.toFixed(1) : '-',
      st.playing_handicap != null ? st.playing_handicap.toFixed(0) : '-'
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${competition.name.replace(/\s+/g, '_')}_Starting_Sheet.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ─── Scorecard Management ────────────────────────────────────────────────────

  const openScorecardModal = async (entry: Entry) => {
    setSelectedEntry(entry)
    setIsScorecardModalOpen(true)
    
    // Fetch existing scorecard if any
    const { data: resData } = await supabase
      .from('competition_results')
      .select('scorecard')
      .eq('competition_id', competitionId)
      .eq('player_id', entry.player_id)
      .maybeSingle()

    if (resData?.scorecard && Array.isArray(resData.scorecard)) {
      const inputs: Record<number, number> = {}
      resData.scorecard.forEach((h: any) => {
        if (h.hole && h.strokes) {
          inputs[h.hole] = h.strokes
        }
      })
      setScorecardInputs(inputs)
    } else {
      setScorecardInputs({})
    }
  }

  const savePlayerScorecard = async () => {
    if (!selectedEntry || !competition) return
    setIsSavingScorecard(true)

    try {
      const scorecard = Array.from({ length: 18 }).map((_, idx) => {
        const holeNum = idx + 1
        const holeInfo = courseHoles.find(ch => ch.holeNumber === holeNum) || { par: 4, handicapIndex: holeNum }
        const strokes = scorecardInputs[holeNum]
        return {
          hole: holeNum,
          par: holeInfo.par,
          strokes: strokes === '' || strokes == null ? null : Number(strokes)
        }
      })

      const enteredCount = scorecard.filter(h => h.strokes !== null).length
      if (enteredCount === 0) {
        alert("Please enter a score for at least one hole.")
        setIsSavingScorecard(false)
        return
      }

      const { error } = await supabase
        .from('competition_results')
        .upsert({
          competition_id: competitionId,
          entry_id: selectedEntry.id,
          player_id: selectedEntry.player_id,
          scorecard: scorecard,
          certified: true,
          result_status: 'active'
        }, { onConflict: 'competition_id,player_id' })

      if (error) throw error

      setIsScorecardModalOpen(false)
      setSelectedEntry(null)
      setScorecardInputs({})
      
      router.refresh()
      
      // Fetch fresh leaderboard data
      const { data: lbData } = await supabase
        .from('competition_leaderboard')
        .select('*')
        .eq('competition_id', competitionId)
        .order('position', { ascending: true })

      if (lbData) setLeaderboard(lbData)
    } catch (err) {
      console.error("Failed to save scorecard:", err)
      alert("Failed to save scorecard. Please try again.")
    } finally {
      setIsSavingScorecard(false)
    }
  }

  // ─── Starting Sheet Generator ───────────────────────────────────────────────

  const confirmedEntries = entries.filter(e => e.entry_status === 'confirmed')

  const generateStartSheet = () => {
    if (confirmedEntries.length === 0) return

    // Sort function based on selected method
    const sortPlayers = (players: Entry[]) => {
      let sorted = [...players]
      if (sortMethod === 'handicap') {
        sorted.sort((a, b) => (a.user?.handicapIndex ?? 99) - (b.user?.handicapIndex ?? 99))
      } else if (sortMethod === 'entry_date') {
        sorted.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
          return dateA - dateB
        })
      } else {
        // Random shuffle
        for (let i = sorted.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [sorted[i], sorted[j]] = [sorted[j], sorted[i]]
        }
      }
      return sorted
    }

    // Split by preference
    const morning = confirmedEntries.filter(e => e.preferred_time_window === 'morning')
    const midday = confirmedEntries.filter(e => e.preferred_time_window === 'midday')
    const afternoon = confirmedEntries.filter(e => e.preferred_time_window === 'afternoon')
    const noPref = confirmedEntries.filter(e => !e.preferred_time_window)

    // Combine them sequentially (morning -> midday -> noPref -> afternoon)
    const sortedAll = [
      ...sortPlayers(morning),
      ...sortPlayers(midday),
      ...sortPlayers(noPref),
      ...sortPlayers(afternoon)
    ]

    // 2. Split into groups and pad with vacant slots
    const groups: GeneratedGroup[] = []
    const [hours, minutes] = startTime.split(':').map(Number)

    const compDate = competition?.start_date
      ? new Date(competition.start_date)
      : new Date()
    compDate.setHours(hours, minutes, 0, 0)

    let groupNumber = 1
    let slotIndex = 0

    if (teeConfig === 'hole1') {
      // All groups start on Hole 1, staggered by intervalMinutes
      for (let i = 0; i < sortedAll.length; i += groupSize) {
        const groupPlayers = sortedAll.slice(i, i + groupSize)
        
        // Pad with dummy vacant slots if needed
        const paddedPlayers = [...groupPlayers]
        while (paddedPlayers.length < groupSize) {
          paddedPlayers.push({
            id: `vacant-${slotIndex}-${paddedPlayers.length}`,
            player_id: '',
            entry_status: '',
            payment_status: '',
            playing_handicap: null,
            user: { name: 'Vacant Slot', handicapIndex: 0 },
            preferred_time_window: undefined
          })
        }

        const teeTime = new Date(compDate.getTime() + slotIndex * intervalMinutes * 60000)

        groups.push({
          teeTime: teeTime.toISOString(),
          teeNumber: 1,
          groupNumber,
          players: paddedPlayers.map(e => ({
            name: e.user?.name || 'Vacant Slot',
            handicapIndex: e.user?.handicapIndex ?? 0,
            playingHandicap: e.playing_handicap,
            entryId: e.id.startsWith('vacant-') ? null : e.id,
          })),
        })
        groupNumber++
        slotIndex++
      }
    } else {
      // Hole 1 & 10 simultaneously
      let teeToggle = 1
      let currentSlot = 0

      for (let i = 0; i < sortedAll.length; i += groupSize) {
        const groupPlayers = sortedAll.slice(i, i + groupSize)
        
        const paddedPlayers = [...groupPlayers]
        while (paddedPlayers.length < groupSize) {
          paddedPlayers.push({
            id: `vacant-${currentSlot}-${teeToggle}-${paddedPlayers.length}`,
            player_id: '',
            entry_status: '',
            payment_status: '',
            playing_handicap: null,
            user: { name: 'Vacant Slot', handicapIndex: 0 },
            preferred_time_window: undefined
          })
        }

        const teeTime = new Date(compDate.getTime() + currentSlot * intervalMinutes * 60000)

        groups.push({
          teeTime: teeTime.toISOString(),
          teeNumber: teeToggle,
          groupNumber,
          players: paddedPlayers.map(e => ({
            name: e.user?.name || 'Vacant Slot',
            handicapIndex: e.user?.handicapIndex ?? 0,
            playingHandicap: e.playing_handicap,
            entryId: e.id.startsWith('vacant-') ? null : e.id,
          })),
        })

        groupNumber++
        if (teeToggle === 1) {
          teeToggle = 10
        } else {
          teeToggle = 1
          currentSlot++
        }
      }
    }

    setGeneratedGroups(groups)
    setSaveSuccess(false)
  }

  const saveStartSheet = async () => {
    if (generatedGroups.length === 0 || !competitionId) return
    setIsSaving(true)

    try {
      // Delete existing start sheet for this competition
      const { error: deleteError } = await supabase
        .from('starting_sheets')
        .delete()
        .eq('competition_id', competitionId)

      if (deleteError) throw deleteError

      // Build rows to insert
      const rows: Record<string, unknown>[] = []
      for (const group of generatedGroups) {
        for (const player of group.players) {
          rows.push({
            competition_id: competitionId,
            round_number: 1,
            tee_time: group.teeTime,
            tee_number: group.teeNumber,
            group_number: group.groupNumber,
            entry_id: player.entryId,
          })
        }
      }

      const { error } = await supabase
        .from('starting_sheets')
        .insert(rows)

      if (error) throw error

      // Refresh start list
      const { data: slData } = await supabase
        .from('competition_starting_sheet')
        .select('*')
        .eq('competition_id', competitionId)
        .order('tee_time', { ascending: true })

      if (slData) setStartList(slData)

      setSaveSuccess(true)
      setGeneratedGroups([])
    } catch (err: any) {
      console.error('Error saving start sheet:', err)
      alert(`Failed to save start sheet: ${err?.message || err?.details || JSON.stringify(err)}`)
    } finally {
      setIsSaving(false)
    }
  }

  const formatTeeTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <div className="p-8 text-text-muted text-sm">Loading competition…</div>
  if (!competition) return <div className="p-8">Competition not found</div>

  const startDate = new Date(competition.start_date).toLocaleDateString()
  const feeText = competition.entry_fee
    ? `${competition.currency} ${competition.entry_fee.toLocaleString()}`
    : 'Free'

  return (
    <div className="portal-content max-w-5xl">
      <button
        onClick={() => router.push('/competitions')}
        className="flex items-center gap-2 text-sm text-text-muted hover:text-text mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Competitions
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4 md:gap-0 mb-8">
        <div className="flex items-center gap-4">
          {competition.poster_url ? (
            <img src={competition.poster_url} alt="Poster" className="w-16 h-16 rounded-xl object-cover border" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-lighter flex items-center justify-center text-secondary">
              <Trophy size={24} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{competition.name}</h1>
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1 text-sm text-muted-foreground">
              <span className="capitalize">{(competition.competition_type || '').replace('_', ' ')}</span>
              <span className="hidden md:inline">•</span>
              <span>{startDate}</span>
              <span className="hidden md:inline">•</span>
              <span>{feeText}</span>
              <span className={`badge md:ml-2 ${competition.status === 'open_for_entry' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {(competition.status || '').replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {competition.status === 'upcoming' && (
            <button
              onClick={() => handleUpdateStatus('open_for_entry')}
              className="btn-primary flex items-center gap-1.5"
            >
              <CheckCircle size={16} />
              Open for Entries
            </button>
          )}
          {competition.status === 'open_for_entry' && (
            <button
              onClick={() => handleUpdateStatus('in_progress')}
              className="btn-primary flex items-center gap-1.5"
            >
              <CheckCircle size={16} />
              Start Competition
            </button>
          )}
          {competition.status === 'in_progress' && (
            <button
              onClick={() => handleUpdateStatus('completed')}
              className="btn-primary flex items-center gap-1.5"
            >
              <CheckCircle size={16} />
              Complete & Compile
            </button>
          )}
          {['upcoming', 'open_for_entry', 'in_progress', 'closed'].includes(competition.status) && (
            <button
              onClick={() => handleUpdateStatus('cancelled')}
              className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <XCircle size={16} />
              Cancel
            </button>
          )}
          {['closed', 'completed', 'cancelled'].includes(competition.status) && (
            <button
              onClick={() => handleUpdateStatus('upcoming')}
              className="btn-secondary flex items-center gap-1.5"
            >
              <RefreshCw size={16} />
              Reset to Upcoming
            </button>
          )}
          <button
            onClick={() => router.push(`/competitions/${competition.id}/edit`)}
            className="btn-secondary"
          >
            <Edit2 size={16} />
            Edit Settings
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto whitespace-nowrap border-b border-border mb-6">
        {(['entries', 'startlist', 'leaderboard'] as const).map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'entries' ? 'Entries & Payments' : tab === 'startlist' ? 'Starting Sheet' : 'Leaderboard'}
          </button>
        ))}
      </div>

      {/* ── ENTRIES TAB ── */}
      {activeTab === 'entries' && (
        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <Users size={20} className="text-primary" />
              Player Entries ({entries.length})
            </h2>
            <button
              onClick={downloadEntriesPDF}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <Download size={14} />
              Export PDF
            </button>
          </div>

          <div className="table-responsive-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Player Name</th>
                  <th>H.I.</th>
                  <th>Entry Status</th>
                  <th>Payment Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-text-muted text-sm">
                      No entries found for this competition.
                    </td>
                  </tr>
                ) : entries.map(entry => (
                  <tr key={entry.id}>
                    <td className="font-semibold text-sm">{entry.user?.name || 'Unknown User'}</td>
                    <td className="text-sm">{entry.user?.handicapIndex ?? 'N/A'}</td>
                    <td>
                      <span className={`badge ${entry.entry_status === 'confirmed' ? 'badge-active' : 'badge-warning'}`}>
                        {entry.entry_status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${entry.payment_status === 'paid' ? 'badge-active' : entry.payment_status === 'unpaid' ? 'badge-warning' : 'badge-neutral'}`}>
                        {entry.payment_status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {entry.payment_status !== 'paid' && (
                          <button
                            onClick={() => handleUpdatePaymentStatus(entry.id, 'paid')}
                            className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-medium border border-green-200"
                            title="Mark as Paid"
                          >
                            <CheckCircle size={14} />
                            Approve
                          </button>
                        )}
                        {entry.payment_status === 'paid' && (
                          <button
                            onClick={() => handleUpdatePaymentStatus(entry.id, 'unpaid')}
                            className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-medium border border-red-200"
                            title="Mark as Unpaid"
                          >
                            <XCircle size={14} />
                            Revoke
                          </button>
                        )}
                        {entry.entry_status === 'confirmed' && (
                          <button
                            onClick={() => openScorecardModal(entry)}
                            className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded text-xs font-medium border border-primary/20"
                            title="Manage Scorecard"
                          >
                            <Trophy size={14} />
                            Scorecard
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── STARTING SHEET TAB ── */}
      {activeTab === 'startlist' && (
        <div className="space-y-6">

          {/* Generator Panel */}
          <div className="card p-6">
            <div className="flex items-center gap-3 border-b border-border pb-4 mb-6">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted">
                <Wand2 size={18} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Starting Sheet Generator</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {confirmedEntries.length} confirmed {confirmedEntries.length === 1 ? 'entry' : 'entries'} available
                </p>
              </div>
            </div>

            {confirmedEntries.length === 0 && (
              <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl mb-6 text-sm text-destructive">
                <AlertTriangle size={18} className="shrink-0" />
                No confirmed entries yet. Approve entries in the "Entries & Payments" tab first.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Sort Method */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Player Order
                </label>
                <div className="flex flex-col gap-2">
                  {([
                    { value: 'handicap', label: 'Sort by Handicap Index', icon: <ArrowUpNarrowWide size={16} /> },
                    { value: 'entry_date', label: 'Sort by Entry Date', icon: <Calendar size={16} /> },
                    { value: 'random', label: 'Random Shuffle', icon: <Shuffle size={16} /> },
                  ] as { value: SortMethod; label: string; icon: React.ReactNode }[]).map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        sortMethod === opt.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/40 hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      <input
                        type="radio"
                        name="sortMethod"
                        value={opt.value}
                        checked={sortMethod === opt.value}
                        onChange={() => setSortMethod(opt.value)}
                        className="accent-primary"
                      />
                      <span className={sortMethod === opt.value ? "text-primary" : "text-muted-foreground"}>{opt.icon}</span>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Right column: Tee Config + Time + Group settings */}
              <div className="flex flex-col gap-5">

                {/* Start Time */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    <Clock size={14} className="inline mr-1.5 mb-0.5 text-muted-foreground" />
                    First Tee Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                {/* Tee Configuration */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Tee Configuration
                  </label>
                  <div className="flex flex-col gap-2">
                    {([
                      { value: 'hole1', label: 'Hole 1 only', desc: 'All groups start from the 1st tee' },
                      { value: 'both', label: 'Hole 1 & 10 simultaneously', desc: 'Groups alternate between tees at each interval' },
                    ] as { value: TeeConfig; label: string; desc: string }[]).map(opt => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          teeConfig === opt.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:border-primary/40 hover:bg-muted/50 text-foreground'
                        }`}
                      >
                        <input
                          type="radio"
                          name="teeConfig"
                          value={opt.value}
                          checked={teeConfig === opt.value}
                          onChange={() => setTeeConfig(opt.value)}
                          className="accent-primary mt-0.5"
                        />
                        <div>
                          <div className="text-sm font-medium">{opt.label}</div>
                          <div className={`text-xs mt-0.5 ${teeConfig === opt.value ? 'text-primary/70' : 'text-muted-foreground'}`}>{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Group Size & Interval */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Players per Group</label>
                    <select
                      value={groupSize}
                      onChange={e => setGroupSize(Number(e.target.value))}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {[2, 3, 4].map(n => <option key={n} value={n}>{n} players</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Interval (mins)</label>
                    <select
                      value={intervalMinutes}
                      onChange={e => setIntervalMinutes(Number(e.target.value))}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {[7, 8, 10, 12, 15].map(n => <option key={n} value={n}>{n} min</option>)}
                    </select>
                  </div>
                </div>

              </div>
            </div>

            {/* Generate Button */}
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border">
              <button
                onClick={generateStartSheet}
                disabled={confirmedEntries.length === 0}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Wand2 size={16} />
                Generate Starting Sheet
              </button>
              {generatedGroups.length > 0 && (
                <button
                  onClick={generateStartSheet}
                  className="btn-secondary"
                  title="Re-generate (useful for Random)"
                >
                  <RefreshCw size={15} />
                  Re-generate
                </button>
              )}
            </div>
          </div>

          {/* ── Generated Preview ── */}
          {generatedGroups.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  Preview — {generatedGroups.length} Groups · {confirmedEntries.length} Players
                </h2>
                <button
                  onClick={saveStartSheet}
                  disabled={isSaving}
                  className="btn-primary disabled:opacity-40"
                >
                  {isSaving ? (
                    <><RefreshCw size={15} className="animate-spin" /> Saving…</>
                  ) : (
                    <><Save size={15} /> Save & Publish</>
                  )}
                </button>
              </div>

              <div className="table-responsive-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Tee</th>
                      <th>Grp</th>
                      <th>Player</th>
                      <th>H.I.</th>
                      <th>P.H.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedGroups.map((group, gi) =>
                      group.players.map((player, pi) => (
                        <tr key={`${gi}-${pi}`} className={pi === 0 && gi > 0 ? 'border-t-2 border-light' : ''}>
                          <td className="font-semibold text-sm text-primary">
                            {pi === 0 ? formatTeeTime(group.teeTime) : ''}
                          </td>
                          <td className="text-sm">
                            {pi === 0 ? (
                              <span className={`badge ${group.teeNumber === 10 ? 'badge-warning' : 'badge-neutral'}`}>
                                #{group.teeNumber}
                              </span>
                            ) : ''}
                          </td>
                          <td className="text-sm font-semibold">
                            {pi === 0 ? group.groupNumber : ''}
                          </td>
                          <td className="font-semibold text-sm">{player.name}</td>
                          <td className="text-sm text-text-muted">{player.handicapIndex ?? 'N/A'}</td>
                          <td className="text-sm text-text-muted">{player.playingHandicap ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Saved Start List ── */}
          {startList.length > 0 && generatedGroups.length === 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  Published Starting Sheet ({startList.length} Players)
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadStartingSheetCSV}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <Download size={14} />
                    Export CSV
                  </button>
                  <button
                    onClick={downloadStartingSheetPDF}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <Download size={14} />
                    Export PDF
                  </button>
                  <button
                    onClick={printStartingSheetPDF}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <Printer size={14} />
                    Print
                  </button>
                </div>
              </div>

              <div className="table-responsive-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Tee</th>
                      <th>Grp</th>
                      <th>Player Name</th>
                      <th>H.I.</th>
                      <th>P.H.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {startList.map((st, i) => (
                      <tr key={i}>
                        <td className="font-semibold text-sm text-primary">
                          {new Date(st.tee_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <span className={`badge ${st.tee_number === 10 ? 'badge-warning' : 'badge-neutral'}`}>
                            #{st.tee_number}
                          </span>
                        </td>
                        <td className="text-sm font-semibold">{st.group_number}</td>
                        <td className="font-semibold text-sm">{st.full_name}</td>
                        <td className="text-sm">{st.handicap_index ?? 'N/A'}</td>
                        <td className="text-sm">{st.playing_handicap ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
              <CheckCircle size={18} className="shrink-0" />
              Starting sheet saved and published successfully! Players will see their tee times in the app.
            </div>
          )}

          {startList.length === 0 && generatedGroups.length === 0 && !saveSuccess && (
            <div className="card p-6 text-center py-12">
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-muted">
                <Calendar size={22} className="text-primary" />
              </div>
              <p className="font-medium text-foreground">No starting sheet yet</p>
              <p className="text-sm text-muted-foreground mt-1">Use the generator above to create and publish one.</p>
            </div>
          )}
        </div>
      )}

      {/* ── LEADERBOARD TAB ── */}
      {activeTab === 'leaderboard' && (
        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <Trophy size={20} className="text-primary" />
              Live Leaderboard
            </h2>
            <button
              onClick={downloadLeaderboardPDF}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <Download size={14} />
              Export PDF
            </button>
          </div>

          <div className="table-responsive-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Player Name</th>
                  <th>H.I.</th>
                  <th>Status</th>
                  <th>Gross</th>
                  <th>Net</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-text-muted text-sm">
                      No scores recorded yet.
                    </td>
                  </tr>
                ) : leaderboard.map((lb, i) => (
                  <tr key={i}>
                    <td className="font-bold text-lg">{lb.position ?? '-'}</td>
                    <td className="font-semibold text-sm">{lb.full_name}</td>
                    <td className="text-sm">{lb.handicap_index ?? 'N/A'}</td>
                    <td>
                      <span className={`badge ${lb.result_status === 'active' ? 'badge-active' : 'badge-neutral'}`}>
                        {lb.result_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="font-semibold">{lb.gross_score ?? '-'}</td>
                    <td className="font-semibold">{lb.net_score ?? '-'}</td>
                    <td className="font-semibold text-primary">{lb.stableford_points ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scorecard Modal */}
      {isScorecardModalOpen && selectedEntry && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm animate-fade-in">
          <div className="bg-background border border-border rounded-2xl w-full max-w-4xl p-6 shadow-2xl my-8 animate-slide-up">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Scorecard Entry — {selectedEntry.user?.name || 'Unknown User'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Playing Handicap: {selectedEntry.playing_handicap ?? 'N/A'} · Format: {competition?.competition_type.replace('_', ' ').toUpperCase()}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsScorecardModalOpen(false)
                  setSelectedEntry(null)
                  setScorecardInputs({})
                }}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Grid of Holes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6">
              {Array.from({ length: 18 }).map((_, idx) => {
                const holeNum = idx + 1
                const holeInfo = courseHoles.find(ch => ch.holeNumber === holeNum) || { par: 4, handicapIndex: holeNum }
                return (
                  <div key={holeNum} className="border border-border rounded-xl p-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-xs text-primary">Hole {holeNum}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">Par {holeInfo.par} · SI {holeInfo.handicapIndex}</span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      placeholder="Strokes"
                      value={scorecardInputs[holeNum] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setScorecardInputs(prev => ({
                          ...prev,
                          [holeNum]: val === '' ? '' : parseInt(val)
                        }))
                      }}
                      className="w-full text-center font-bold text-sm bg-background border border-border rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                onClick={() => {
                  setIsScorecardModalOpen(false)
                  setSelectedEntry(null)
                  setScorecardInputs({})
                }}
                className="btn-secondary"
                disabled={isSavingScorecard}
              >
                Cancel
              </button>
              <button
                onClick={savePlayerScorecard}
                className="btn-primary"
                disabled={isSavingScorecard}
              >
                {isSavingScorecard ? (
                  <><RefreshCw className="animate-spin" size={14} /> Saving…</>
                ) : 'Save & Publish Score'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
