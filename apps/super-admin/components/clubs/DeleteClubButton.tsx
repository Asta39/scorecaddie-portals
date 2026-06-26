'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DeleteClubButtonProps {
  clubId: string
  clubName: string
}

export function DeleteClubButton({ clubId, clubName }: DeleteClubButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${clubName}? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/delete-club?id=${clubId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete club')
      }

      router.refresh()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
      title={`Delete ${clubName}`}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
