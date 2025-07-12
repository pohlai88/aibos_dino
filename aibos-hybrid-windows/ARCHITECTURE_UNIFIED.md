# AIBOS Platform - Unified Architecture

## Overview

The AIBOS platform is a multi-tenant operating system built with Deno, React, and Supabase. This document describes the unified architecture that consolidates all previous schemas into a single, coherent system.

## Core Architecture Principles

### 1. **Multi-Tenant First**
- Every resource belongs to a tenant
- Users access resources through tenant membership
- Complete tenant isolation via RLS policies

### 2. **App Store Integration**
- Apps can integrate with the file system via `app_id`
- Apps can create, read, and manage files within tenant boundaries
- App-specific metadata and configurations

### 3. **Real-time Everything**
- All changes are broadcast via Supabase Realtime
- Live updates across all connected clients
- Optimistic UI updates with conflict resolution

## Database Schema

### Core Tables

#### `tenants`
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subscription_tier TEXT DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `tenant_members`
```sql
CREATE TABLE tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);
```

#### `file_system_items`
```sql
CREATE TABLE file_system_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  app_id UUID REFERENCES apps(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('file', 'folder')),
  path TEXT NOT NULL,
  size BIGINT DEFAULT 0,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  parent_id UUID REFERENCES file_system_items(id) ON DELETE CASCADE
);
```

#### `apps`
```sql
CREATE TABLE apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  version TEXT DEFAULT '1.0.0',
  icon_url TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `app_installations`
```sql
CREATE TABLE app_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'installed',
  config JSONB DEFAULT '{}',
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, app_id)
);
```

## Row Level Security (RLS)

### Tenant Access Control
All tables implement tenant-based access control:

```sql
-- Example for file_system_items
CREATE POLICY "Users can access files in their tenants" ON file_system_items
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_members 
      WHERE user_id = auth.uid()
    )
  );
```

### Role-Based Access
Different roles have different permissions:

- **owner**: Full access to tenant resources
- **admin**: Manage tenant settings and members
- **member**: Standard access to tenant resources
- **viewer**: Read-only access

## API Structure

### File System API
```
GET    /api/files?tenant_id=xxx&path=xxx
POST   /api/files (create folder/file)
PUT    /api/files/:id (update)
DELETE /api/files/:id (delete)
```

### Tenant Management API
```
GET    /api/tenants
POST   /api/tenants (create)
GET    /api/tenants/:id
PUT    /api/tenants/:id
DELETE /api/tenants/:id
```

### App Store API
```
GET    /api/apps
POST   /api/apps/:id/install
DELETE /api/apps/:id/uninstall
```

## Frontend Architecture

### Component Structure
```
src/
├── components/
│   ├── Desktop.tsx          # Main desktop container
│   ├── Window.tsx           # Window component
│   ├── Dock.tsx             # App dock
│   ├── StartMenu.tsx        # Start menu
│   └── Spotlight.tsx        # Search interface
├── services/
│   ├── supabase.ts          # Supabase client
│   ├── fileSystem.ts        # File system operations
│   ├── tenants.ts           # Tenant management
│   └── apps.ts              # App store operations
└── store/
    └── uiState.ts           # Zustand state management
```

### State Management
Using Zustand for global state:

```typescript
interface UIState {
  openWindows: Window[];
  zIndexOrder: string[];
  dockVisibility: boolean;
  spotlightVisible: boolean;
  currentTenant: Tenant | null;
  installedApps: AppInstallation[];
}
```

## Security Model

### Authentication
- Supabase Auth for user authentication
- JWT tokens for API access
- Session management via Supabase

### Authorization
- RLS policies enforce tenant boundaries
- Role-based access control
- App-specific permissions

### Data Protection
- All data encrypted at rest
- HTTPS for all communications
- Regular security audits

## Performance Considerations

### Database Optimization
- Indexes on frequently queried columns
- Connection pooling
- Query optimization

### Caching Strategy
- Redis for session storage
- Browser caching for static assets
- Optimistic updates for better UX

### Real-time Performance
- Efficient subscription management
- Debounced updates
- Connection state management

## Deployment Architecture

### Production Stack
- **Frontend**: Deno Deploy
- **Backend**: Supabase
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage
- **CDN**: Supabase CDN

### Environment Variables
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Migration Guide

### From Old Schema
1. Run the migration script: `deno run scripts/migrate-to-supabase.ts`
2. Verify data integrity
3. Update application code to use new API endpoints
4. Test tenant isolation

### Schema Updates
1. Create migration files in `supabase/migrations/`
2. Test migrations in development
3. Apply to staging environment
4. Deploy to production

## Monitoring and Analytics

### Metrics to Track
- Tenant creation and growth
- App installation rates
- File system usage patterns
- API performance metrics
- Error rates and types

### Logging
- Structured logging for all operations
- Error tracking and alerting
- Performance monitoring
- Security event logging

## Future Enhancements

### Planned Features
- Advanced file sharing between tenants
- App marketplace with reviews
- Advanced analytics dashboard
- Multi-region deployment
- Mobile app support

### Scalability Considerations
- Horizontal scaling for high load
- Database sharding strategies
- CDN optimization
- Microservices architecture

## Conclusion

This unified architecture provides a solid foundation for the AIBOS platform. It supports multi-tenancy, app integration, real-time updates, and scalable growth while maintaining security and performance.

For questions or contributions, please refer to the development guidelines and code of conduct. 