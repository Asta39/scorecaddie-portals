import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Club ID is required' }, { status: 400 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('clubs')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete club error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Unexpected delete club error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
