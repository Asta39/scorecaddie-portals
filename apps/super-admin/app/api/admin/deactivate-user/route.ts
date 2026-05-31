import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { caddie_id, reason } = await req.json()

    if (!caddie_id || !reason?.trim()) {
      return NextResponse.json({ error: 'Caddie ID and reason are required' }, { status: 400 })
    }

    // Get caddie info for the flag
    const { data: caddie } = await supabaseAdmin
      .from('caddies')
      .select('name, club_id')
      .eq('id', caddie_id)
      .single()

    // Deactivate the caddie
    const { error: updateError } = await supabaseAdmin
      .from('caddies')
      .update({ is_active: false, is_marketplace_visible: false })
      .eq('id', caddie_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Create a critical flag for the deactivation
    await supabaseAdmin.from('platform_flags').insert({
      type: 'caddie_force_deactivated',
      severity: 'critical',
      club_id: caddie?.club_id,
      caddie_id,
      message: `Super admin force-deactivated caddie "${caddie?.name}". Reason: ${reason}`,
      metadata: { reason, caddie_name: caddie?.name },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Deactivate user error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
