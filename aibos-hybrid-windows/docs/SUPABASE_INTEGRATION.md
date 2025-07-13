# 🚀 AIBOS Supabase Integration Guide

This guide explains how to integrate Supabase with your AIBOS hybrid Windows file system for persistent, real-time, and secure file storage.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Setup Instructions](#setup-instructions)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Real-time Features](#real-time-features)
7. [Security](#security)
8. [Performance](#performance)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Supabase provides a powerful backend-as-a-service solution that perfectly complements your AIBOS hybrid Windows environment. It offers:

- **PostgreSQL Database** - Reliable, scalable data storage
- **Real-time Subscriptions** - Live updates across clients
- **Row Level Security (RLS)** - Multi-tenant data isolation
- **Authentication** - Built-in user management
- **Storage** - File upload and management
- **Edge Functions** - Serverless API endpoints

---

## ✨ Features

### 🔐 Multi-tenant File System
- Each user has their own isolated file system
- Automatic data separation via RLS policies
- No data leakage between users

### 📡 Real-time Updates
- Live file system changes across all clients
- Instant folder/file creation notifications
- Real-time collaboration capabilities

### 📊 Audit Trail
- Complete operation history
- Track all file system changes
- User activity monitoring

### 🛡️ Security
- Row Level Security (RLS) policies
- Path traversal protection
- Input validation and sanitization
- Secure file uploads

### 📈 Performance
- Optimized database indexes
- Efficient queries with PostgreSQL functions
- Connection pooling
- Edge caching

---

## 🛠️ Setup Instructions

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and API keys

### Step 2: Run Setup Script

```bash
# Navigate to your project directory
cd aibos-hybrid-windows

# Run the setup script
deno run --allow-net --allow-read --allow-write --allow-env scripts/setup-supabase.ts
```

The script will:
- Check your Supabase connection
- Create the database schema
- Set up storage buckets
- Test file system operations
- Generate configuration files

### Step 3: Manual Schema Setup (if needed)

If the automatic schema creation fails, manually run the SQL in `supabase/file-system-schema.sql` in your Supabase SQL editor.

### Step 4: Configure Environment

Create a `.env` file based on the generated `.env.template`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 5: Start the API

```bash
# Start with Supabase integration
deno run --allow-net --allow-env api/files-supabase.ts
```

---

## 🗄️ Database Schema

### Core Tables

#### `file_system_items`
Stores all files and folders:

```sql
CREATE TABLE file_system_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('file', 'folder')),
    size BIGINT DEFAULT 0,
    content TEXT,
    mime_type TEXT DEFAULT 'text/plain',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    parent_id UUID REFERENCES file_system_items(id) ON DELETE CASCADE,
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(tenant_id, path, name)
);
```

#### `file_system_operations`
Audit trail for all operations:

```sql
CREATE TABLE file_system_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('create', 'update', 'delete', 'move', 'copy', 'rename')),
    item_id UUID REFERENCES file_system_items(id) ON DELETE SET NULL,
    old_path TEXT,
    new_path TEXT,
    old_name TEXT,
    new_name TEXT,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
```

#### `file_system_settings`
User preferences:

```sql
CREATE TABLE file_system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    view_mode TEXT DEFAULT 'grid' CHECK (view_mode IN ('grid', 'list', 'details')),
    sort_by TEXT DEFAULT 'name' CHECK (sort_by IN ('name', 'size', 'created_at', 'updated_at')),
    sort_order TEXT DEFAULT 'asc' CHECK (sort_order IN ('asc', 'desc')),
    show_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Database Functions

#### `get_file_system_tree(p_path TEXT)`
Returns file system items for a specific path.

#### `create_folder(p_path TEXT, p_name TEXT)`
Creates a new folder with validation.

#### `delete_item(p_item_id UUID)`
Soft deletes an item with recursive folder handling.

#### `rename_item(p_item_id UUID, p_new_name TEXT)`
Renames an item with duplicate name checking.

---

## 🌐 API Endpoints

### Base URL
```
http://localhost:8000/api/files
```

### GET - List Directory
```http
GET /api/files?path=Documents
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "My Document.txt",
      "type": "file",
      "size": "1.2 KB",
      "rawSize": 1234,
      "path": "Documents/My Document.txt",
      "created": "2024-01-01T00:00:00Z",
      "modified": "2024-01-01T00:00:00Z",
      "mimeType": "text/plain"
    }
  ]
}
```

### POST - Create Item
```http
POST /api/files
Content-Type: application/json

