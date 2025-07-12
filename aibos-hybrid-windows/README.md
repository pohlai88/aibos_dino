# AIBOS Hybrid Windows Platform

A modern, multi-tenant operating system platform built with Deno, React, and Supabase.

## 🚀 Quick Start

1. **Setup Supabase**
   ```bash
   deno run --allow-net --allow-read --allow-write --allow-env scripts/setup-supabase.ts
   ```

2. **Validate Architecture**
   ```bash
   deno run --allow-net --allow-env scripts/ai-bos-architecture-check.ts
   ```

3. **Start Development Server**
   ```bash
   deno run --allow-net --allow-read --allow-env main.ts
   ```

## 📁 Project Structure

```
aibos-hybrid-windows/
├── apps/                    # App store applications
├── api/                     # API endpoints
├── docs/                    # Documentation
├── scripts/                 # Build and utility scripts
├── src/                     # Source code
│   ├── components/          # React components
│   ├── services/            # Business logic services
│   └── utils/               # Utility functions
├── supabase/                # Database schema and migrations
└── main.ts                  # Application entry point
```

## 🔧 Development

- **Frontend**: React + TypeScript
- **Backend**: Deno + Supabase
- **Database**: PostgreSQL (via Supabase)
- **Real-time**: Supabase Realtime
- **Authentication**: Supabase Auth

## 📚 Documentation

See the `docs/` directory for detailed documentation.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run the architecture validation script
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔒 SSOT (Single Source of Truth)

This workspace follows **strict SSOT principles** to maintain architectural integrity and prevent conflicts.

### **Canonical Files**

Only the following files define the platform's architecture:

- **Schema**: `supabase/aibos-platform-schema.sql`
- **Migrations**: `supabase/migrations/*`
- **Integration scripts**: `scripts/setup-supabase.ts`, `scripts/migrate-to-supabase.ts`
- **Documentation**: `docs/`
- **Registry**: `workspace-canonical.json`

### **SSOT Rules**

✅ **DO:**
- Reference canonical files for all definitions
- Add new features within established boundaries
- Follow naming conventions
- Update `workspace-canonical.json` when adding new canonical files

❌ **DON'T:**
- Create duplicate schema files
- Write test files in production workspace
- Modify core scripts without review
- Create alternate integration methods

### **AI Agent Boundaries**

AI agents can write in:
- `apps/*/` - New applications
- `src/components/` - UI components
- `src/utils/` - Utility functions
- `docs/` - New documentation

AI agents **cannot** modify:
- `supabase/` - Database schema
- `scripts/` - Core platform scripts
- `workspace-canonical.json` - SSOT registry
- `deno.json`, `tsconfig.json` - Configuration files

### **Validation**

To validate SSOT compliance:

```bash
deno run --allow-net --allow-env scripts/ai-bos-architecture-check.ts
```

This script checks:
- Database schema integrity
- RLS policy compliance
- SSOT violations
- Forbidden file patterns

### **Workspace Cleanup**

To maintain a clean workspace:

```bash
# Dry run (see what would be cleaned)
deno run --allow-read --allow-write --allow-run --allow-env scripts/cleanup-workspace.ts --dry-run

# Actual cleanup
deno run --allow-read --allow-write --allow-run --allow-env scripts/cleanup-workspace.ts
```

### **CI/CD Integration**

The architecture check runs automatically in:
- Every pull request
- Every deployment pipeline
- Pre-commit hooks

**Builds will fail if SSOT violations are detected.**

---

**Remember**: AIBOS is an operating system platform. Maintaining SSOT ensures reliability, consistency, and prevents architectural drift that could compromise tenant isolation and security.
