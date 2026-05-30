# Aepra-Forge Migration Plan: Prisma → GitHub-Backed Storage
## Phase 0 (MVP): Remove Database, Implement Storage Abstractions

**Status:** Pre-Implementation Analysis  
**Target:** Simplest working MVP with clean abstractions  
**Timeline:** Sequential implementation  

---

## 1. Current State Analysis

### 1.1 Prisma Dependencies (Currently Active)

**Files using Prisma:**
1. `apps/frontend/prisma/schema.prisma` - ORM schema definition
   - 5 models: User, Project, Schema, Account, Session, Deployment, VerificationToken
   - PostgreSQL datasource via `DATABASE_URL`
   
2. `apps/frontend/src/lib/prisma.ts` - PrismaClient singleton
   - Exports global Prisma instance with query logging
   
3. `apps/frontend/src/app/api/schema/save/route.ts` - Core save/list API
   - ~220 lines
   - Uses Prisma transactions for consistency
   - GET: List user projects
   - POST: Create/update project with schema versioning
   
4. `apps/frontend/package.json` - Dependencies
   - `@prisma/client` v6.4.1
   - `@auth/prisma-adapter` v2.11.1 (NextAuth adapter)
   - `prisma` v6.4.1 (dev dependency)

5. `apps/frontend/.env.example` - Configuration
   - `DATABASE_URL=postgresql://...`

**Files NOT using Prisma but involved in data flow:**
- `apps/frontend/src/config/auth.ts` - NextAuth config (needs GitHub-only refactor)
- `apps/frontend/src/app/api/generator/build/route.ts` - Generator proxy
- `backend/app_main.py` - Backend API entry point
- Frontend UI components (unchanged - use existing API routes)

### 1.2 Current Data Models

**User model (from Prisma schema):**
```typescript
User {
  id: UUID
  email: string (unique)
  password_hash: string? (always null for OAuth)
  name: string?
  image: string?
  emailVerified: DateTime?
  created_at: DateTime
  projects: Project[] (relation)
  accounts: Account[] (OAuth relation)
  sessions: Session[]
}
```

**Project model:**
```typescript
Project {
  id: UUID
  user_id: UUID (FK to User)
  name: string
  created_at: DateTime
  schemas: Schema[] (relation)
  deployments: Deployment[]
}
```

**Schema model (most important):**
```typescript
Schema {
  id: UUID
  project_id: UUID (FK to Project)
  schema_json: JSON (nodes + edges from React Flow)
  version: int
  created_at: DateTime
}
```

**Account model (OAuth):**
```typescript
Account {
  id: string
  userId: UUID (FK to User)
  type: string (provider type)
  provider: string
  providerAccountId: string
  access_token: string?
  refresh_token: string?
  expires_at: int?
}
```

**Session model:**
```typescript
Session {
  id: string
  sessionToken: string
  userId: UUID (FK to User)
  expires: DateTime
}
```

---

## 2. Design: Storage Abstractions (Before GitHub Integration)

### 2.1 Repository Interfaces (TypeScript)

**Core abstraction - must be language-agnostic:**

```typescript
// apps/frontend/src/lib/storage/types.ts

export interface User {
  id: string; // GitHub user ID
  github_id: number;
  username: string;
  email: string;
  avatar_url: string;
  created_at: string; // ISO-8601
}

export interface ProjectDocument {
  project_id: string;
  owner_id: string; // GitHub user ID
  name: string;
  created_at: string;
  updated_at: string;
  schema: {
    nodes: any[];
    edges: any[];
    version: number;
  };
}

export interface ProjectSummary {
  project_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface StorageError extends Error {
  code: 'NOT_FOUND' | 'ALREADY_EXISTS' | 'UNAUTHORIZED' | 'INTERNAL' | string;
  status: number;
}

export interface ProjectRepository {
  // Get single project
  getProject(projectId: string): Promise<ProjectDocument | null>;
  
  // List projects by owner
  listProjects(ownerId: string): Promise<ProjectSummary[]>;
  
  // Save project (create or update)
  saveProject(project: ProjectDocument): Promise<void>;
  
  // Delete project
  deleteProject(projectId: string): Promise<void>;
  
  // Check if project exists
  exists(projectId: string): Promise<boolean>;
}

export interface UserRepository {
  // Get user by GitHub ID
  getUser(githubId: number | string): Promise<User | null>;
  
  // Save/upsert user
  saveUser(user: User): Promise<void>;
  
  // Delete user
  deleteUser(githubId: number | string): Promise<void>;
}

export interface StorageProvider {
  projectRepository: ProjectRepository;
  userRepository: UserRepository;
  
  // Health check
  isHealthy(): Promise<boolean>;
}
```

