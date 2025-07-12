import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define specific metadata types for file system items
export interface FileMetadata {
  mimeType?: string;
  encoding?: string;
  lastModified?: string;
  permissions?: string;
  tags?: string[];
  description?: string;
  version?: string;
  checksum?: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface FileSystemItem {
  id: string;
  tenant_id: string;
  app_id?: string;
  name: string;
  type: 'folder' | 'file';
  path: string;
  size?: number;
  content?: string;
  metadata?: FileMetadata;
  created_at: string;
  updated_at: string;
  created_by: string;
  parent_id?: string;
}

// Helpers
function getTenantId(req: Request): string {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenant_id')
    || req.headers.get('x-tenant-id')
    || 'default-tenant';
  return tenantId;
}

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return null;
    }
    return data.user.id;
  }
  return "system-user";
}

async function getFileSystemTree(tenantId: string, parentId: string | null = null): Promise<FileSystemItem[]> {
  const { data, error } = await supabase
    .from('file_system_items')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('parent_id', parentId)
    .order('name');

  if (error) {
    console.error('Supabase error:', error);
    return [];
  }
  return data || [];
}

async function createFolder(tenantId: string, name: string, parentPath: string | null, userId: string): Promise<{ success: boolean; data?: FileSystemItem; error?: string }> {
  const parentId = await resolveParentId(tenantId, parentPath);
  const fullPath = parentPath ? `${parentPath}/${name}` : name;

  const { data: existing } = await supabase
    .from('file_system_items')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('path', fullPath)
    .single();

  if (existing) {
    return { success: false, error: 'A file or folder with that name already exists.' };
  }

  const folderData = {
    tenant_id: tenantId,
    name,
    type: 'folder' as const,
    path: fullPath,
    parent_id: parentId,
    created_by: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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

async function createFile(tenantId: string, name: string, parentPath: string | null, content: string, userId: string, appId?: string): Promise<{ success: boolean; data?: FileSystemItem; error?: string }> {
  const parentId = await resolveParentId(tenantId, parentPath);
  const fullPath = parentPath ? `${parentPath}/${name}` : name;

  const { data: existing } = await supabase
    .from('file_system_items')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('path', fullPath)
    .single();

  if (existing) {
    return { success: false, error: 'A file or folder with that name already exists.' };
  }

  const fileData = {
    tenant_id: tenantId,
    app_id: appId,
    name,
    type: 'file' as const,
    path: fullPath,
    content,
    size: content.length,
    parent_id: parentId,
    created_by: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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

async function renameItem(tenantId: string, itemId: string, newName: string): Promise<{ success: boolean; data?: FileSystemItem; error?: string }> {
  const { data: item, error } = await supabase
    .from('file_system_items')
    .select('*')
    .eq('id', itemId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !item) {
    return { success: false, error: 'Item not found' };
  }

  const parentPath = item.path.split('/').slice(0, -1).join('/');
  const newPath = parentPath ? `${parentPath}/${newName}` : newName;

  const { data: existing } = await supabase
    .from('file_system_items')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('path', newPath)
    .neq('id', itemId)
    .single();

  if (existing) {
    return { success: false, error: 'A file or folder with that name already exists.' };
  }

  const { data: updatedItem, error: updateError } = await supabase
    .from('file_system_items')
    .update({
      name: newName,
      path: newPath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (updateError) {
    console.error(updateError);
    return { success: false, error: 'Failed to rename item' };
  }

  await updateChildPaths(tenantId, item.path, newPath);

  return { success: true, data: updatedItem };
}

async function updateChildPaths(tenantId: string, oldPath: string, newPath: string) {
  const { data: children, error } = await supabase
    .from('file_system_items')
    .select('*')
    .eq('tenant_id', tenantId)
    .like('path', `${oldPath}/%`);

  if (error) {
    console.error(error);
    return;
  }

  for (const child of children || []) {
    const updatedPath = child.path.replace(oldPath, newPath);
    await supabase
      .from('file_system_items')
      .update({
        path: updatedPath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', child.id);
  }
}

async function deleteItem(tenantId: string, itemId: string): Promise<{ success: boolean; error?: string }> {
  const { data: children, error } = await supabase
    .from('file_system_items')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('parent_id', itemId);

  if (error) {
    console.error(error);
    return { success: false, error: 'Failed to fetch children' };
  }

  for (const child of children || []) {
    const result = await deleteItem(tenantId, child.id);
    if (!result.success) {
      return result;
    }
  }

  const { error: deleteError } = await supabase
    .from('file_system_items')
    .delete()
    .eq('id', itemId)
    .eq('tenant_id', tenantId);

  if (deleteError) {
    console.error(deleteError);
    return { success: false, error: 'Failed to delete item' };
  }

  return { success: true };
}

async function resolveParentId(tenantId: string, parentPath: string | null): Promise<string | undefined> {
  if (!parentPath) return undefined;

  const { data, error } = await supabase
    .from('file_system_items')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('path', parentPath)
    .eq('type', 'folder')
    .single();

  if (error) return undefined;
  return data?.id;
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

serve(async (req) => {
  const url = new URL(req.url);
  const tenantId = getTenantId(req);
  const pathParam = url.searchParams.get('path') || null;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-tenant-id, Authorization',
    'Access-Control-Expose-Headers': '*',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const userId = await getUserId(req);

  try {
    if (req.method === 'GET') {
      const items = await getFileSystemTree(tenantId, pathParam);
      return new Response(JSON.stringify({
        success: true,
        data: items.map(item => ({
          ...item,
          size: item.size ? formatSize(item.size) : undefined,
        })),
      }), { headers });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { name, content, appId, type } = body;

      if (!name) {
        return new Response(JSON.stringify({ success: false, error: 'Name is required' }), { status: 400, headers });
      }

      if (type === 'folder') {
        const result = await createFolder(tenantId, name, pathParam, userId || 'system-user');
        return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers });
      } else if (type === 'file') {
        const result = await createFile(tenantId, name, pathParam, content || '', userId || 'system-user', appId);
        return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers });
      } else {
        return new Response(JSON.stringify({ success: false, error: 'Invalid type' }), { status: 400, headers });
      }
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      const { itemId, newName } = body;

      if (!itemId || !newName) {
        return new Response(JSON.stringify({ success: false, error: 'Item ID and new name required' }), { status: 400, headers });
      }

      const result = await renameItem(tenantId, itemId, newName);
      return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers });
    }

    if (req.method === 'DELETE') {
      const body = await req.json();
      const { itemId } = body;

      if (!itemId) {
        return new Response(JSON.stringify({ success: false, error: 'Item ID is required' }), { status: 400, headers });
      }

      const result = await deleteItem(tenantId, itemId);
      return new Response(JSON.stringify(result), { status: result.success ? 200 : 404, headers });
    }

    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers });
  } catch (e) {
    console.error('API Error:', e);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), { status: 500, headers });
  }
});

console.log('Supabase File API server running...');