{
  "action": "createFolder",
  "name": "New Folder"
}
```

**Create File:**
```json
{
  "action": "createFile",
  "name": "document.txt",
  "content": "Hello World!",
  "mimeType": "text/plain"
}
```

### PUT - Update Item
```http
PUT /api/files
Content-Type: application/json

{
  "action": "rename",
  "itemId": "uuid",
  "name": "New Name"
}
```

**Move Item:**
```json
{
  "action": "move",
  "itemId": "uuid",
  "newPath": "Documents/Subfolder"
}
```

**Update Content:**
```json
{
  "action": "updateContent",
  "itemId": "uuid",
  "content": "Updated content"
}
```

### DELETE - Delete Item
```http
DELETE /api/files
Content-Type: application/json

{
  "itemId": "uuid"
}
```

---

## 📡 Real-time Features

### Subscribe to File System Changes

```typescript
import { fileSystemService } from './src/services/supabase.ts';

// Subscribe to all file system changes
const subscription = fileSystemService.subscribeToFileSystemChanges((payload) => {
  console.log('File system changed:', payload);
  
  switch (payload.eventType) {
    case 'INSERT':
      console.log('New item created:', payload.new);
      break;
    case 'UPDATE':
      console.log('Item updated:', payload.new);
      break;
    case 'DELETE':
      console.log('Item deleted:', payload.old);
      break;
  }
});
```

### Subscribe to Operations

```typescript
// Subscribe to operation history
const operationsSubscription = fileSystemService.subscribeToOperations((payload) => {
  console.log('Operation performed:', payload);
});
```

---

## 🛡️ Security

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:

- Users can only access their own data
- Automatic tenant isolation
- Secure data boundaries

### Path Validation

```typescript
function isPathSafe(path: string): boolean {
  return !path.includes("..") && !path.includes("~");
}
```

### Input Sanitization

- SQL injection prevention
- XSS protection
- File type validation
- Size limits enforcement

### Authentication

- JWT token validation
- Session management
- Automatic token refresh

---

## 📈 Performance

### Database Optimization

- **Indexes** on frequently queried columns
- **Composite indexes** for path-based queries
- **Partial indexes** for active items only

### Query Optimization

- **Stored procedures** for complex operations
- **Efficient joins** with proper foreign keys
- **Pagination** for large result sets

### Caching Strategy

- **Connection pooling** for database connections
- **Edge caching** for static assets
- **Client-side caching** for frequently accessed data

---

## 🔧 Troubleshooting

### Common Issues

#### Connection Errors
```
Error: Failed to connect to Supabase
```
**Solution:** Check your `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`

#### Schema Errors
```
Error: Function get_file_system_tree does not exist
```
**Solution:** Run the schema SQL manually in Supabase SQL editor

#### Permission Errors
```
Error: new row violates row-level security policy
```
**Solution:** Ensure RLS policies are properly configured

#### Real-time Issues
```
Error: Realtime connection failed
```
**Solution:** Check your Supabase project's real-time settings

### Debug Mode

Enable debug logging:

```typescript
const supabase = createClient(url, key, {
  auth: {
    debug: true
  }
});
```

### Health Check

Test your setup:

```bash
# Test connection
curl http://localhost:8000/api/files

# Test folder creation
curl -X POST http://localhost:8000/api/files \
  -H "Content-Type: application/json" \
  -d '{"action":"createFolder","name":"test"}'
```

---

## 🚀 Next Steps

### Advanced Features

1. **File Upload API** - Handle binary file uploads
2. **Search Functionality** - Full-text search across files
3. **Version Control** - File versioning and history
4. **Collaboration** - Multi-user file editing
5. **Backup System** - Automatic data backups
6. **Analytics** - Usage statistics and insights

### Deployment

1. **Supabase Edge Functions** - Deploy API to edge
2. **Vercel/Netlify** - Deploy frontend
3. **Custom Domain** - Set up your own domain
4. **SSL Certificate** - Enable HTTPS

### Monitoring

1. **Supabase Dashboard** - Monitor database performance
2. **Logs** - Track API requests and errors
3. **Metrics** - Monitor usage and performance
4. **Alerts** - Set up notification for issues

---

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Deno Documentation](https://deno.land/manual)
- [React Documentation](https://react.dev/)

---

## 🤝 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Supabase logs in the dashboard
3. Test with the provided examples
4. Create an issue in the project repository

---

**🎉 Congratulations!** Your AIBOS hybrid Windows file system is now powered by Supabase with enterprise-grade features like real-time updates, multi-tenancy, and comprehensive security. 