### 2.2 Implementation Strategy

**Phase 0a: Filesystem Implementation (Development)**
```
.local-storage/
├── users/
│   ├── 12345.json
│   └── 67890.json
├── projects/
│   ├── proj_001.json
│   ├── proj_002.json
│   └── proj_003.json
```

**Phase 0b: GitHub Implementation (Production)**
```
GitHub Repository: {ORG}/aepra-forge-storage
├── users/
│   ├── 12345.json
│   └── 67890.json
├── projects/
│   ├── proj_001.json
│   ├── proj_002.json
│   └── proj_003.json
```

---

## 3. File Structure Changes

### 3.1 New Files to Create

**Storage abstractions:**
```
apps/frontend/src/lib/storage/
├── types.ts                          (interfaces)
├── index.ts                          (export StorageProvider)
├── filesystem.ts                     (FileSystemProjectRepository, FileSystemUserRepository)
├── github.ts                         (GitHubProjectRepository, GitHubUserRepository)
└── provider.ts                       (Factory: getStorageProvider())
```

**Example locations:**
- `apps/frontend/src/lib/storage/types.ts` - Interfaces
- `apps/frontend/src/lib/storage/filesystem.ts` - Filesystem implementation
- `apps/frontend/src/lib/storage/github.ts` - GitHub implementation
- `apps/frontend/src/lib/storage/index.ts` - Export functions

### 3.2 Files to Modify

**1. Authentication (GitHub-only)**
- `apps/frontend/src/config/auth.ts`
  - Remove Google provider
  - Keep GitHub provider only
  - Extract github_id from JWT session

**2. API Routes**
- `apps/frontend/src/app/api/schema/save/route.ts`
  - Replace `prisma.user.*` with `projectRepository.userRepository`
  - Replace `prisma.project.*` with `projectRepository.projectRepository`
  - Replace `prisma.schema.*` with schema inside ProjectDocument
  - Remove Prisma transactions (use atomic file writes)

**3. Environment/Config**
- `apps/frontend/.env.example`
  - Remove `DATABASE_URL`
  - Add `STORAGE_PROVIDER=filesystem|github`
  - Add GitHub token for production: `GITHUB_TOKEN`
  - Add GitHub repo path: `GITHUB_STORAGE_REPO`

**4. Dependencies**
- `apps/frontend/package.json`
  - Remove `@prisma/client`
  - Remove `@auth/prisma-adapter`
  - Remove `prisma`
  - Keep `next-auth` (only OAuth, not adapter)

### 3.3 Files to Delete

- `apps/frontend/prisma/` directory (entire)
  - `schema.prisma`
  - `migrations/` folder
  - `migrations_lock.toml`
- `apps/frontend/src/lib/prisma.ts`

---

## 4. Implementation Phases (Sequential)

### Phase 0a: Create Storage Abstractions
1. Create TypeScript interfaces (`storage/types.ts`)
2. Implement filesystem backend (`storage/filesystem.ts`)
   - Read/write JSON files to `.local-storage/`
   - No persistence needed (dev only)
3. Create factory function (`storage/index.ts`)
4. Add environment variable: `STORAGE_PROVIDER`

**Testing:**
- Verify file creation in `.local-storage/`
- Test getProject, saveProject, listProjects, deleteProject

### Phase 0b: Refactor API Routes
1. Update `src/app/api/schema/save/route.ts`
   - Import `getStorageProvider()`
   - Replace all `prisma.*` calls with repository calls
   - Simplify transaction logic (single file write = atomic)
   
2. Verify existing tests pass (or create new tests)

**Testing:**
- POST /api/schema/save creates project JSON
- GET /api/schema/save lists projects
- Files appear in `.local-storage/`

### Phase 0c: Remove Prisma
1. Delete `prisma/` directory
2. Remove Prisma from `package.json`
3. Update `apps/frontend/.env.example`
4. Update `src/config/auth.ts` to GitHub-only
5. Clean up imports in all files

**Testing:**
- `npm install` succeeds
- Dev server starts without Prisma
- No import errors

### Phase 0d: GitHub Implementation (Production Ready)
1. Implement GitHub backend (`storage/github.ts`)
   - Use GitHub REST API to read/write JSON files
   - Use user's GitHub token for authentication
   - Handle rate limiting gracefully
   
