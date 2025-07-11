import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { extname } from "https://deno.land/std@0.208.0/path/extname.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname === "/" ? "/index.html" : url.pathname;

  // Healthcheck endpoint for debugging
  if (url.pathname === "/healthcheck") {
    const files = [];
    for await (const f of Deno.readDir("./dist")) {
      files.push(f.name);
    }
    const faviconExists = await Deno.stat("./dist/favicon.ico").then(() => true).catch(() => false);
    return new Response(JSON.stringify({
      faviconExists,
      files
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // Try to serve static files first
  try {
    const file = await Deno.readFile(`./dist${path}`);
    return new Response(file, {
      headers: {
        "content-type": getContentType(extname(path)),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
});

function getContentType(ext: string): string {
  switch (ext) {
    case ".ico": return "image/x-icon";
    case ".html": return "text/html";
    case ".js": return "application/javascript";
    case ".css": return "text/css";
    case ".png": return "image/png";
    case ".json": return "application/json";
    default: return "application/octet-stream";
  }
} 