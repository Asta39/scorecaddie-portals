const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqvzklonfybticckpuvx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxdnprbG9uZnlidGljY2twdXZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIxODMxMCwiZXhwIjoyMDkwNzk0MzEwfQ.bILed5F0IzIQ2I4Z53LjLAjv9PYkdMup-d1gtYCrApo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: clubs, error: clubError } = await supabase.from('clubs').select('*');
  if (clubError) console.error(clubError);
  console.log('Clubs count:', clubs?.length);
  if (clubs && clubs.length > 0) {
    console.log('First Club:', clubs[0]);
  }

  const { data: caddies, error: caddieError } = await supabase.from('caddies').select('*');
  if (caddieError) console.error(caddieError);
  console.log('Caddies count:', caddies?.length);
  if (caddies && caddies.length > 0) {
    console.log('First 5 Caddies:', caddies.slice(0, 5).map(c => ({ id: c.id, name: c.name, is_present: c.is_present, paid_until: c.paid_until, is_marketplace_visible: c.is_marketplace_visible })));
  }

  const { data: attendance, error: attendanceError } = await supabase.from('caddie_attendance').select('*').limit(10);
  if (attendanceError) console.error(attendanceError);
  console.log('Attendance count (limit 10):', attendance?.length);
  if (attendance && attendance.length > 0) {
    console.log('Attendance samples:', attendance.map(a => ({ id: a.id, caddie_id: a.caddie_id, date: a.date, time_in: a.time_in, time_out: a.time_out, is_absent: a.is_absent })));
  }
}

run();
