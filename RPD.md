# 📋 Requirement Planning Document (RPD) - Aepra-Forge

**Version**: 1.0  
**Date**: May 31, 2026  
**Status**: MVP Complete

---

## 📌 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [User Flows](#user-flows)
4. [Pages & Components](#pages--components)
5. [API Endpoints](#api-endpoints)
6. [Data Flow](#data-flow)
7. [Tech Stack](#tech-stack)

---

## 🎯 Project Overview

### Apa itu Aepra-Forge?

Aepra-Forge adalah **Backend Generator** yang memungkinkan user membuat backend FastAPI dengan mudah melalui visual editor.

**User dapat:**
- ✅ Login dengan GitHub
- ✅ Membuat project (blueprint)
- ✅ Design database schema secara visual (drag-drop table, columns, relationships)
- ✅ Save project ke server
- ✅ Generate FastAPI backend project sebagai ZIP file
- ✅ Download dan langsung jalankan generated project

**Output:**
- 📦 ZIP file berisi full FastAPI project dengan:
  - `app/main.py` - Entry point
  - `app/models.py` - SQLAlchemy models
  - `app/schemas.py` - Pydantic schemas
  - `app/routers/` - CRUD endpoints
  - `app/database.py` - Database config
  - `requirements.txt` - Dependencies
  - `README.md` - Documentation

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER BROWSER                                │
│                   (Next.js Frontend)                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼──────┐       ┌────────▼────────┐
        │  NextAuth    │       │  React Flow    │
        │  (GitHub)    │       │  (Visual       │
        │              │       │   Editor)      │
        └───────┬──────┘       └────────┬────────┘
                │                       │
        ┌───────▼──────────────────────▼────────┐
        │  Next.js API Routes (Backend)         │
        │  - /api/auth/[...nextauth]           │
        │  - /api/schema/save (GET/POST/DELETE)│
        │  - /api/generator/build               │
        └───────┬──────────────────────┬────────┘
                │                      │
        ┌───────▼──────┐      ┌────────▼────────┐
        │  FastAPI     │      │  FileSystem    │
        │  Generator   │      │  Repository    │
        │  (Backend)   │      │  (.local-      │
        │              │      │   storage/)    │
        └───────┬──────┘      └────────┬────────┘
                │                      │
        ┌───────▼──────────────────────▼────────┐
        │        Database (PostgreSQL)          │
        │     ← Hanya untuk env setup            │
        └────────────────────────────────────────┘
```

### Key Components:

| Component | Fungsi |
|-----------|--------|
| **Frontend (Next.js)** | UI untuk design schema |
| **NextAuth** | Autentikasi GitHub |
| **React Flow** | Visual editor untuk drag-drop table |
| **FileSystem Repo** | Simpan project ke `.local-storage/` |
| **FastAPI Backend** | Generate ZIP file |
| **PostgreSQL** | Database (opsional, untuk production) |

---

## 👥 User Flows

### **Flow 1: Login & Browse Projects**

```
┌─────────────────────────────────────────┐
│  User Buka localhost:3000               │
└────────────────┬────────────────────────┘
                 │
                 ▼
        ┌─────────────────────┐
        │  Belum Login?        │
        │  Redirect ke /login  │
        └────────────┬─────────┘
                     │
                     ▼
        ┌─────────────────────────────────┐
        │  Login Page (/login)             │
        │  - Tombol "Sign in with GitHub" │
        └────────────┬─────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────────┐
        │  GitHub OAuth Flow:             │
        │  1. Redirect ke GitHub          │
        │  2. User approve                │
        │  3. Return ke callback URL      │
        │  4. NextAuth generate token    │
        └────────────┬─────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────────┐
        │  Projects Page (/projects)      │
        │  - List semua project user      │
        │  - Tombol "Create Project"      │
        │  - Tombol "Open Project"        │
        │  - Tombol "Delete Project"      │
        └─────────────────────────────────┘
```

---

### **Flow 2: Create & Edit Project**

```
┌─────────────────────────────────────┐
│  Projects Page                      │
│  Klik "Create Project"              │
└────────────────┬────────────────────┘
                 │
                 ▼
        ┌────────────────────────────────┐
        │  Architect Page (/architect)   │
        │  - Visual editor (React Flow) │
        │  - Toolbar dengan tools:      │
        │    • Add Table                │
        │    • Save (Ctrl+S)            │
        │    • Generate                 │
        │    • Export JSON              │
        │    • Undo/Redo                │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │  User Design Schema:           │
        │  1. Drag "Add Table"          │
        │  2. Edit table properties     │
        │  3. Add columns (name, type)  │
        │  4. Create relationships      │
        │  5. Auto-layout (optional)    │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │  Klik "Save" (Ctrl+S)         │
        │  ├─ Save ke localStorage      │
        │  ├─ POST /api/schema/save     │
        │  └─ Backend save ke filesystem│
        │                                │
        │  Response: { projectId, ... } │
        └────────────────────────────────┘
```

---

### **Flow 3: Generate Backend Project**

```
┌──────────────────────────────────────┐
│  Architect Page (sudah punya schema)  │
│  Klik "Generate"                     │
└────────────────┬─────────────────────┘
                 │
                 ▼
        ┌────────────────────────────────┐
        │  Extract data dari editor:     │
        │  - Nodes (tables)              │
        │  - Edges (relationships)       │
        │  - Column definitions          │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │  POST /api/generator/build     │
        │  - projectId                   │
        │  - nodes, edges, columns       │
        │  - framework: "fastapi"        │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │  Frontend proxy route:         │
        │  1. Load project dari server   │
        │  2. Convert ke blueprint       │
        │  3. POST ke backend /generator │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │  FastAPI Backend (/generator)  │
        │  Generate ZIP:                 │
        │  ├─ Create main.py             │
        │  ├─ Create models.py           │
        │  ├─ Create schemas.py          │
        │  ├─ Create routers/            │
        │  ├─ Create requirements.txt    │
        │  └─ Zip all files              │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │  Return ZIP file ke browser    │
        │  Auto-download sebagai:        │
        │  "generated-project.zip"       │
        └────────────────────────────────┘
```

---

## 📄 Pages & Components

### **Page 1: Login (/login)**

**Path**: `apps/frontend/src/app/(auth)/login/page.tsx`

**Components**:
- GitHub login button
- GitHub logo
- Text: "Sign in with GitHub"

**Flow**:
```
User Click "Sign in with GitHub"
    ↓
signIn("github", { callbackUrl: "/projects" })
    ↓
Redirect ke GitHub OAuth
    ↓
User approve app
    ↓
Redirect back ke localhost:3000/api/auth/callback/github
    ↓
NextAuth generate session token
    ↓
Redirect ke /projects
```

**Auth Config**: `apps/frontend/src/config/auth.ts`
```typescript
providers: [
  GitHub({
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
  }),
]
```

---

### **Page 2: Projects (/projects)**

**Path**: `apps/frontend/src/app/(app)/projects/page.tsx`

**Components**:
- ProjectsDashboard
  - Project list (cards)
  - Search bar
  - Create button
  - Delete buttons

**Features**:
```javascript
// Load projects dari localStorage
const projects = loadProjectSummaries();

// Hydrate dari server
await hydrateProjectSummariesFromServer();

// Click project → redirect ke /architect
openProject(id) → setCurrentProjectId(id) → router.push("/architect")
```

**Data Structure**:
```typescript
type ProjectSummary = {
  id: string;           // "proj_abc123"
  name: string;         // "User Database"
  createdAt: string;    // ISO date
  updatedAt: string;    // ISO date
  tablesCount: number;  // 3
  relationsCount: number; // 2
  isBlank: boolean;     // false
}
```

---

### **Page 3: Architect (/architect)**

**Path**: `apps/frontend/src/app/(app)/architect/page.tsx`

**Components**:
- ArchitectDashboard (wrapper)
  - EditorCanvas (React Flow)
    - Nodes (tables)
    - Edges (relationships)
    - Background grid
    - Controls
  - Toolbar
    - Add table button
    - Save button
    - Generate button
    - Export/Import
    - Undo/Redo

**Flow**:
```javascript
// 1. Load project dari localStorage atau server
const projectId = getCurrentProjectId();
const project = loadProject(projectId);

// Jika tidak ada di cache → hydrate dari server
if (!project) {
  project = await hydrateProjectFromServer(projectId);
}

// 2. Set React Flow nodes & edges
setNodes(project.nodes);
setEdges(project.edges);

// 3. User interaksi (add table, add column, etc)

// 4. Auto-save (debounced)
window.setTimeout(() => {
  persistWorkspace(projectName);
}, 1000);
```

---

## 🔌 API Endpoints

### **1. Authentication**

```
GET /api/auth/signin
  → Redirect ke GitHub OAuth

GET /api/auth/session
  → Return current user session
  → Response: { user: { id, name, email, image } }

GET /api/auth/callback/github
  → GitHub callback
  → Set NextAuth session
  → Redirect ke /projects
```

---

### **2. Project CRUD**

**Endpoint**: `/api/schema/save`

#### **GET /api/schema/save**
**Purpose**: Fetch all projects untuk user

```javascript
// Headers
Authorization: Bearer {session.token}

// Response
{
  "success": true,
  "data": [
    {
      "projectId": "proj_abc123",
      "projectName": "User Database",
      "createdAt": "2026-05-31T00:00:00Z",
      "updatedAt": "2026-05-31T00:00:00Z",
      "tablesCount": 3,
      "relationsCount": 2,
      "isBlank": false
    }
  ]
}
```

#### **POST /api/schema/save**
**Purpose**: Create atau update project

```javascript
// Request Body
{
  "projectId": "proj_abc123",  // optional (jika undefined = create baru)
  "projectName": "User Database",
  "nodes": [
    {
      "id": "node-1",
      "type": "table",
      "data": { "label": "users", columns: [...] },
      "position": { "x": 100, "y": 100 }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "type": "relationship"
    }
  ]
}

// Response
{
  "success": true,
  "data": {
    "projectId": "proj_abc123",
    "projectName": "User Database",
    "savedAt": "2026-05-31T00:00:00Z"
  }
}
```

**Validation**:
- ✅ User must be authenticated
- ✅ Project name length <= 120 chars
- ✅ Nodes count <= 500
- ✅ Edges count <= 2000
- ✅ Owner must match

#### **DELETE /api/schema/save?projectId=proj_abc123**
**Purpose**: Delete project

```javascript
// Response
{
  "success": true,
  "data": { "deletedProjectId": "proj_abc123" }
}
```

---

### **3. Generator**

**Endpoint**: `/api/generator/build`

#### **POST /api/generator/build**
**Purpose**: Generate FastAPI project ZIP

```javascript
// Request Body
{
  "projectId": "proj_abc123",
  "framework": "fastapi",
  // Atau jika projectId tidak ada, include blueprint directly:
  // "blueprint": { nodes, edges, ... }
}

// Response: ZIP file binary
// Downloaded as: "generated-project.zip"
```

**Backend Flow**:
1. Frontend proxy menerima request
2. Load project dari FileSystemProjectRepository
3. Convert ke ProjectBlueprint format
4. POST ke backend FastAPI `/generator`
5. Backend emit ZIP file
6. Frontend download ZIP

---

## 📊 Data Flow

### **Data Storage**

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND - Browser LocalStorage                             │
├─────────────────────────────────────────────────────────────┤
│ aepra.projects.index: [{ id, name, createdAt, ... }]       │
│ aepra.project.{id}: { id, name, nodes, edges, ... }        │
│ aepra.projects.current: "proj_abc123"                       │
└─────────────────────────────────────────────────────────────┘
                          ↕ (sync)
┌─────────────────────────────────────────────────────────────┐
│ BACKEND - FileSystem Repository                             │
├─────────────────────────────────────────────────────────────┤
│ .local-storage/projects/                                    │
│   ├─ proj_abc123.json                                       │
│   ├─ proj_def456.json                                       │
│   └─ proj_ghi789.json                                       │
└─────────────────────────────────────────────────────────────┘
```

### **Project JSON Structure**

```json
{
  "project_id": "proj_abc123",
  "owner_id": "12345678",  // GitHub ID
  "name": "User Database",
  "created_at": "2026-05-31T00:00:00.000Z",
  "updated_at": "2026-05-31T00:00:00.000Z",
  "schema": {
    "nodes": [
      {
        "id": "node-1",
        "type": "table",
        "position": { "x": 100, "y": 100 },
        "data": {
          "label": "users",
          "columns": [
            {
              "id": "col-1",
              "name": "id",
              "type": "integer",
              "primary": true,
              "nullable": false,
              "unique": true,
              "default": null,
              "length": null
            },
            {
              "id": "col-2",
              "name": "email",
              "type": "varchar",
              "primary": false,
              "nullable": false,
              "unique": true,
              "default": null,
              "length": 255
            }
          ]
        }
      }
    ],
    "edges": [
      {
        "id": "edge-1",
        "source": "node-1",
        "target": "node-2",
        "sourceHandle": "col-1",
        "targetHandle": "col-2",
        "type": "relationship",
        "data": {
          "relationshipType": "one_to_many"
        }
      }
    ]
  }
}
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16.2.2 | UI framework |
| | React 19.2.4 | Component framework |
| | TypeScript 5 | Type safety |
| | React Flow | Visual editor |
| | NextAuth 4.24.13 | Authentication |
| | TailwindCSS | Styling |
| **Backend** | FastAPI | API framework |
| | Uvicorn | ASGI server |
| | SQLAlchemy | ORM |
| **Storage** | FileSystem | Project persistence |
| | PostgreSQL | Database (optional) |
| | Redis | Cache (optional) |
| **DevOps** | Docker Compose | Containerization |
| | Git | Version control |

---

## 📝 Summary

### **User Journey**:
```
1. User login dengan GitHub
   ↓
2. Browse projects atau create baru
   ↓
3. Design schema secara visual (drag-drop)
   ↓
4. Save project (auto-sync ke server)
   ↓
5. Generate backend FastAPI project
   ↓
6. Download ZIP dan langsung jalankan
```

### **Key Features**:
- ✅ GitHub OAuth login
- ✅ Visual schema editor (React Flow)
- ✅ Project persistence (filesystem + localStorage)
- ✅ Real FastAPI backend generator
- ✅ Auto-save dengan debouncing
- ✅ CRUD operations (Create, Read, Update, Delete projects)
- ✅ Export/Import project JSON
- ✅ Undo/Redo support

### **MVP Status**:
- ✅ Authentication (GitHub OAuth)
- ✅ Project management (CRUD)
- ✅ Visual editor (React Flow)
- ✅ Generator (FastAPI ZIP output)
- ✅ Data persistence (FileSystem)
- ⚠️ Live testing (ready to test)

