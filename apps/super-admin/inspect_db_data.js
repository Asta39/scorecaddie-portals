const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqvzklonfybticckpuvx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxdnprbG9uZnlidGljY2twdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMTgzMTAsImV4cCI6MjA5MDc5NDMxMH0.SwTK7ZSdT1r4RjOBQIlKB6CVN6KUq9mBOpL4zRbMyog';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  try {
    // 1. Query User table
    const { data: users, error: userError } = await supabase
      .from('User')
      .select('id, name, role, email');
      
    if (userError) {
      console.error('User table error:', userError);
    } else {
      console.log('--- USER TABLE ROWS ---');
      console.log(users);
    }
    
    // 2. Query caddies table
    const { data: caddies, error: caddieError } = await supabase
      .from('caddies')
      .select('*');
      
    if (caddieError) {
      console.error('caddies table error:', caddieError);
    } else {
      console.log('--- CADDIES TABLE ROWS ---');
      console.log(caddies);
    }
  } catch (e) {
    console.error('Inspect error:', e);
  }
}

inspect();
