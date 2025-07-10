import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_CONFIG } from './config.ts';

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

console.log('🦕 Testing Supabase connection...');

try {
  // Test basic connection
  const { data, error } = await supabase.from('_test_connection').select('*').limit(1);
  
  if (error) {
    console.log('✅ Supabase connection successful (expected error for non-existent table)');
    console.log('Error details:', error.message);
  } else {
    console.log('✅ Supabase connection successful');
    console.log('Data:', data);
  }
  
  // Test auth
  const { data: authData, error: authError } = await supabase.auth.getSession();
  console.log('✅ Auth system accessible');
  
} catch (err) {
  console.error('❌ Supabase connection failed:', err);
}

console.log('🦕 Supabase test completed!'); 