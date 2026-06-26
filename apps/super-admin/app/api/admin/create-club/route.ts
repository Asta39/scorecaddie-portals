import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { name, location, region, contact_name, contact_phone, course_id } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Club name is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('clubs')
      .insert({ name: name.trim(), location, region, contact_name, contact_phone })
      .select()
      .single()

    if (error) {
      console.error('Create club error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ club: data })
  } catch (err: any) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: `Internal server error: ${err?.message || err}` }, { status: 500 })
  }
}
