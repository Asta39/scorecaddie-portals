import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Vercel cron endpoints can be triggered via GET request
export async function GET(request: Request) {
  try {
    // Optional: secure the route so only Vercel can call it
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    // Instantiate admin client inside the route handler to avoid build-time errors
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Auto check out all caddies who have time_in but no time_out.
    // We update time_out to "23:00" for all such records.
    const { data, error } = await supabaseAdmin
      .from('caddie_attendance')
      .update({ time_out: '23:00' })
      .not('time_in', 'is', null)
      .is('time_out', null)
      .select('id');

    if (error) {
      console.error('Error updating auto checkout:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Auto-checked out ${data?.length || 0} caddies.` 
    });

  } catch (err: any) {
    console.error('Cron job failed:', err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
