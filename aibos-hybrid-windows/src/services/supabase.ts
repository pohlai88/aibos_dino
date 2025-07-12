import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Types for file system operations
export interface FileSystemItem {
  id: string;
  tenant_id: string;
  path: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  content?: string;
  mime_type?: string;
  created_at: string;
  updated_at: string;
  parent_id?: string;
  is_deleted: boolean;
}

export interface FileSystemOperation {
  id: string;
  tenant_id: string;
  operation_type: 'create' | 'update' | 'delete' | 'move' | 'copy' | 'rename';
  item_id?: string;
  old_path?: string;
  new_path?: string;
  old_name?: string;
  new_name?: string;
  performed_at: string;
  performed_by?: string;
}

export interface FileSystemSettings {
  id: string;
  tenant_id: string;
  view_mode: 'grid' | 'list' | 'details';
  sort_by: 'name' | 'size' | 'created_at' | 'updated_at';
  sort_order: 'asc' | 'desc';
  show_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Supabase client configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://your-project.supabase.co';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// File System Service Class
export class FileSystemService {
  private supabase;

  constructor() {
    this.supabase = supabase;
  }

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  // Get file system tree for a path
  async getFileSystemTree(path: string = ''): Promise<ApiResponse<FileSystemItem[]>> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_file_system_tree', { p_path: path });

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'DATABASE_ERROR'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Create a new folder
  async createFolder(path: string, name: string): Promise<ApiResponse<FileSystemItem>> {
    try {
      const { data, error } = await this.supabase
        .rpc('create_folder', { p_path: path, p_name: name });

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'DATABASE_ERROR'
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Delete an item
  async deleteItem(itemId: string): Promise<ApiResponse> {
    try {
      const { data, error } = await this.supabase
        .rpc('delete_item', { p_item_id: itemId });

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'DATABASE_ERROR'
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Rename an item
  async renameItem(itemId: string, newName: string): Promise<ApiResponse<FileSystemItem>> {
    try {
      const { data, error } = await this.supabase
        .rpc('rename_item', { p_item_id: itemId, p_new_name: newName });

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'DATABASE_ERROR'
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Create a new file
  async createFile(path: string, name: string, content: string, mimeType: string = 'text/plain'): Promise<ApiResponse<FileSystemItem>> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          code: 'UNAUTHENTICATED'
        };
      }

      const { data, error } = await this.supabase
        .from('file_system_items')
        .insert({
          tenant_id: user.id,
          path,
          name,
          type: 'file',
          size: content.length,
          content,
          mime_type: mimeType
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'DATABASE_ERROR'
        };
      }

      // Log the operation
      await this.logOperation('create', data.id, undefined, path, undefined, name);

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Update file content
  async updateFileContent(itemId: string, content: string): Promise<ApiResponse<FileSystemItem>> {
    try {
      const { data, error } = await this.supabase
        .from('file_system_items')
        .update({
          content,
          size: content.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'DATABASE_ERROR'
        };
      }

      // Log the operation
      await this.logOperation('update', itemId);

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Get file content
  async getFileContent(itemId: string): Promise<ApiResponse<{ content: string; mime_type: string }>> {
    try {
      const { data, error } = await this.supabase
        .from('file_system_items')
        .select('content, mime_type')
        .eq('id', itemId)
        .eq('type', 'file')
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'DATABASE_ERROR'
        };
      }

      return {
        success: true,
        data: {
          content: data.content || '',
          mime_type: data.mime_type || 'text/plain'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Move item to different path
  async moveItem(itemId: string, newPath: string): Promise<ApiResponse<FileSystemItem>> {
    try {
      const item = await this.getItem(itemId);
      if (!item.success) return item;

      const { data, error } = await this.supabase
        .from('file_system_items')
        .update({
          path: newPath,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'DATABASE_ERROR'
        };
      }

      // Log the operation
      await this.logOperation('move', itemId, item.data?.path, newPath, item.data?.name, item.data?.name);

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Copy item
  async copyItem(itemId: string, newPath: string, newName?: string): Promise<ApiResponse<FileSystemItem>> {
    try {
      const item = await this.getItem(itemId);
      if (!item.success) return item;

      const finalName = newName || `${item.data?.name} (copy)`;
      
      const { data, error } = await this.supabase
        .from('file_system_items')
        .insert({
          tenant_id: item.data?.tenant_id,
          path: newPath,
          name: finalName,
          type: item.data?.type,
          size: item.data?.size,
          content: item.data?.content,
          mime_type: item.data?.mime_type
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'DATABASE_ERROR'
        };
      }

      // Log the operation
      await this.logOperation('copy', data.id, item.data?.path, newPath, item.data?.name, finalName);

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Get user settings
  async getSettings(): Promise<ApiResponse<FileSystemSettings>> {
    try {
      const { data, error } = await this.supabase
        .from('file_system_settings')
        .select('*')
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'DATABASE_ERROR'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Update user settings
  async updateSettings(settings: Partial<FileSystemSettings>): Promise<ApiResponse<FileSystemSettings>> {
    try {
      const { data, error } = await this.supabase
        .from('file_system_settings')
        .update(settings)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'DATABASE_ERROR'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Get operation history
  async getOperationHistory(limit: number = 50): Promise<ApiResponse<FileSystemOperation[]>> {
    try {
      const { data, error } = await this.supabase
        .from('file_system_operations')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(limit);

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'DATABASE_ERROR'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Private helper methods
  private async getItem(itemId: string): Promise<ApiResponse<FileSystemItem>> {
    try {
      const { data, error } = await this.supabase
        .from('file_system_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'DATABASE_ERROR'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  private async logOperation(
    operationType: FileSystemOperation['operation_type'],
    itemId?: string,
    oldPath?: string,
    newPath?: string,
    oldName?: string,
    newName?: string
  ): Promise<void> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return;

      await this.supabase
        .from('file_system_operations')
        .insert({
          tenant_id: user.id,
          operation_type: operationType,
          item_id: itemId,
          old_path: oldPath,
          new_path: newPath,
          old_name: oldName,
          new_name: newName,
          performed_by: user.id
        });
    } catch (error) {
      console.error('Failed to log operation:', error);
    }
  }

  // Real-time subscriptions
  subscribeToFileSystemChanges(callback: (payload: any) => void) {
    return this.supabase
      .channel('file_system_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'file_system_items'
        },
        callback
      )
      .subscribe();
  }

  subscribeToOperations(callback: (payload: any) => void) {
    return this.supabase
      .channel('operations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'file_system_operations'
        },
        callback
      )
      .subscribe();
  }
}

// Export singleton instance
export const fileSystemService = new FileSystemService(); 