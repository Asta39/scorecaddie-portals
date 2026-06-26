const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

let supabaseUrl = '';
let supabaseServiceKey = '';

try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = value;
  });
} catch (e) {
  console.error('Error reading .env.local:', e.message);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  console.log('Testing connection to Supabase...');
  
  // 1. Try selecting from public.profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
    
  if (profilesError) {
    console.error('Error querying profiles:', profilesError.message);
  } else {
    console.log('Profiles table exists! Sample data:', profiles);
  }

  // 2. Try selecting from public.clubs
  const { data: clubs, error: clubsError } = await supabase
    .from('clubs')
    .select('*')
    .limit(1);

  if (clubsError) {
    console.error('Error querying clubs:', clubsError.message);
  } else {
    console.log('Clubs table exists! Sample data:', clubs);
  }
}

test();
