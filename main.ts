import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_CONFIG, JWT_SECRET } from './config.ts';

// Initialize Supabase client
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Windows OS Manifest Schema
interface AppManifest {
  name: string;
  version: string;
  routes: string[];
  db_tables: string[];
  ui: string[];
  permissions: string[];
  icon?: string;
  description?: string;
}

// Windows OS Core
class WindowsOS {
  private apps: Map<string, AppManifest> = new Map();
  
  constructor() {
    this.registerDefaultApps();
  }
  
  private registerDefaultApps() {
    // Register built-in Windows apps
    this.apps.set('file-explorer', {
      name: 'File Explorer',
      version: '1.0.0',
      routes: ['/api/files/list', '/api/files/create'],
      db_tables: ['windows_files'],
      ui: ['FileExplorerWindow'],
      permissions: ['files.read', 'files.write'],
      icon: '📁'
    });
    
    this.apps.set('notepad', {
      name: 'Notepad',
      version: '1.0.0',
      routes: ['/api/notepad/save', '/api/notepad/load'],
      db_tables: ['windows_files'],
      ui: ['NotepadWindow'],
      permissions: ['files.write'],
      icon: '📝'
    });
    
    this.apps.set('calculator', {
      name: 'Calculator',
      version: '1.0.0',
      routes: ['/api/calculator/compute'],
      db_tables: [],
      ui: ['CalculatorWindow'],
      permissions: [],
      icon: '🧮'
    });
  }
  
  async getApps() {
    return Array.from(this.apps.values());
  }
  
  async getApp(name: string) {
    return this.apps.get(name);
  }
}

// Initialize Windows OS
const windowsOS = new WindowsOS();

// JWT Validation Middleware
async function validateJWT(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  
  try {
    const token = authHeader.substring(7);
    // Basic JWT validation (in production, use proper JWT library)
    return token.length > 10; // Simple check for demo
  } catch {
    return false;
  }
}

