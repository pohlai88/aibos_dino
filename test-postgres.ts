import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { SUPABASE_CONFIG } from './config.ts';

console.log('🦕 Testing PostgreSQL connection...');

try {
  const client = new Client(SUPABASE_CONFIG.postgresUrl);
  await client.connect();
  
  console.log('✅ PostgreSQL connection successful!');
  
  // Test basic query
  const result = await client.queryObject("SELECT version()");
  console.log('✅ Database version:', result.rows[0]?.version);
  
  // Test table creation (for Windows schema)
  const createTableQuery = `
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
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;
  
  await client.queryObject(createTableQuery);
  console.log('✅ Windows apps table created/verified');
  
  // Test insert
  const insertResult = await client.queryObject(`
    INSERT INTO windows_apps (name, icon, window_type) 
    VALUES ($1, $2, $3) 
    ON CONFLICT DO NOTHING
    RETURNING id, name
  `, ['Test App', '🦕', 'app']);
  
  console.log('✅ Test data inserted:', insertResult.rows[0]);
  
  await client.end();
  console.log('🦕 PostgreSQL test completed successfully!');
  
} catch (err) {
  console.error('❌ PostgreSQL connection failed:', err);
} 