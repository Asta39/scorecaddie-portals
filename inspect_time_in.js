const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqvzklonfybticckpuvx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxdnprbG9uZnlidGljY2twdXZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIxODMxMCwiZXhwIjoyMDkwNzk0MzEwfQ.bILed5F0IzIQ2I4Z53LjLAjv9PYkdMup-d1gtYCrApo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: attendance, error } = await supabase.from('caddie_attendance').select('time_in');
  if (error) {
    console.error(error);
    return;
  }
  const uniqueTimeIn = [...new Set(attendance.map(a => a.time_in))];
  console.log('Unique time_in values in database:', uniqueTimeIn);
}

run();
