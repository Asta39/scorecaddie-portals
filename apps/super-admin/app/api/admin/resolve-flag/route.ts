import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { flag_id, note } = await req.json()

    const { error } = await supabaseAdmin
      .from('platform_flags')
      .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_note: note ?? null })
      .eq('id', flag_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
