import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_CONFIG } from './config.ts';

const supabaseAdmin = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceRoleKey);

console.log('🦕 Testing Supabase Service Role...');

try {
  // Test admin operations
  const { data: tables, error: tablesError } = await supabaseAdmin
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .limit(5);
  
  if (tablesError) {
    console.log('❌ Service role test failed:', tablesError.message);
  } else {
    console.log('✅ Service role working - can access system tables');
    console.log('Available tables:', tables?.map(t => t.table_name));
  }
  
  // Test auth admin operations
  const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (usersError) {
    console.log('❌ Auth admin test failed:', usersError.message);
  } else {
    console.log('✅ Auth admin working - can list users');
    console.log('User count:', users?.users?.length || 0);
  }
  
} catch (err) {
  console.error('❌ Service role test failed:', err);
}

console.log('🦕 Service role test completed!'); 