import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Invoked every 5 minutes by pg_cron (see migration
// 20260722020000_tee_time_reminders_cron.sql). Finds casual tee time
// bookings whose tee time is ~30 minutes away, where the player opted into
// "Tee Time Reminder" and hasn't been notified yet, and pushes via OneSignal.
// Window is 25-35 min out to comfortably straddle the 5-minute tick without
// double-sending (guarded by notification_sent_at).

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID') || ''
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY') || ''

serve(async (_req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date()
    const windowStart = new Date(now.getTime() + 25 * 60 * 1000)
    const windowEnd = new Date(now.getTime() + 35 * 60 * 1000)

    // Only bother with today's or tomorrow's bookings (tee_time is a bare
    // time-of-day column, so date filtering happens in JS after the fetch).
    const todayStr = now.toISOString().split('T')[0]
    const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('casual_tee_time_bookings')
      .select(`
        id, course_id, booking_date, tee_time,
        casual_tee_time_players ( id, user_id, notify, notification_sent_at )
      `)
      .in('booking_date', [todayStr, tomorrowStr])
      .eq('status', 'CONFIRMED')

    if (bookingsError) throw bookingsError

    const due: { playerRowId: string; userId: string; teeTime: string; courseId: string }[] = []

    for (const booking of bookings ?? []) {
      const teeAt = new Date(`${booking.booking_date}T${booking.tee_time}`)
      if (teeAt < windowStart || teeAt > windowEnd) continue

      for (const player of (booking as any).casual_tee_time_players ?? []) {
        if (!player.notify || player.notification_sent_at || !player.user_id) continue
        due.push({
          playerRowId: player.id,
          userId: player.user_id,
          teeTime: booking.tee_time.substring(0, 5),
          courseId: booking.course_id,
        })
      }
    }

    if (due.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let sent = 0
    for (const item of due) {
      const payload = {
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [item.userId],
        channel_for_external_user_ids: 'push',
        headings: { en: 'Tee Time Reminder' },
        contents: { en: `Your tee time is at ${item.teeTime} — see you on the first tee!` },
        url: `scorecaddie://book-tee-time`,
      }

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        sent++
        await supabaseAdmin
          .from('casual_tee_time_players')
          .update({ notification_sent_at: new Date().toISOString() })
          .eq('id', item.playerRowId)
      }
    }

    return new Response(JSON.stringify({ success: true, sent, considered: due.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
