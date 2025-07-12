# 📁 Modular File API

A modular, extensible virtual file system API built in Deno, supporting multiple storage backends like in-memory and Supabase.

---

## 🏗️ Architecture Overview

```

api/
├── files.ts                # Legacy in-memory server
├── files-supabase.ts       # Supabase-based server
├── files-modular.ts        # New modular server (recommended)
└── modules/
├── types.ts            # Shared types and interfaces
├── utils.ts            # Utility functions
├── validation.ts       # Input validation helpers
├── filesystem.ts       # In-memory storage backend
├── supabaseStorage.ts  # Supabase storage backend
└── fileOperations.ts   # Core file system operations

````

---

## 🚀 Quick Start

### Run Locally (In-Memory)

```bash
deno run --allow-net --allow-env files-modular.ts
````

---

### Run in Production (Supabase)

```bash
export STORAGE_TYPE=supabase
export SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

deno run --allow-net --allow-env files-modular.ts
```

---

## 📋 API Endpoints

### `GET /?path={path}`

Retrieve the list of files and folders under a given path.

#### Example Response

```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "unique-id",
        "name": "folder-name",
        "type": "folder",
        "modified": "2024-01-15",
        "icon": "📁",
        "path": "folder-name",
        "size": "2.3 KB"
      }
    ],
    "path": "current-path"
  }
}
```

---

### `POST /`

Create, rename, copy, move, or delete items.

#### Supported Actions

* `createFolder` → Create a new folder.
* `createFile` → Create a new file.
* `rename` → Rename an existing item.
* `copy` → Copy an item to another location.
* `move` → Move an item to another location.
* `delete` → Delete an item by ID.

#### Example Request

```json
{
  "action": "createFolder",
  "name": "New Folder"
}
```

---

### `DELETE /`

Delete an item by its ID.

#### Example Request

```json
{
  "itemId": "unique-id"
}
```

---

## 🔧 Storage Backends

### ✅ In-Memory Storage (`filesystem.ts`)

* ⚡ Fast and lightweight for development and testing.
* ❌ Data lost when the server restarts.
* ✅ Zero external dependencies.

---

### ✅ Supabase Storage (`supabaseStorage.ts`)

* ✅ Persistent storage for production use.
* ✅ Multi-tenant support.
* ✅ Real-time capabilities.
* ⚠️ Requires a Supabase setup and environment variables.

---

## 🎯 Key Features

✅ **Modular Design**

* Clean separation between HTTP handling, operations, and storage logic.
* Easily extendable to support new storage backends.

✅ **Environment-Based Configuration**

* Use in-memory storage for local development.
* Switch seamlessly to Supabase in production.

✅ **Type Safety**

* Full TypeScript types ensure reliability and maintainability.
* Flexible result structures via `OperationResult<T>`.

✅ **Error Handling**

* Consistent and predictable error responses.
* Clear error messages for debugging.

✅ **Input Validation**

* Validates file names, paths, and IDs for security and correctness.

---

## 🔄 Migration Guide

### Migrating from Legacy to Modular

1. Update frontend API URLs:

   ```js
   // Old:
   fetch('/api/files?path=...');

   // New:
   fetch('/api/files-modular?path=...');
   ```

2. Configure environment variables:

   ```bash
   export STORAGE_TYPE=supabase
   export SUPABASE_URL=your_supabase_url
   export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. Prepare your Supabase database:

   ```sql
   -- Run your Supabase schema (e.g. aibos-platform-schema.sql)
   ```

---

## 🧪 Testing

### Unit Tests

Run tests for individual modules:

```bash
deno test modules/types.ts
deno test modules/validation.ts
```

---

### Integration Tests

Run full API tests:

```bash
deno test --allow-net files-modular.test.ts
```

---

## 🔮 Roadmap

* [ ] **File Uploads** → Support for binary file uploads.
* [ ] **Search** → Full-text search across file names and content.
* [ ] **Versioning** → Maintain file version history and rollback.
* [ ] **Sharing** → File sharing with permission controls.
* [ ] **Compression** → Automatic compression for large files.
* [ ] **Caching** → Redis or in-memory caching for performance.

---

## 📝 Contributing

* Follow the modular architecture pattern.
* Maintain strict type safety across all new code.
* Validate all inputs to ensure robust APIs.
* Keep this documentation updated for new features.

---

## 🐛 Troubleshooting

### Missing Supabase Configuration

```
Error: Missing Supabase environment variables
```

→ Solution: Either set `STORAGE_TYPE=memory` for local dev or configure the required Supabase environment variables.

---

### Permission Denied

```
Error: Failed to create folder
```

→ Solution: Ensure the storage backend has proper permissions and that paths are valid.

---

### Invalid File Name

```
Error: File name contains invalid characters
```

→ Solution: Use the validation utilities to check file names before sending requests.

---

## License

MIT

```
