import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { id, name, location, region, status, course_id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Club ID is required' }, { status: 400 })
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Club name is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('clubs')
      .update({
        name: name.trim(),
        location: location?.trim() || null,
        region: region?.trim() || null,
        status,
        course_id: course_id || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update club error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ club: data })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
