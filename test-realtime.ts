import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_CONFIG } from './config.ts';

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

console.log('🦕 Testing Supabase Realtime...');

try {
  // Subscribe to changes on windows_apps table
  const subscription = supabase
    .channel('windows_apps_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'windows_apps'
      },
      (payload) => {
        console.log('🔄 Real-time update received:', payload);
      }
    )
    .subscribe((status) => {
      console.log('📡 Subscription status:', status);
    });

  console.log('✅ Realtime subscription active');
  console.log('📋 Listening for changes on windows_apps table...');
  console.log('💡 Try making changes in your Supabase dashboard to see real-time updates');
  
  // Keep the script running for 30 seconds to test
  setTimeout(() => {
    console.log('⏰ Test completed - Realtime is working!');
    subscription.unsubscribe();
    console.log('🦕 Realtime test finished');
  }, 30000);

} catch (err) {
  console.error('❌ Realtime test failed:', err);
} 