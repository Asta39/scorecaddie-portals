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
// The club's mascot shows as the notification's picture; PNGs are served by
// the club-admin portal (Android can't show WebP large icons everywhere).
const MASCOT_BASE = Deno.env.get('MASCOT_BASE_URL') || 'https://scorecaddie-portals-club-admin.vercel.app/mascots/notify'
// Every club is in Kenya; booking_date + tee_time are local East Africa Time.
const CLUB_UTC_OFFSET = '+03:00'
const MASCOT_KEY = /^[a-z][a-z0-9_]{1,31}$/

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
    const eatDate = (d: Date) => new Date(d.getTime() + 3 * 60 * 60 * 1000).toISOString().split('T')[0]
    const todayStr = eatDate(now)
    const tomorrowStr = eatDate(new Date(now.getTime() + 24 * 60 * 60 * 1000))

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
      const teeAt = new Date(`${booking.booking_date}T${booking.tee_time.substring(0, 5)}:00${CLUB_UTC_OFFSET}`)
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

    // Club name and mascot for each course in this batch.
    const courseIds = [...new Set(due.map(d => d.courseId))]
    const { data: clubs } = await supabaseAdmin
      .from('clubs')
      .select('course_id, name, mascot')
      .in('course_id', courseIds)
    const clubFor = new Map((clubs ?? []).map((c: any) => [c.course_id, c]))

    let sent = 0
    for (const item of due) {
      const club: any = clubFor.get(item.courseId)
      const where = club?.name ? ` at ${club.name}` : ''
      const payload: Record<string, unknown> = {
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [item.userId],
        channel_for_external_user_ids: 'push',
        headings: { en: `Tee off at ${item.teeTime}` },
        contents: { en: `30 minutes to go${where}. See you on the first tee!` },
        // Opens the app on My tee times (handled by the app's click listener).
        data: { type: 'tee_time_reminder', route: '/tee-times' },
        small_icon: 'ic_stat_onesignal_default',
        android_accent_color: 'FFA3E635',
        android_group: 'tee_time_reminders',
      }
      if (club?.mascot && MASCOT_KEY.test(club.mascot)) {
        payload.large_icon = `${MASCOT_BASE}/${club.mascot}.png`
        payload.ios_attachments = { mascot: `${MASCOT_BASE}/${club.mascot}.png` }
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