// Main request handler
const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // API Routes
    if (path.startsWith('/api/')) {
      return await handleAPI(req, path, corsHeaders);
    }
    
    // Static routes
    if (path === '/') {
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
    <title>🦕 AIBOS Windows</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://esm.sh/@supabase/supabase-js@2"></script>
</head>
<body class="bg-gray-900 text-white overflow-hidden">
    <div id="windows-desktop" class="w-screen h-screen relative">
        <!-- Desktop Background -->
        <div class="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900"></div>
        
        <!-- Desktop Icons -->
        <div class="absolute top-4 left-4 space-y-4">
            <div class="desktop-icon" data-app="file-explorer">
                <div class="text-4xl">📁</div>
                <div class="text-xs text-center">File Explorer</div>
            </div>
            <div class="desktop-icon" data-app="notepad">
                <div class="text-4xl">📝</div>
                <div class="text-xs text-center">Notepad</div>
            </div>
            <div class="desktop-icon" data-app="calculator">
                <div class="text-4xl">🧮</div>
                <div class="text-xs text-center">Calculator</div>
            </div>
        </div>
        
        <!-- Taskbar -->
        <div class="absolute bottom-0 left-0 right-0 h-12 bg-black bg-opacity-50 backdrop-blur-sm border-t border-gray-600 flex items-center px-4">
            <div class="start-button bg-blue-600 px-4 py-2 rounded text-sm font-bold">Start</div>
            <div class="flex-1"></div>
            <div class="text-sm">🦕 AIBOS Windows</div>
        </div>
        
        <!-- Window Container -->
        <div id="window-container" class="absolute inset-0 pointer-events-none"></div>
    </div>
    
    <script type="text/babel">
        // Windows Desktop React Component
        const { useState, useEffect } = React;
        
        function WindowsDesktop() {
            const [windows, setWindows] = useState([]);
            const [activeWindow, setActiveWindow] = useState(null);
            
            const openApp = (appName) => {
                const newWindow = {
                    id: Date.now(),
                    app: appName,
                    title: appName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    x: 100 + Math.random() * 200,
                    y: 100 + Math.random() * 100,
                    width: 600,
                    height: 400,
                    zIndex: windows.length + 1
                };
                setWindows([...windows, newWindow]);
                setActiveWindow(newWindow.id);
            };
            
            const closeWindow = (windowId) => {
                setWindows(windows.filter(w => w.id !== windowId));
                if (activeWindow === windowId) {
                    setActiveWindow(null);
                }
            };
            
            const bringToFront = (windowId) => {
                setActiveWindow(windowId);
                setWindows(windows.map(w => ({
                    ...w,
                    zIndex: w.id === windowId ? windows.length + 1 : w.zIndex
                })));
            };
            
            useEffect(() => {
                // Add click handlers to desktop icons
                document.querySelectorAll('.desktop-icon').forEach(icon => {
                    icon.addEventListener('click', () => {
                        const appName = icon.dataset.app;
                        openApp(appName);
                    });
                });
            }, []);
            
            return (
                <div className="w-full h-full relative">
                    {windows.map(window => (
                        <div
                            key={window.id}
                            className="absolute bg-gray-800 border border-gray-600 rounded shadow-lg pointer-events-auto"
                            style={{
                                left: window.x,
                                top: window.y,
                                width: window.width,
                                height: window.height,
                                zIndex: window.zIndex
                            }}
                            onClick={() => bringToFront(window.id)}
                        >
                            {/* Window Title Bar */}
                            <div className="bg-gray-700 px-4 py-2 flex justify-between items-center cursor-move">
                                <div className="font-bold">{window.title}</div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeWindow(window.id);
                                    }}
                                    className="text-red-400 hover:text-red-200"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            {/* Window Content */}
                            <div className="p-4 h-full overflow-auto">
                                {window.app === 'file-explorer' && (
                                    <div>
                                        <h3 className="font-bold mb-2">📁 File Explorer</h3>
                                        <div className="space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <span>📄</span>
                                                <span>document.txt</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span>📁</span>
                                                <span>Documents</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span>🖼️</span>
                                                <span>image.jpg</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {window.app === 'notepad' && (
                                    <div>
                                        <h3 className="font-bold mb-2">📝 Notepad</h3>
                                        <textarea
                                            className="w-full h-64 bg-gray-700 border border-gray-600 rounded p-2 text-white"
                                            placeholder="Start typing..."
                                        ></textarea>
                                    </div>
                                )}
                                
                                {window.app === 'calculator' && (
                                    <div>
                                        <h3 className="font-bold mb-2">🧮 Calculator</h3>
                                        <div className="grid grid-cols-4 gap-2">
                                            {['7','8','9','+','4','5','6','-','1','2','3','*','0','.','=','/'].map(btn => (
                                                <button
                                                    key={btn}
                                                    className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded"
                                                >
                                                    {btn}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
        
        // Render the Windows Desktop
        ReactDOM.render(<WindowsDesktop />, document.getElementById('window-container'));
    </script>
</body>
</html>`,
        {
          headers: { 
            "content-type": "text/html",
            ...corsHeaders
          },
        }
      );
    }
    
    // Health check
    if (path === '/health') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          os: 'AIBOS Windows',
          version: '1.0.0',
          timestamp: new Date().toISOString()
        }),
        {
          headers: { 
            "content-type": "application/json",
            ...corsHeaders
          },
        }
      );
    }
    
    return new Response("Not Found", { status: 404, headers: corsHeaders });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { 
        status: 500,
        headers: { 
          "content-type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
};

// API Route Handler
async function handleAPI(req: Request, path: string, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(req.url);
  
  // Windows OS API routes
  if (path === '/api/apps') {
    const apps = await windowsOS.getApps();
    return new Response(
      JSON.stringify({ apps }),
      {
        headers: { 
          "content-type": "application/json",
          ...corsHeaders
        },
      }
    );
  }
  
  if (path === '/api/apps/:name') {
    const appName = url.pathname.split('/').pop();
    const app = await windowsOS.getApp(appName);
    if (!app) {
      return new Response(
        JSON.stringify({ error: 'App not found' }),
        { 
          status: 404,
          headers: { 
            "content-type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    return new Response(
      JSON.stringify({ app }),
      {
        headers: { 
          "content-type": "application/json",
          ...corsHeaders
        },
      }
    );
  }
  
  // File Explorer API
  if (path === '/api/files/list') {
    const { data, error } = await supabase
      .from('windows_files')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { 
            "content-type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ files: data || [] }),
      {
        headers: { 
          "content-type": "application/json",
          ...corsHeaders
        },
      }
    );
  }
  
  if (path === '/api/files/create' && req.method === 'POST') {
    const body = await req.json();
    const { data, error } = await supabase
      .from('windows_files')
      .insert([{
        name: body.name || 'Untitled',
        type: body.type || 'file',
        content: body.content || '',
        parent_folder: body.parent_folder || '/'
      }])
      .select();
    
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { 
            "content-type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ file: data[0] }),
      {
        headers: { 
          "content-type": "application/json",
          ...corsHeaders
        },
      }
    );
  }
  
  // Notepad API
  if (path === '/api/notepad/save' && req.method === 'POST') {
    const body = await req.json();
    const { data, error } = await supabase
      .from('windows_files')
      .upsert([{
        name: body.name || 'Untitled.txt',
        type: 'text',
        content: body.content || '',
        parent_folder: '/'
      }], { onConflict: 'name' })
      .select();
    
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { 
            "content-type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ saved: true, file: data[0] }),
      {
        headers: { 
          "content-type": "application/json",
          ...corsHeaders
        },
      }
    );
  }
  
  // Calculator API
  if (path === '/api/calculator/compute' && req.method === 'POST') {
    const body = await req.json();
    try {
      // Simple calculator (in production, use a proper expression parser)
      const result = eval(body.expression);
      return new Response(
        JSON.stringify({ result }),
        {
          headers: { 
            "content-type": "application/json",
            ...corsHeaders
          },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid expression' }),
        { 
          status: 400,
          headers: { 
            "content-type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
  }
  
  // Default API response
  return new Response(
    JSON.stringify({ 
      message: 'AIBOS Windows API',
      available_routes: [
        '/api/apps',
        '/api/files/list',
        '/api/files/create',
        '/api/notepad/save',
        '/api/calculator/compute'
      ]
    }),
    {
      headers: { 
        "content-type": "application/json",
        ...corsHeaders
      },
    }
  );
}

console.log("🦕 AIBOS Windows OS starting on port 8000...");
console.log("📋 Available routes:");
console.log("  - / (Windows Desktop UI)");
console.log("  - /api/apps (List available apps)");
console.log("  - /api/files/* (File operations)");
console.log("  - /api/notepad/* (Notepad operations)");
console.log("  - /api/calculator/* (Calculator operations)");
console.log("  - /health (Health check)");

await serve(handler, { port: 8000 }); 