2. Update environment variables
3. Document production setup

---

## 5. Data Structure Decisions

### 5.1 JSON File Format for Projects

```json
{
  "project_id": "proj_a1b2c3d4",
  "owner_id": "user_12345",
  "name": "CRM System",
  "created_at": "2026-05-31T10:00:00Z",
  "updated_at": "2026-05-31T15:30:45Z",
  "schema": {
    "nodes": [
      {
        "id": "node_1",
        "type": "table",
        "data": { "label": "users" },
        "position": { "x": 100, "y": 100 }
      }
    ],
    "edges": [
      {
        "id": "edge_1",
        "source": "node_1",
        "target": "node_2"
      }
    ],
    "version": 5
  }
}
```

### 5.2 JSON File Format for Users

```json
{
  "id": "user_12345",
  "github_id": 98765432,
  "username": "johndoe",
  "email": "john@example.com",
  "avatar_url": "https://avatars.githubusercontent.com/u/98765432",
  "created_at": "2026-05-31T10:00:00Z"
}
```

### 5.3 File Naming Convention

**Projects:**
- Filename: `projects/{project_id}.json`
- ID format: `proj_{random_short_id}` (e.g., `proj_a1b2c3d4`)

**Users:**
- Filename: `users/{github_id}.json`
- ID format: GitHub user ID as number (e.g., `98765432.json`)

---

## 6. Migration: Existing Prisma Data

**MVP Approach:** Start fresh (no migration from old Prisma data)

**Reasoning:**
- Aepra-Forge is in early development
- Existing production data likely minimal or test data
- Clean slate with new architecture preferable
- Users will re-create projects in new system

**If migration needed in future:**
1. Export Prisma data to JSON
2. Transform to new schema format
3. Bulk import to GitHub/filesystem
4. User verification + opt-in

---

## 7. Affected Workflows

### 7.1 Save Project Workflow (No Changes to User)

```
User edits schema in architect
↓
Clicks "Save"
↓
Frontend calls POST /api/schema/save
↓ (Route refactored)
getStorageProvider().projectRepository.saveProject()
↓ (Implementation: filesystem or GitHub)
JSON file written to storage
↓
Response: { projectId, projectName, schemaVersion, savedAt }
```

### 7.2 List Projects Workflow (No Changes to User)

```
User opens /projects
↓
Frontend calls GET /api/schema/save
↓ (Route refactored)
getStorageProvider().projectRepository.listProjects(ownerId)
↓ (Implementation: filesystem or GitHub)
Reads all projects for owner
↓
Response: [ { id, name, createdAt, updatedAt } ]
```

### 7.3 Generate Project Workflow (No Changes to User)

```
User clicks "Generate"
↓
Frontend calls POST /api/generator/build
↓ (Route unchanged - still proxies to backend)
Backend receives ProjectBlueprint JSON
↓
Backend calls repository to getProject() if needed
↓
Generates ZIP
```

---

## 8. Authentication Changes

### 8.1 Current Flow (with Prisma + Google + GitHub)
```
User login
→ OAuth provider (Google or GitHub)
→ NextAuth
→ Store in Account + Session tables
→ Store/upsert User record
```

### 8.2 New Flow (GitHub-only, no database)
```
User login
→ GitHub OAuth only
→ NextAuth JWT strategy
→ Extract github_id from user profile
→ Verify session (JWT validation, no DB needed)
→ On first login: save User to storage via UserRepository.saveUser()
```

### 8.3 Code Changes in `src/config/auth.ts`

**Remove:**
```typescript
Google({
  clientId: process.env.AUTH_GOOGLE_ID || "",
  clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
})
```

**Keep:**
```typescript
GitHub({
  clientId: process.env.AUTH_GITHUB_ID || "",
  clientSecret: process.env.AUTH_GITHUB_SECRET || "",
})
```

**Callbacks (new):**
```typescript
callbacks: {
  async jwt({ token, user, account }) {
    if (account && user) {
      token.github_id = account.providerAccountId;
    }
    return token;
  },
  async session({ session, token }) {
    session.user.id = token.github_id;
    return session;
  }
}
```

---

## 9. Environment Variables

### 9.1 New Variables (Phase 0)

**Required:**
```env
STORAGE_PROVIDER=filesystem  # or 'github' for production
```

**Development:**
```env
STORAGE_PROVIDER=filesystem
```

