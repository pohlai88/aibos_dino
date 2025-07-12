import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { InMemoryStorage } from "./modules/filesystem.ts";
import { SupabaseStorage } from "./modules/supabaseStorage.ts";
import { FileOperations } from "./modules/fileOperations.ts";
import { formatSize } from "./modules/utils.ts";

// Environment-based storage selection
const storageType = Deno.env.get("STORAGE_TYPE") || "memory";
const storage = storageType === "supabase" ? new SupabaseStorage() : new InMemoryStorage();
const fileOps = new FileOperations(storage);

console.log(`🚀 File API server running with ${storageType} storage...`);

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "";

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-tenant-id, Authorization",
    "Access-Control-Expose-Headers": "*",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    switch (req.method) {
      case "GET": {
        const files = await fileOps.getFiles(path);
        const formattedFiles = files.map((item: any) => ({
          ...item,
          size: formatSize(item.size),
        }));
        return new Response(JSON.stringify({ 
          success: true, 
          data: { files: formattedFiles, path } 
        }), { headers });
      }
      
      case "POST": {
        const body = await req.json();
        const { action, name, itemId, targetPath, type, content } = body;

        let result;
        switch (action) {
          case "createFolder":
            if (!name) {
              return new Response(JSON.stringify({ success: false, error: "Folder name is required" }), { status: 400, headers });
            }
            result = await fileOps.createFolder(path, name);
            break;
            
          case "rename":
            if (!itemId || !name) {
              return new Response(JSON.stringify({ success: false, error: "Item ID and new name are required" }), { status: 400, headers });
            }
            result = await fileOps.renameItem(path, itemId, name);
            break;
            
          case "copy":
            if (!itemId || !targetPath) {
              return new Response(JSON.stringify({ success: false, error: "Item ID and target path are required" }), { status: 400, headers });
            }
            result = await fileOps.copyItem(path, targetPath, itemId);
            break;
            
          case "move":
            if (!itemId || !targetPath) {
              return new Response(JSON.stringify({ success: false, error: "Item ID and target path are required" }), { status: 400, headers });
            }
            result = await fileOps.moveItem(path, targetPath, itemId);
            break;
            
          default:
            return new Response(JSON.stringify({ success: false, error: "Invalid action" }), { status: 400, headers });
        }

        return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers });
      }
      
      case "DELETE": {
        const body = await req.json();
        const { itemId } = body;
        if (!itemId) {
          return new Response(JSON.stringify({ success: false, error: "Item ID is required" }), { status: 400, headers });
        }
        const result = await fileOps.deleteItem(path, itemId);
        return new Response(JSON.stringify(result), { status: result.success ? 200 : 404, headers });
      }
      
      default:
        return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), { status: 405, headers });
    }
  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), { status: 500, headers });
  }
}); 