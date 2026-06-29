const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually to avoid external dependency issues
let supabaseUrl = '';
let supabaseServiceKey = '';
let superAdminEmail = 'scorecaddiee@gmail.com';

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
    if (key === 'SUPER_ADMIN_EMAIL') superAdminEmail = value;
  });
} catch (e) {
  console.error('Error: Could not read .env.local file. Make sure it exists in the apps/super-admin directory.');
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey === 'your_service_role_key_here') {
  console.error('Error: Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/super-admin/.env.local first.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const password = process.argv[2];
if (!password) {
  console.error('Usage: node create-super-admin.js <password>');
  process.exit(1);
}

async function createSuperAdmin() {
  console.log(`Creating Super Admin account for ${superAdminEmail}...`);

  // 1. Create user in Supabase Auth using admin API
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: superAdminEmail,
    password: password,
    email_confirm: true
  });

  if (userError) {
    if (userError.message.includes('already exists') || userError.message.includes('already been registered')) {
      console.log('User already exists in Supabase Auth. Proceeding to update database profile...');
      // We need to fetch the existing user id to update the profile
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('Failed to list users:', listError);
        return;
      }
      const existingUser = users.users.find(u => u.email === superAdminEmail);
      if (!existingUser) {
        console.error('User exists but could not be retrieved from user list.');
        return;
      }
      await updateProfile(existingUser.id);
    } else {
      console.error('Failed to create auth user:', userError.message);
    }
  } else if (userData && userData.user) {
    console.log(`Auth user created successfully with ID: ${userData.user.id}`);
    await updateProfile(userData.user.id);
  }
}

async function updateProfile(userId) {
  // 2. Set profile role to 'super_admin' in public.profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      role: 'super_admin'
    }, { onConflict: 'id' });

  if (profileError) {
    console.error('Failed to update public.profiles role:', profileError.message);
  } else {
    console.log(`\n🎉 Success! User ${superAdminEmail} is now a super_admin.`);
    console.log('You can now log in to the Super Admin portal at http://localhost:3000/login');
  }
}

createSuperAdmin();