**Production (later):**
```env
STORAGE_PROVIDER=github
GITHUB_TOKEN=ghp_xxxxx
GITHUB_STORAGE_REPO=aepra-org/aepra-forge-storage
```

### 9.2 Removed Variables

```env
DATABASE_URL                  # ❌ Remove
AUTH_GOOGLE_ID               # ❌ Remove
AUTH_GOOGLE_SECRET           # ❌ Remove
```

### 9.3 Unchanged Variables

```env
NEXTAUTH_URL                 # ✅ Keep
NEXTAUTH_SECRET              # ✅ Keep
AUTH_SECRET                  # ✅ Keep
AUTH_GITHUB_ID               # ✅ Keep
AUTH_GITHUB_SECRET           # ✅ Keep
NEXT_PUBLIC_BACKEND_URL      # ✅ Keep
BACKEND_INTERNAL_URL         # ✅ Keep
AEPRA_BUILD_API_TOKEN        # ✅ Keep
```

---

## 10. Testing Strategy

### Phase 0a Testing (Abstractions)

```typescript
// Example test: FileSystemProjectRepository
describe('FileSystemProjectRepository', () => {
  it('should save and retrieve project', async () => {
    const repo = new FileSystemProjectRepository('./.test-storage');
    const project: ProjectDocument = { ... };
    
    await repo.saveProject(project);
    const retrieved = await repo.getProject(project.project_id);
    
    expect(retrieved).toEqual(project);
  });
  
  it('should list projects by owner', async () => {
    const repo = new FileSystemProjectRepository('./.test-storage');
    
    const projects = await repo.listProjects('user_12345');
    
    expect(projects).toBeInstanceOf(Array);
  });
});
```

### Phase 0b Testing (Routes)

```typescript
// Example test: POST /api/schema/save
describe('POST /api/schema/save', () => {
  it('should save project using storage provider', async () => {
    const response = await fetch('/api/schema/save', {
      method: 'POST',
      body: JSON.stringify({
        projectName: 'Test Project',
        nodes: [],
        edges: []
      })
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.data.projectId).toBeDefined();
  });
});
```

---

## 11. Rollback Plan

**If critical issue discovered during Phase 0:**
1. Revert git commits
2. Restore Prisma dependencies
3. Restore `.env` with DATABASE_URL
4. Restore `src/lib/prisma.ts`
5. Run `npm install` to restore packages
6. Restart dev server

**Git strategy:**
- Each phase in separate commit
- Phase 0a: "feat: add storage abstraction layer"
- Phase 0b: "refactor: replace prisma with repository pattern"
- Phase 0c: "chore: remove prisma dependencies"
- Phase 0d: "feat: add github storage implementation"

---

## 12. Success Criteria (Phase 0 MVP Complete)

✅ **Functional Requirements:**
- [ ] Users can log in with GitHub OAuth only
- [ ] Projects can be saved to storage (filesystem or GitHub)
- [ ] Projects can be listed from storage
- [ ] Projects can be loaded from storage
- [ ] Projects can be deleted from storage
- [ ] Build generator still works (proxies to backend)

✅ **Code Quality:**
- [ ] No Prisma imports in frontend code
- [ ] No `prisma.` calls anywhere
- [ ] Storage abstractions in place (interfaces + 2 implementations)
- [ ] Environment variable based provider selection
- [ ] No TypeScript errors
- [ ] No console warnings about deprecated packages

✅ **Documentation:**
- [ ] Updated `.env.example`
- [ ] Updated `README.md` with new architecture
- [ ] Migration guide for developers
- [ ] Production GitHub storage setup instructions

---

## 13. Files Summary

### Files to Create
- `apps/frontend/src/lib/storage/types.ts`
- `apps/frontend/src/lib/storage/filesystem.ts`
- `apps/frontend/src/lib/storage/github.ts`
- `apps/frontend/src/lib/storage/index.ts`

### Files to Modify
- `apps/frontend/src/config/auth.ts` (GitHub-only)
- `apps/frontend/src/app/api/schema/save/route.ts` (use repositories)
- `apps/frontend/package.json` (remove Prisma)
- `apps/frontend/.env.example` (update variables)

### Files to Delete
- `apps/frontend/prisma/` (entire directory)
- `apps/frontend/src/lib/prisma.ts`

### Files NOT Changed
- `backend/` (unchanged)
- `apps/frontend/src/components/` (unchanged)
- `apps/frontend/src/features/` (unchanged)
- `apps/frontend/src/app/api/generator/build/route.ts` (unchanged)

---

**Ready for Implementation Review**
