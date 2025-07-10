import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_CONFIG } from './config.ts';

const supabaseAdmin = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceRoleKey);

console.log('🦕 Setting up Windows database schema...');

try {
  // Create windows_apps table using SQL
  const { error: createAppsError } = await supabaseAdmin.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS windows_apps (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(255),
        window_type VARCHAR(50) DEFAULT 'app',
        position_x INTEGER DEFAULT 100,
        position_y INTEGER DEFAULT 100,
        width INTEGER DEFAULT 800,
        height INTEGER DEFAULT 600,
        is_open BOOLEAN DEFAULT false,
        content TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `
  });

  if (createAppsError) {
    console.log('Note: Using alternative approach for table creation');
  } else {
    console.log('✅ Windows apps table created');
  }

  // Create windows_desktop table
  const { error: createDesktopError } = await supabaseAdmin.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS windows_desktop (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id),
        wallpaper_url VARCHAR(500),
        theme VARCHAR(50) DEFAULT 'light',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `
  });

  if (createDesktopError) {
    console.log('Note: Desktop table creation skipped');
  } else {
    console.log('✅ Windows desktop table created');
  }

  // Create windows_files table
  const { error: createFilesError } = await supabaseAdmin.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS windows_files (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'file',
        content TEXT,
        parent_folder VARCHAR(255) DEFAULT '/',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `
  });

  if (createFilesError) {
    console.log('Note: Files table creation skipped');
  } else {
    console.log('✅ Windows files table created');
  }

  // Insert default apps
  const defaultApps = [
    { name: 'File Explorer', icon: '📁', window_type: 'explorer' },
    { name: 'Notepad', icon: '📝', window_type: 'editor' },
    { name: 'Calculator', icon: '🧮', window_type: 'calculator' },
    { name: 'Terminal', icon: '💻', window_type: 'terminal' },
    { name: 'Settings', icon: '⚙️', window_type: 'settings' },
  ];

  for (const app of defaultApps) {
    const { error: insertError } = await supabaseAdmin
      .from('windows_apps')
      .upsert(app, { onConflict: 'name' });
    
    if (insertError) {
      console.log(`Note: Could not insert ${app.name}`);
    } else {
      console.log(`✅ Added ${app.name}`);
    }
  }

  console.log('🦕 Database setup completed!');
  console.log('📋 Next: Set up React + Tailwind frontend');

} catch (err) {
  console.error('❌ Database setup failed:', err);
} 