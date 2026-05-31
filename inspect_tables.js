const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqvzklonfybticckpuvx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxdnprbG9uZnlidGljY2twdXZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIxODMxMCwiZXhwIjoyMDkwNzk0MzEwfQ.bILed5F0IzIQ2I4Z53LjLAjv9PYkdMup-d1gtYCrApo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_tables');
  if (error) {
    // If get_tables RPC doesn't exist, let's query from information_schema
    // Wait, let's try a custom SQL query if possible or list some common tables
    console.log('Error running RPC get_tables:', error);
    
    // Let's run a select query from a few suspected tables or check schema using query
    // Let's see if we can get table list via postgres function or sql injection or standard rest api:
    // Supabase has REST endpoint for schema. We can fetch it.
    // Or we can try to select from pg_catalog or information_schema via a postgres function.
    // Since we are using service role key, let's see if there is any other way.
  } else {
    console.log('Tables:', data);
  }
  
  // Let's try to query from a common table to see if it exists
  const tables = ['User', 'Booking', 'Review', 'caddies', 'caddie_attendance', 'caddie_payments', 'platform_config', 'platform_flags', 'profiles', 'clubs', 'club_admins'];
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`Table ${table} does NOT exist or error:`, error.message);
    } else {
      console.log(`Table ${table} exists, row count:`, count);
    }
  }
}

run();
