import { serveFile } from "https://deno.land/std@0.208.0/http/file_server.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  let filePath = url.pathname;
  if (filePath === "/") filePath = "/index.html";
  try {
    return await serveFile(req, `./dist${filePath}`);
  } catch {
    return await serveFile(req, "./dist/index.html");
  }
};

serve(handler); 