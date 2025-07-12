import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// File system data structure matching aibos-platform-schema.sql
export interface FileSystemItem {
  id: string;
  tenant_id: string;
  app_id?: string; // Optional app integration
  name: string;
  type: 'folder' | 'file';
  path: string;
  size?: number;
  content?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
  parent_id?: string;
}

// Helper: Get tenant ID from request headers or query params
function getTenantId(req: Request): string {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenant_id') || 
                   req.headers.get('x-tenant-id') || 
                   'default-tenant'; // Fallback for development
  return tenantId;
}

// Helper: Check if user has access to tenant
async function validateTenantAccess(tenantId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .single();
  
  return !error && !!data;
}

// Helper: Get file system tree for a tenant
async function getFileSystemTree(tenantId: string, path: string = ''): Promise<FileSystemItem[]> {
  const { data, error } = await supabase
    .from('file_system_items')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('path', path)
    .order('name');
  
  if (error) {
    console.error('Supabase error:', error);
    return [];
  }
  
  return data || [];
}

// Helper: Create folder
async function createFolder(tenantId: string, name: string, path: string, userId: string): Promise<{ success: boolean; data?: FileSystemItem; error?: string }> {
  // Check for duplicate name
  const { data: existing } = await supabase
    .from('file_system_items')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('path', path)
    .eq('name', name)
    .single();
  
  if (existing) {
    return { success: false, error: 'A file or folder with that name already exists.' };
  }
  
  const folderData = {
    tenant_id: tenantId,
    name,
    type: 'folder' as const,
    path: path ? `${path}/${name}` : name,
    created_by: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('file_system_items')
    .insert([folderData])
    .select()
    .single();
  
  if (error) {
    console.error('Supabase error:', error);
    return { success: false, error: 'Failed to create folder' };
  }
  
  return { success: true, data };
}

// Helper: Delete item
async function deleteItem(tenantId: string, itemId: string): Promise<{ success: boolean; error?: string }> {
  // First, delete all children recursively
  const { data: children } = await supabase
    .from('file_system_items')
    .select('id')
    .eq('tenant_id', tenantId)
    .like('path', `%/${itemId}/%`);
  
  if (children && children.length > 0) {
    const childIds = children.map(child => child.id);
    await supabase
      .from('file_system_items')
      .delete()
      .in('id', childIds);
  }
  
  // Then delete the item itself
  const { error } = await supabase
    .from('file_system_items')
    .delete()
    .eq('id', itemId)
    .eq('tenant_id', tenantId);
  
  if (error) {
    console.error('Supabase error:', error);
    return { success: false, error: 'Failed to delete item' };
  }
  
  return { success: true };
}

// Helper: Rename item
async function renameItem(tenantId: string, itemId: string, newName: string): Promise<{ success: boolean; data?: FileSystemItem; error?: string }> {
  // Get current item
  const { data: item, error: fetchError } = await supabase
    .from('file_system_items')
    .select('*')
    .eq('id', itemId)
    .eq('tenant_id', tenantId)
    .single();
  
  if (fetchError || !item) {
    return { success: false, error: 'Item not found' };
  }
  
  // Check for duplicate name in same path
  const { data: existing } = await supabase
    .from('file_system_items')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('path', item.path.split('/').slice(0, -1).join('/'))
    .eq('name', newName)
    .neq('id', itemId)
    .single();
  
  if (existing) {
    return { success: false, error: 'A file or folder with that name already exists.' };
  }
  
  const oldPath = item.path;
  const newPath = item.path.split('/').slice(0, -1).concat(newName).join('/');
  
  // Update the item
  const { data, error } = await supabase
    .from('file_system_items')
    .update({
      name: newName,
      path: newPath,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  
  if (error) {
    console.error('Supabase error:', error);
    return { success: false, error: 'Failed to rename item' };
  }
  
  // Update all children paths
  await supabase
    .from('file_system_items')
    .update({
      path: supabase.sql`REPLACE(path, ${oldPath}, ${newPath})`,
      updated_at: new Date().toISOString()
    })
    .eq('tenant_id', tenantId)
    .like('path', `${oldPath}/%`);
  
  return { success: true, data };
}

// Helper: Create file
async function createFile(tenantId: string, name: string, path: string, content: string, userId: string, appId?: string): Promise<{ success: boolean; data?: FileSystemItem; error?: string }> {
  // Check for duplicate name
  const { data: existing } = await supabase
    .from('file_system_items')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('path', path)
    .eq('name', name)
    .single();
  
  if (existing) {
    return { success: false, error: 'A file or folder with that name already exists.' };
  }
  
  const fileData = {
    tenant_id: tenantId,
    app_id: appId,
    name,
    type: 'file' as const,
    path: path ? `${path}/${name}` : name,
    content,
    size: content.length,
    created_by: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('file_system_items')
    .insert([fileData])
    .select()
    .single();
  
  if (error) {
    console.error('Supabase error:', error);
    return { success: false, error: 'Failed to create file' };
  }
  
  return { success: true, data };
}

// --- API Server ---
serve(async (req) => {
  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '';
  const tenantId = getTenantId(req);
  
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-tenant-id',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    switch (req.method) {
      case 'GET': {
        // Get files for a path
        const files = await getFileSystemTree(tenantId, path);
        return new Response(JSON.stringify({ 
          success: true, 
          data: { 
            files: files.map(f => ({
              ...f,
              size: f.size ? formatSize(f.size) : undefined
            })), 
            path 
          } 
        }), { headers });
      }
      
      case 'POST': {
        const body = await req.json();
        const { action, name, content, appId } = body;
        
        switch (action) {
          case 'createFolder': {
            if (!name) {
              return new Response(JSON.stringify({ success: false, error: 'Folder name is required' }), { status: 400, headers });
            }
            const result = await createFolder(tenantId, name, path, 'system-user'); // TODO: Get actual user ID
            return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers });
          }
          
          case 'createFile': {
            if (!name) {
              return new Response(JSON.stringify({ success: false, error: 'File name is required' }), { status: 400, headers });
            }
            const result = await createFile(tenantId, name, path, content || '', 'system-user', appId);
            return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers });
          }
          
          case 'rename': {
            const { itemId } = body;
            if (!itemId || !name) {
              return new Response(JSON.stringify({ success: false, error: 'Item ID and new name are required' }), { status: 400, headers });
            }
            const result = await renameItem(tenantId, itemId, name);
            return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers });
          }
          
          default:
            return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), { status: 400, headers });
        }
      }
      
      case 'DELETE': {
        const deleteBody = await req.json();
        const { itemId } = deleteBody;
        if (!itemId) {
          return new Response(JSON.stringify({ success: false, error: 'Item ID is required' }), { status: 400, headers });
        }
        const result = await deleteItem(tenantId, itemId);
        return new Response(JSON.stringify(result), { status: result.success ? 200 : 404, headers });
      }
      
      default:
        return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers });
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), { status: 500, headers });
  }
});

// Format size for display
function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

console.log('Supabase File API server running on http://localhost:8000'); 