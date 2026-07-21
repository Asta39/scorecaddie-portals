import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Vercel cron endpoints can be triggered via GET request
export async function GET(request: Request) {
  try {
    // Secure the route so only Vercel's cron invoker (holding CRON_SECRET) can call it.
    // Fail closed: if the secret isn't configured, refuse rather than allow public access.
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

    // Auto check out today's caddies who have time_in but no time_out.
    // Scoped to today's date only — must not touch past open shifts (real
    // attendance history), which would corrupt them with a fabricated checkout time.
    const todayStr = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseAdmin
      .from('caddie_attendance')
      .update({ time_out: '23:00' })
      .eq('date', todayStr)
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
