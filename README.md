# AIBOS Hybrid Windows Platform

A modern, multi-tenant operating system platform built with Deno, React, TypeScript, and Supabase.

## 🚀 Quick Start

### Prerequisites
- [Deno](https://deno.land/) (v1.40+)
- [Node.js](https://nodejs.org/) (v18+) - for Tailwind CSS
- [Supabase](https://supabase.com/) account

### Development Setup

1. **Clone and navigate to the workspace:**
   ```bash
   git clone <your-repo-url>
   cd aibos_dino
   ```

2. **Start the development server:**
   ```bash
   deno task dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:8000`

## 📁 Project Structure

```
aibos_dino/
├── aibos-hybrid-windows/          # Main AIBOS application
│   ├── api/                       # API endpoints
│   ├── apps/                      # App store applications
│   ├── docs/                      # Documentation
│   ├── scripts/                   # Build and utility scripts
│   ├── src/                       # Source code
│   │   ├── components/            # React components
│   │   ├── services/              # Business logic services
│   │   ├── store/                 # State management
│   │   ├── types/                 # TypeScript type definitions
│   │   └── utils/                 # Utility functions
│   ├── supabase/                  # Database schema and migrations
│   ├── main.ts                    # Application entry point
│   └── deno.json                  # Deno configuration
├── deno.json                      # Workspace configuration
├── tsconfig.json                  # TypeScript configuration
├── tailwind.config.js             # Tailwind CSS configuration
└── README.md                      # This file
```

## 🛠️ Available Tasks

### Development
```bash
deno task dev          # Start development server with hot reload
deno task build        # Build for production
```

### Workspace Management
```bash
deno task cleanup      # Clean up legacy files and organize workspace
deno task validate     # Validate SSOT compliance
deno task setup        # Setup Supabase database and schema
```

### Manual Scripts
```bash
# Cleanup with different modes
deno run --allow-read --allow-write --allow-run --allow-env aibos-hybrid-windows/scripts/cleanup-workspace.ts --dry-run --full
deno run --allow-read --allow-write --allow-run --allow-env aibos-hybrid-windows/scripts/cleanup-workspace.ts --safe
deno run --allow-read --allow-write --allow-run --allow-env aibos-hybrid-windows/scripts/cleanup-workspace.ts --quick

# Setup Supabase
deno run --allow-net --allow-read --allow-write --allow-env aibos-hybrid-windows/scripts/setup-supabase.ts

# Validate architecture
deno run --allow-read aibos-hybrid-windows/scripts/validate-ssot.ts
```

## 🏗️ Architecture

### Single Source of Truth (SSOT)
This workspace follows strict SSOT principles:
- **One canonical script per function**
- **No duplicate files or configurations**
- **Centralized schema management**
- **Clear ownership boundaries**

### Technology Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Deno + Supabase
- **Database**: PostgreSQL (via Supabase)
- **Real-time**: Supabase Realtime
- **Authentication**: Supabase Auth
- **State Management**: Zustand

### Key Features
- **Multi-tenant architecture**
- **App store system**
- **Real-time collaboration**
- **Performance optimization**
- **SSOT compliance validation**

## 🔧 Configuration

### Environment Variables
- `AIBOS_WORKSPACE_ROOT`: Override workspace root path (default: parent of current directory)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Workspace Root
The workspace root is automatically detected as the parent of the current directory when running scripts from `aibos-hybrid-windows/`. You can override this using the `AIBOS_WORKSPACE_ROOT` environment variable.

## 📚 Documentation

See the `aibos-hybrid-windows/docs/` directory for detailed documentation:
- `ARCHITECTURE_UNIFIED.md` - Complete architecture overview
- `SUPABASE_INTEGRATION.md` - Supabase setup and usage
- `PERFORMANCE_OPTIMIZATION_COMPLETE.md` - Performance optimization guide
- `SHORTCUT_MANAGEMENT.md` - Keyboard shortcuts and navigation

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Run validation:**
   ```bash
   deno task validate
   ```
5. **Submit a pull request**

### Development Guidelines
- Follow SSOT principles
- Use TypeScript for all new code
- Write comprehensive documentation
- Test your changes thoroughly
- Follow the established naming conventions

## 🔍 Validation

The workspace includes automated validation to ensure SSOT compliance:

```bash
deno task validate
```

This checks:
- No forbidden patterns exist
- All required files are present
- Directory structure matches canonical layout
- No duplicate functionality

## 🚀 Deployment

### Production Build
```bash
deno task build
```

### Environment Setup
1. Set up Supabase project
2. Configure environment variables
3. Run database migrations
4. Deploy to your hosting platform

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the documentation in `docs/`
2. Run `deno task validate` to check for configuration issues
3. Open an issue on GitHub

---

**Built with ❤️ by the AIBOS Team** 