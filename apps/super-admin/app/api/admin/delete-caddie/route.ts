import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { caddie_id } = await req.json()

    if (!caddie_id) {
      return NextResponse.json({ error: 'Caddie ID is required' }, { status: 400 })
    }

    // 1. Fetch caddie to check if there is a linked auth user_id
    const { data: caddie, error: fetchError } = await supabaseAdmin
      .from('caddies')
      .select('user_id')
      .eq('id', caddie_id)
      .single()

    if (fetchError) {
      console.error('Fetch caddie error:', fetchError)
      return NextResponse.json({ error: 'Caddie not found' }, { status: 404 })
    }

    // 2. Delete any platform flags referencing this caddie to avoid foreign key violations
    const { error: flagsDeleteError } = await supabaseAdmin
      .from('platform_flags')
      .delete()
      .eq('caddie_id', caddie_id)

    if (flagsDeleteError) {
      console.error('Delete platform flags error:', flagsDeleteError)
      return NextResponse.json({ error: flagsDeleteError.message }, { status: 500 })
    }

    // 3. If caddie has a linked auth user, delete all their data from related tables
    if (caddie && caddie.user_id) {
      const uid = caddie.user_id

      try {
        // A. Delete coaching session enrollments, attendance, and drill assignments
        await supabaseAdmin.from('session_enrollments').delete().eq('player_id', uid)
        await supabaseAdmin.from('session_attendance').delete().eq('player_id', uid)
        await supabaseAdmin.from('coaching_sessions').delete().eq('coach_id', uid)
        await supabaseAdmin.from('drill_assignments').delete().or(`player_id.eq.${uid},coach_id.eq.${uid}`)

        // B. Delete reviews, bookings, and interactions
        await supabaseAdmin.from('Review').delete().or(`player_id.eq.${uid},provider_id.eq.${uid}`)
        await supabaseAdmin.from('Booking').delete().or(`player_id.eq.${uid},provider_id.eq.${uid}`)
        await supabaseAdmin.from('interactions').delete().or(`player_id.eq.${uid},provider_id.eq.${uid}`)

        // C. Delete rounds and hole scores
        const { data: userRounds } = await supabaseAdmin
          .from('Round')
          .select('id')
          .eq('userId', uid)

        if (userRounds && userRounds.length > 0) {
          const roundIds = userRounds.map((r: any) => r.id)
          await supabaseAdmin.from('HoleScore').delete().in('roundId', roundIds)
        }

        await supabaseAdmin.from('Round').delete().eq('userId', uid)
        await supabaseAdmin.from('GroupRoundScore').delete().eq('userId', uid)
        await supabaseAdmin.from('GroupRoundParticipant').delete().eq('userId', uid)
        await supabaseAdmin.from('GroupRound').delete().eq('captainId', uid)

        // D. Delete social / metadata tables
        await supabaseAdmin.from('Friend').delete().or(`userId.eq.${uid},friendId.eq.${uid}`)
        await supabaseAdmin.from('Notification').delete().eq('userId', uid)
        await supabaseAdmin.from('PlayerStat').delete().eq('userId', uid)
        await supabaseAdmin.from('tee_time_reminder').delete().eq('user_id', uid)

        // E. Delete from public."User" table
        await supabaseAdmin.from('User').delete().or(`id.eq.${uid},firebaseUid.eq.${uid}`)

        // F. Delete from public.profiles table
        await supabaseAdmin.from('profiles').delete().eq('id', uid)

        // G. Delete the auth user
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(uid)
        if (authDeleteError) {
          console.error('Delete caddie auth user error:', authDeleteError)
          // If user already deleted or doesn't exist, we can continue to clear the database row
          const errStatus = (authDeleteError as any).status
          if (errStatus !== 404 && errStatus !== 422) {
            return NextResponse.json({ error: authDeleteError.message }, { status: 500 })
          }
        }
      } catch (err: any) {
        console.error('Cascading delete for user data failed:', err)
        return NextResponse.json({ error: err.message || 'Failed to delete linked user data' }, { status: 500 })
      }
    }

    // 4. Delete from public.caddies table (triggers cascade delete on caddie_attendance)
    const { error: deleteError } = await supabaseAdmin
      .from('caddies')
      .delete()
      .eq('id', caddie_id)

    if (deleteError) {
      console.error('Delete caddie row error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected delete caddie error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
