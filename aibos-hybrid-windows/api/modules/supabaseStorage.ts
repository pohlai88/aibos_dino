import { FileStorage, FileItem } from "./types.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Configuration for Supabase storage
 */
interface SupabaseConfig {
  url: string;
  key: string;
  tenantId?: string; // For multi-tenancy support
}

/**
 * Options for file retrieval
 */
interface GetFilesOptions {
  limit?: number;
  offset?: number;
}

/**
 * Supabase implementation of the FileStorage interface.
 * Provides persistent storage with multi-tenant support.
 */
export class SupabaseStorage implements FileStorage {
  private supabase: SupabaseClient;
  private tenantId?: string;

  constructor(config?: Partial<SupabaseConfig>) {
    const url = config?.url || Deno.env.get("SUPABASE_URL");
    const key = config?.key || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    this.tenantId = config?.tenantId || Deno.env.get("TENANT_ID");

    if (!url || !key) {
      throw new Error("Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    }

    this.supabase = createClient(url, key);
  }

  async getFiles(path: string, options: GetFilesOptions = {}): Promise<FileItem[]> {
    try {
      let query = this.supabase
        .from("file_system_items")
        .select("*")
        .eq("path", path);

      // Add tenant filter if configured
      if (this.tenantId) {
        query = query.eq("tenant_id", this.tenantId);
      }

      // Add pagination if specified
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 1000)) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase error (getFiles):", error);
        throw new Error(`Failed to retrieve files: ${error.message}`);
      }

      return (data as FileItem[]) || [];
    } catch (error) {
      console.error("Unexpected error in getFiles:", error);
      return [];
    }
  }

  async saveFiles(path: string, files: FileItem[]): Promise<void> {
    try {
      if (!Array.isArray(files)) {
        throw new Error(`saveFiles expects an array, got: ${typeof files}`);
      }

      const itemsToUpsert = files.map(file => ({
        ...file,
        tenant_id: this.tenantId || 'default',
        updated_at: new Date().toISOString(),
      }));

      if (itemsToUpsert.length > 0) {
        // Use upsert for better performance and atomicity
        const { error } = await this.supabase
          .from("file_system_items")
          .upsert(itemsToUpsert, {
            onConflict: "id", // Assumes unique constraint on id
            ignoreDuplicates: false,
          });

        if (error) {
          console.error("Supabase error (upsert in saveFiles):", error);
          throw new Error(`Failed to upsert files: ${error.message}`);
        }
      } else {
        // If no files to save, delete existing files for this path
        let deleteQuery = this.supabase
          .from("file_system_items")
          .delete()
          .eq("path", path);

        if (this.tenantId) {
          deleteQuery = deleteQuery.eq("tenant_id", this.tenantId);
        }

        const { error: deleteError } = await deleteQuery;

        if (deleteError) {
          console.error("Supabase error (delete in saveFiles):", deleteError);
          throw new Error(`Failed to delete existing files: ${deleteError.message}`);
        }
      }
    } catch (error) {
      console.error("Unexpected error in saveFiles:", error);
      throw error;
    }
  }

  async deleteFile(path: string, itemId: string): Promise<boolean> {
    try {
      let query = this.supabase
        .from("file_system_items")
        .delete()
        .eq("id", itemId)
        .eq("path", path);

      if (this.tenantId) {
        query = query.eq("tenant_id", this.tenantId);
      }

      const { error } = await query;

      if (error) {
        console.error("Supabase error (deleteFile):", error);
        throw new Error(`Failed to delete file: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error("Unexpected error in deleteFile:", error);
      return false;
    }
  }

  /**
   * Bulk update paths for recursive operations (e.g., folder rename/move)
   * This is much more efficient than individual updates
   */
  async bulkUpdatePaths(oldPath: string, newPath: string): Promise<number> {
    try {
      // Use raw SQL for bulk path updates - much more efficient
      const { data, error } = await this.supabase.rpc('bulk_update_paths', {
        p_old_path: oldPath,
        p_new_path: newPath,
        p_tenant_id: this.tenantId || 'default'
      });

      if (error) {
        console.error("Supabase error (bulkUpdatePaths):", error);
        throw new Error(`Failed to bulk update paths: ${error.message}`);
      }

      return data || 0;
    } catch (error) {
      console.error("Unexpected error in bulkUpdatePaths:", error);
      throw error;
    }
  }

  /**
   * Recursive delete with transaction support
   * Prevents partial deletes if recursion fails
   */
  async recursiveDelete(path: string): Promise<number> {
    try {
      // Use raw SQL for recursive delete with transaction
      const { data, error } = await this.supabase.rpc('recursive_delete', {
        p_path: path,
        p_tenant_id: this.tenantId || 'default'
      });

      if (error) {
        console.error("Supabase error (recursiveDelete):", error);
        throw new Error(`Failed to recursively delete: ${error.message}`);
      }

      return data || 0;
    } catch (error) {
      console.error("Unexpected error in recursiveDelete:", error);
      throw error;
    }
  }

  /**
   * Get all files with pagination support
   */
  async getAllFiles(options: GetFilesOptions = {}): Promise<FileItem[]> {
    try {
      let query = this.supabase
        .from("file_system_items")
        .select("*");

      if (this.tenantId) {
        query = query.eq("tenant_id", this.tenantId);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 1000)) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase error (getAllFiles):", error);
        throw new Error(`Failed to retrieve all files: ${error.message}`);
      }

      return (data as FileItem[]) || [];
    } catch (error) {
      console.error("Unexpected error in getAllFiles:", error);
      return [];
    }
  }

  // Utility methods for monitoring and debugging
  /**
   * Get storage statistics with optimized single query
   */
  async getStats(): Promise<{
    totalItems: number;
    totalPaths: number;
    tenantId?: string;
  }> {
    try {
      // Use a single aggregation query for better performance
      let query = this.supabase
        .from("file_system_items")
        .select("path", { count: "exact", head: true });

      if (this.tenantId) {
        query = query.eq("tenant_id", this.tenantId);
      }

      const { count, data, error } = await query;

      if (error) {
        console.error("Supabase error (getStats):", error);
        return { totalItems: 0, totalPaths: 0, tenantId: this.tenantId };
      }

      // Calculate unique paths from the data
      const uniquePaths = new Set(data?.map(p => p.path) || []).size;
      const safeCount = count ?? 0;

      return {
        totalItems: safeCount,
        totalPaths: uniquePaths,
        tenantId: this.tenantId,
      };
    } catch (error) {
      console.error("Unexpected error in getStats:", error);
      return { totalItems: 0, totalPaths: 0, tenantId: this.tenantId };
    }
  }

  /**
   * Test database connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from("file_system_items")
        .select("id")
        .limit(1);

      return !error;
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }
}

// Legacy functions for backward compatibility with proper environment variables
export async function uploadFile(bucket: string, path: string, file: File | Blob) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  
  if (!url || !key) {
    console.error("Missing Supabase environment variables for file upload");
    return { success: false, error: "Missing configuration" };
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.storage.from(bucket).upload(path, file);
  
  if (error) {
    console.error("Supabase upload error:", error);
    return { success: false, error: error.message };
  }
  
  return { success: true, data };
}

export async function downloadFile(bucket: string, path: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  
  if (!url || !key) {
    console.error("Missing Supabase environment variables for file download");
    return { success: false, error: "Missing configuration" };
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.storage.from(bucket).download(path);
  
  if (error) {
    console.error("Supabase download error:", error);
    return { success: false, error: error.message };
  }
  
  return { success: true, data };
}

export async function deleteFile(bucket: string, path: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  
  if (!url || !key) {
    console.error("Missing Supabase environment variables for file deletion");
    return { success: false, error: "Missing configuration" };
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.storage.from(bucket).remove([path]);
  
  if (error) {
    console.error("Supabase delete error:", error);
    return { success: false, error: error.message };
  }
  
  return { success: true, data };
}
