# Simplified Migration Plan: Remove Prisma (Phase 0 Only)

**Objective:** Remove Prisma completely and prove repository pattern works with filesystem storage.

**Scope:** Local filesystem only. GitHub integration comes later in Phase 1.

**Timeline:** 4 sequential phases (0a → 0b → 0c → 0d)

---

## Phase 0a: Storage Abstractions (CURRENT)

### Create 2 Files

**File 1: `apps/frontend/src/lib/storage/types.ts`**
- ProjectDocument interface (project JSON structure)
- ProjectSummary interface (for listing)
- ProjectRepository interface (get, save, delete, list)
- UserDocument interface (user JSON structure)
- UserRepository interface (get, save)

**File 2: `apps/frontend/src/lib/storage/filesystem.ts`**
- FileSystemProjectRepository class (implements ProjectRepository)
- FileSystemUserRepository class (implements UserRepository)
- Read/write JSON files to `.local-storage/` directory
- No error handling complexity, simple read/write

### Data Structure

```
.local-storage/
├── users/
│   └── {github_id}.json
└── projects/
    └── {project_id}.json
```

**Project JSON:**
```json
{
  "project_id": "proj_xxx",
  "owner_id": "123456",
  "name": "My Project",
  "created_at": "2026-05-31T00:00:00Z",
  "updated_at": "2026-05-31T00:00:00Z",
  "schema": {
    "nodes": [],
    "edges": [],
    "version": 1
  }
}
```

**User JSON:**
```json
{
  "id": "user_123456",
  "github_id": 123456,
  "username": "johndoe",
  "email": "john@example.com",
  "avatar_url": "...",
  "created_at": "2026-05-31T00:00:00Z"
}
```

---

## Phase 0b: Refactor API Routes

### Update 1 File

**File: `apps/frontend/src/app/api/schema/save/route.ts`**

**Changes:**
1. Import FileSystemProjectRepository
2. Remove all `prisma.*` calls
3. Replace with repository calls:
   - `getProject(projectId)` 
   - `saveProject(projectDocument)`
   - `listProjects(ownerId)`
   - `deleteProject(projectId)`

**Endpoints (no change to user):**
- GET `/api/schema/save` → list projects
- POST `/api/schema/save` → create/update project
- DELETE `/api/schema/save?projectId={id}` → delete project

---

## Phase 0c: Remove Prisma

### Delete 2 Items
- `apps/frontend/prisma/` directory (entire)
- `apps/frontend/src/lib/prisma.ts`

### Modify 3 Files
- `apps/frontend/package.json` - remove 3 dependencies
  - `@prisma/client`
  - `@auth/prisma-adapter` 
  - `prisma`
- `apps/frontend/.env.example` - remove `DATABASE_URL`
- `apps/frontend/src/config/auth.ts` - GitHub-only (remove Google)

### Run
```bash
npm install
```

---

## Phase 0d: Verify Workflows

### Test Each Workflow

1. **Login with GitHub** ✅
   - User can authenticate with GitHub OAuth
   - Session works

2. **Create Project** ✅
   - POST `/api/schema/save` with projectName
   - `projects/{id}.json` file created in `.local-storage/`
   - Response includes projectId

3. **Open Project** ✅
   - GET `/api/schema/save` returns list
   - Can click project to open
   - Schema loads in editor

4. **Save Project** ✅
   - Click "Save" in architect
   - Schema JSON saved to file
   - Version increments
   - File updated in `.local-storage/`

5. **Delete Project** ✅
   - DELETE request removes project JSON
   - Project no longer in list

6. **Generate Project** ✅
   - Build generator still works (proxies to backend)
   - No changes to this flow

---

## What We're NOT Doing (Yet)

❌ GitHubProjectRepository  
❌ Parquet indexes  
❌ Analytics  
❌ StorageProvider factory  
❌ Multi-provider switching  
❌ Buffered commits  
❌ Cache layers  
❌ Environment variable switching  

---

## Success Criteria

✅ No Prisma imports anywhere  
✅ No `prisma.*` calls anywhere  
✅ No TypeScript errors  
✅ Frontend dev server starts  
✅ All 6 workflows work  
✅ `.local-storage/` directory populated with JSON files  
✅ Can create, read, update, delete projects  
✅ Backend build generator still works  

---

## After Phase 0d

Once all workflows verified:
1. Create Phase 1 design (GitHub-backed storage)
2. Implement GitHubProjectRepository
3. Add StorageProvider factory with env switching
4. Refactor routes to use factory

**No database needed. Filesystem only for MVP.**
