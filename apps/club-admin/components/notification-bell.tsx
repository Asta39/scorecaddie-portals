'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { BellIcon, Circle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type AdminNotification = {
  id: string
  title: string
  message: string
  is_read: boolean
  link: string | null
  created_at: string
}

export function NotificationBell() {
  const supabase = createClient()
  const router = useRouter()
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [clubId, setClubId] = useState<string | null>(null)
  
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: admin } = await supabase
        .from('club_admins')
        .select('club_id')
        .eq('user_id', user.id)
        .single()
      
      if (admin && admin.club_id) {
        setClubId(admin.club_id)
        fetchNotifications(admin.club_id)
        
        // Subscribe to real-time notifications
        supabase
          .channel('admin_notifications_changes')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'admin_notifications', filter: `club_id=eq.${admin.club_id}` },
            (payload) => {
              setNotifications((prev) => [payload.new as AdminNotification, ...prev])
            }
          )
          .subscribe()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchNotifications = async (cId: string) => {
    const { data } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('club_id', cId)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (data) setNotifications(data)
  }

  const markAsRead = async (id: string, link: string | null) => {
    await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', id)
    
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
    
    if (link) {
      router.push(link)
    }
  }

  const markAllAsRead = async () => {
    if (!clubId) return
    await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('club_id', clubId)
      .eq('is_read', false)
      
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    )
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button aria-label="Notifications" size="icon" variant="ghost" className="relative" />}>
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-2">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-auto p-1 text-xs">
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem 
                key={n.id} 
                className={cn(
                  "flex flex-col items-start p-3 cursor-pointer",
                  !n.is_read ? "bg-muted/50" : ""
                )}
                onClick={() => markAsRead(n.id, n.link)}
              >
                <div className="flex items-center gap-2 w-full mb-1">
                  {!n.is_read ? (
                    <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span className="font-semibold text-sm line-clamp-1">{n.title}</span>
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2 ml-4">
                  {n.message}
                </span>
                <span className="text-[10px] text-muted-foreground/60 ml-4 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
