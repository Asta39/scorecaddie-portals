'use client'

import React, { useState, useRef } from 'react'
import { Camera, X, Check, Loader2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

type HoleScore = {
  hole: number
  par: number
  score: number | null
}

type ScanResult = {
  player_slot: string
  matched_name: string
  confidence: number
  round_type: string
  holes: HoleScore[]
  front_9_total: number | null
  back_9_total: number | null
  gross_total: number | null
  warnings: string[]
}

interface ScorecardScannerModalProps {
  isOpen: boolean
  onClose: () => void
  competitionId: string
  playerId: string
  playerName: string
  clubId: string
  clubName: string
  onScanSuccess: () => void
}

export function ScorecardScannerModal({
  isOpen,
  onClose,
  competitionId,
  playerId,
  playerName,
  clubId,
  clubName,
  onScanSuccess
}: ScorecardScannerModalProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  if (!isOpen) return null

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsScanning(true)
      setError(null)

      // Convert file to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        
        try {
          const { data, error: fnError } = await supabase.functions.invoke('scan-scorecard', {
            body: {
              imageBase64: base64String,
              playerName,
              clubName
            }
          })

          if (fnError) throw fnError
          
          if (data.error) throw new Error(data.error)

          setScanResult(data.result)
        } catch (err: any) {
          setError(err.message || 'Failed to scan scorecard')
        } finally {
          setIsScanning(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      setError(err.message)
      setIsScanning(false)
    }
  }

  const handleScoreChange = (holeNum: number, newScore: string) => {
    if (!scanResult) return
    const scoreVal = newScore === '' ? null : parseInt(newScore)
    
    setScanResult({
      ...scanResult,
      holes: scanResult.holes.map(h => 
        h.hole === holeNum ? { ...h, score: isNaN(scoreVal!) ? null : scoreVal } : h
      )
    })
  }

  const handleSave = async () => {
    if (!scanResult) return
    setIsSaving(true)
    setError(null)

    try {
      // 1. Create a Round for this player
      const { data: roundData, error: roundError } = await supabase
        .from('Round')
        .insert({
          playerId,
          courseId: clubId,
          teeTime: new Date().toISOString(),
          isGroup: false,
          source: 'scanned',
          scannerConfidence: scanResult.confidence,
          scannerPlayerSlot: scanResult.player_slot,
          totalScore: scanResult.gross_total ?? 0
        })
        .select()
        .single()

      if (roundError) throw roundError

      // 2. Insert HoleScores
      const holeScoresToInsert = scanResult.holes
        .filter(h => h.score !== null)
        .map(h => ({
          roundId: roundData.id,
          holeNumber: h.hole,
          score: h.score,
          par: h.par,
          isLive: true
        }))

      if (holeScoresToInsert.length > 0) {
        const { error: hsError } = await supabase
          .from('HoleScore')
          .insert(holeScoresToInsert)

        if (hsError) throw hsError
      }

      onScanSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save scores')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg">Scan Scorecard for {playerName}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!scanResult && !isScanning && (
            <div className="text-center py-10">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-full shadow-md"
              >
                <Camera size={20} />
                Open Camera / Upload
              </button>
              <p className="text-sm text-gray-500 mt-4">
                Take a clear photo of the physical scorecard. Ensure the player's name and scores are legible.
              </p>
            </div>
          )}

          {isScanning && (
            <div className="text-center py-12 space-y-4">
              <Loader2 size={32} className="animate-spin text-primary mx-auto" />
              <p className="text-gray-600 font-medium">Analyzing Scorecard using Gemini AI...</p>
            </div>
          )}

          {scanResult && !isScanning && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-md text-sm text-blue-800 space-y-1">
                <p><strong>OCR Confidence:</strong> {(scanResult.confidence * 100).toFixed(0)}%</p>
                <p><strong>Matched Name on Card:</strong> {scanResult.matched_name}</p>
                <p><strong>Round Type:</strong> {scanResult.round_type.replace('_', ' ')}</p>
                {scanResult.warnings?.length > 0 && (
                  <div className="mt-2 text-amber-700">
                    <span className="font-bold flex items-center gap-1"><AlertTriangle size={14}/> Warnings:</span>
                    <ul className="list-disc pl-5 mt-1">
                      {scanResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold mb-3">Review & Correct Scores</h4>
                <div className="grid grid-cols-9 gap-2">
                  {scanResult.holes.map((h) => (
                    <div key={h.hole} className="text-center">
                      <div className="text-xs font-semibold bg-gray-100 py-1 rounded-t border border-b-0 border-gray-200">
                        {h.hole}
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={h.score ?? ''}
                        onChange={(e) => handleScoreChange(h.hole, e.target.value)}
                        className="w-full text-center py-1 border border-gray-200 rounded-b text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="-"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {scanResult && !isScanning && (
          <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
            <button
              onClick={() => {
                setScanResult(null)
                fileInputRef.current?.click()
              }}
              className="btn-secondary text-sm"
              disabled={isSaving}
            >
              Rescan
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary flex items-center gap-2"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {isSaving ? 'Saving...' : 'Confirm & Save Scores'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
