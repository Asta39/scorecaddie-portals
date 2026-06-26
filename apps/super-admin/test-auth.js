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
  console.log('Testing Supabase Auth Admin API...');
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Auth Admin API error:', error.message);
  } else {
    console.log('Success! Listed users count:', data.users.length);
    console.log('Sample user:', data.users[0]?.email);
  }
}

test();
