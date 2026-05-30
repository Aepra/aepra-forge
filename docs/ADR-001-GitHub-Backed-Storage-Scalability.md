# Architecture Decision Record (ADR-001)
## GitHub-Backed Storage Layer: Scalability Analysis & Design Decision

**Status:** Analysis (Not Yet Implemented)  
**Date:** 2026-05-31  
**Context:** Aepra-Forge requires persistent storage without external database. Evaluating GitHub Repository as source of truth for serverless (Vercel) deployment.

---

## 1. GitHub API Rate Limits Analysis

### 1.1 Current Limits (GitHub REST API v3)
- **Authenticated User:** 5,000 requests/hour
- **OAuth App:** Same as user (5,000/hour) per authenticated user
- **Unauthenticated:** 60 requests/hour (not applicable)

### 1.2 Operations & Rate Impact per User Request

#### Save Project (Create/Update)
- **Reads:** 1 `GET /repos/{owner}/{repo}/contents/{path}` (check current blob SHA)
- **Writes:** 1 `PUT /repos/{owner}/{repo}/contents/{path}` (commit)
- **Index update:** 1 read + 1 write for parquet shard
- **Total per save:** ~4 API calls

#### List Projects (Dashboard)
- **Fallback slow:** N×`GET /repos/{owner}/{repo}/contents/projects/{owner_id}/` (list all)
- **Fast (cached parquet):** 1 read from local cache
- **Total (parquet hit):** 0 API calls (cache-only)
- **Total (cache miss):** ~1-2 API calls (refresh index)

#### Open Project
- **Single read:** 1 `GET /repos/{owner}/{repo}/contents/{project_id}.json`
- **Total:** 1 API call

#### Generate Project
- **Reads project:** 1 `GET /repos/{owner}/{repo}/contents/{project_id}.json`
- **Total:** 1 API call

### 1.3 Rate Limit Budget per User

Assuming **worst case**: user saves 50 times/day, lists projects 20 times/day, generates 10 times/day.
```
Per user per day:
  Save:      50 × 4 = 200 calls
  List:      20 × 2 = 40 calls (cache miss)
  Open:      10 × 1 = 10 calls
  Generate:  10 × 1 = 10 calls
  ────────────────────────
  Total:     ~260 calls/day

Rate limit: 5,000/hour = ~100,000 calls/day (sustained)

Users sustainable with this budget: 100,000 ÷ 260 ≈ **384 concurrent active users/day**
```

### 1.4 Conclusion on Rate Limits
- **Good for:** Up to 100 active users at peak simultaneously, or 1000 users with sparse activity.
- **Problem at 100k+ users:** Rate limit quickly becomes bottleneck.
- **Mitigation strategy:**
  - Implement per-user token rotation (user's own OAuth token).
  - Aggressive parquet index caching (reduce list operations).
  - Batch index updates (async reconciliation).
  - Queue operations with exponential backoff retry.

---

## 2. Repository Growth Analysis

### 2.1 Storage Footprint per Scale

Assumptions:
- Average project JSON: **15 KB** (typical schema + metadata)
- Parquet index overhead: **2 KB per project entry**
- Analytics events: **0.5 KB per event** (builds, usage, downloads)
- Metadata (users, deployments): **5 KB per user**

#### 10,000 Projects
```
Projects:     10,000 × 15 KB     = 150 MB
Parquet idx:  10,000 × 2 KB      = 20 MB
Users:        1,000 × 5 KB       = 5 MB
Analytics:    100,000 events × 0.5 KB = 50 MB
─────────────────────────────────────────
Total:        ~225 MB
```
- **Repository clone:** ~225 MB (acceptable)
- **Git history:** Each project commit adds ~20 KB overhead
- **Total with history (1 save/project avg):** ~10,000 × 20 KB = 200 MB extra = **~425 MB**
- **GitHub storage limit:** Unlimited (soft limit ~100 GB per repo before warnings)
- **Verdict:** ✅ **Scalable**

#### 100,000 Projects
```
Projects:     100,000 × 15 KB    = 1.5 GB
Parquet idx:  100,000 × 2 KB     = 200 MB
Users:        10,000 × 5 KB      = 50 MB
Analytics:    1,000,000 events × 0.5 KB = 500 MB
─────────────────────────────────────────
Total:        ~2.25 GB
```
- **Git history (1 save/project):** 100,000 × 20 KB = 2 GB extra = **~4.25 GB total**
- **Clone time:** ~30-60 seconds on typical DSL
- **Index refresh time:** ~2-3 seconds (parquet scan)
- **Verdict:** ⚠️ **Feasible but slow clones.** Need to disable history clones or shallow clone + filter.

#### 1,000,000 Projects
```
Projects:     1M × 15 KB         = 15 GB
Parquet idx:  1M × 2 KB          = 2 GB
Users:        100k × 5 KB        = 500 MB
Analytics:    10M events × 0.5 KB = 5 GB
─────────────────────────────────────────
Total:        ~22.5 GB
```
- **Git history (1 save/project):** 1M × 20 KB = 20 GB extra = **~42.5 GB total**
- **Clone time:** Not practical (would timeout on Vercel)
- **Index operations:** Parquet scans start to become slow (seconds → minutes)
- **Verdict:** ❌ **Not scalable. Requires architectural shift.**

### 2.2 Commit History Explosion

If **every save = one commit**, history grows rapidly:

```
Scenario: 1M projects, average 5 saves per project lifetime
─────────────────────────────────────────────────────────
Total commits: 1M × 5 = 5,000,000 commits

Git repo overhead per commit: ~100 bytes (tree, parent, author, timestamp)
Additional history overhead: 5M × 100 bytes = 500 MB

BUT: Large DAG becomes slow for git operations (gc, rebase, bisect)
Recommended max commits: ~100k-500k before performance degrades
```

**Verdict:** Commit-per-save model **does not scale beyond 100k projects**.

---

## 3. Architecture Decision: Single vs Per-User Repositories

### 3.1 Single Shared Repository
```
Structure:
  storage/
  ├── projects/
  │   ├── user_001/
  │   │   ├── project_a.json
  │   │   └── project_b.json
  │   └── user_002/
  │       └── project_c.json
  ├── indexes/
  │   ├── projects.parquet (sharded by owner_id prefix)
  │   └── users.parquet
  └── analytics/
```

**Pros:**
- Single clone for admin/analytics
- Centralized index management
- Easier access control (one `.gitignore`, one workflow)
- Simple to implement

**Cons:**
- All users contend on same repo → merge conflicts on index
- Large monorepo becomes slow to clone (Vercel timeout risk at 1M scale)
- Single point of failure
- All analytics data centralized (privacy concern)
- Rate limit contention (all user operations share bucket)

**Scalability Limit:** ~100k projects before clone timeouts / slow operations

---

### 3.2 Per-User Repositories
```
Architecture:
  GitHub Org: aepra-forge-data
  Repos:
    - user-001-projects  (one repo per user)
    - user-002-projects
    - analytics-shared   (centralized analytics)
    - indexes-shared     (centralized parquet index shards)
```

**Pros:**
- Each user has isolated repo → no merge conflicts
- Fast clones (only user's projects)
- Individual rate limits per user token (5k/hour per user × N users)
- Privacy isolation
- Easier to archive/delete user data
- Scales to millions of users

**Cons:**
- More complex to set up (N repos instead of 1)
- Requires org membership or create-repo automation
- Analytics repo still centralized (separate concern)
- Cross-repo queries slower (need to fetch from multiple repos)
- List all projects requires fetching from N user repos or relying on central index

**Scalability Limit:** Effectively unlimited (rate limit × number of user tokens)

---

### 3.3 Recommendation: **Hybrid Per-User + Shared Index**

**Optimal architecture:**
1. **Per-user repos** for project storage (mitigates conflicts + scales rate limits)
2. **Single shared index repos** for parquet shards (projects.parquet, users.parquet)
3. **Analytics repos** per month/shard for append-only events
4. **Owner service** routes requests to correct user repo

**Fallback for scale:**
- At 100k+ users: switch to S3/R2 as backing store (see Section 6)

---

## 4. Commit Strategy: Immediate vs Buffered

### 4.1 Immediate Commit per Save
```
User saves project
→ API creates commit immediately
→ Parquet index updated
→ Response to user
```

**Pros:**
- Immediate consistency
- Simple implementation
- User sees update instantly in other tabs/devices
- Atomic save+index operation

**Cons:**
- Git history explosion (Section 2.2)
- Rate limit pressure (4 API calls per save)
- Conflicts on concurrent saves (see Section 5)
- Hard to batch operations

**Scalability:** ❌ **Not viable beyond 100k projects**

---

### 4.2 Buffered/Batched Commits (Recommended)
```
User saves project
→ Write to local cache + buffer queue (memory)
→ Return success immediately (optimistic)
→ Background job runs every 30 seconds:
   - Batch projects by user
   - Create one commit per user (groups 10-50 saves)
   - Update parquet index shards
   - Prune buffer
→ On buffer flush failure: retry with exponential backoff
```

**Pros:**
- Reduces commits: 1 per user per 30s instead of 1 per save
- Rate limit friendly (fewer API calls)
- History manageable (100k projects → ~48k commits/day at 100 saves/day)
- Easier conflict resolution (batch instead of per-file)
- Async operations don't block user

**Cons:**
- Eventual consistency (eventual_consistency window ~30s)
- Need idempotent retry logic
- Buffer loss on crash (need persistent queue like Redis/SQS)
- More complex implementation

**Scalability:** ✅ **Viable to 1M+ projects**

---

## 5. Conflict Handling Strategy

### 5.1 Simultaneous Save Conflict Scenario
```
Timeline:
  T0: User A reads project.json (SHA: abc123)
  T1: User B reads same project.json (SHA: abc123)
  T2: User A saves → creates commit X, new SHA: def456
  T3: User B saves → conflict (expected SHA: abc123, actual: def456)
```

### 5.2 Resolution Strategies

#### Strategy A: Last-Write-Wins (Simple)
- B's update overwrites A's update
- **Risk:** Data loss for A
- **Verdict:** ❌ Not acceptable

#### Strategy B: Optimistic Locking with Retry
```
1. A saves with expected_sha=abc123
2. GitHub API returns conflict (blob SHA mismatch)
3. A fetches latest (DEF456), merges locally, retries
4. If merge conflict in schema: user sees error, must reload
```

**Verdict:** ✅ Acceptable for single-user primary (each project has one owner)

#### Strategy C: Eventual Consistency with Event Log
```
1. Buffer both A and B saves locally
2. Batch process: for each (user, project) pair, keep latest timestamp
3. Commit latest version only
4. Other versions logged to analytics (audit trail)
```

**Verdict:** ✅ Recommended for buffered batch architecture

#### Strategy D: Operational Transformation / CRDTs
- Too complex for MVP, consider only for true multi-user editing within one project
- **Out of scope for current design**

### 5.3 Ownership Enforcement
Every project has single `owner_id` (github_id).
- Only owner can save project (enforced at API level)
- Concurrent saves from **same owner** on **same project** → conflict (handled above)
- Concurrent saves from **different owners** on **different projects** → no conflict

---

## 6. Immediate vs Asynchronous Index Updates

### 6.1 Immediate Index Update
```
User saves project A
→ Commit project A JSON
→ Update projects.parquet (add/update row for A)
→ Respond to user
```

**Pros:**
- No eventual consistency lag
- Listing always sees latest

**Cons:**
- Blocks save response (slower)
- Rate limit overhead (write to index each time)
- Hard to batch index writes

---

### 6.2 Asynchronous Index Update (Recommended)
```
User saves project A
→ Commit project A JSON
→ Queue "refresh index row for A" event
→ Respond to user immediately
→ Background job (every 60s):
   - Read recently-changed projects from commit log
   - Update parquet shards
```

**Pros:**
- Doesn't block save
- Can batch index updates (50+ projects per index job)
- Rate limit friendly

**Cons:**
- 30-60s eventual consistency gap
- Dashboard stale for brief window (acceptable)

---

## 7. Long-Term Migration Path to S3/R2

### 7.1 Repository Interface Abstraction

```typescript
// Current abstraction (must be designed now):
interface ProjectRepository {
  getProject(projectId: string, ownerId: string): Promise<ProjectDocument>
  saveProject(projectDoc: ProjectDocument): Promise<{ commitSha: string }>
  listProjectsByOwner(ownerId: string, options: ListOptions): Promise<ProjectSummary[]>
}

interface IndexRepository {
  getProjectsIndex(ownerIdPrefix: string): Promise<ParquetData>
  upsertProjectEntry(entry: ProjectIndexEntry): Promise<void>
  queryProjects(filter: QueryFilter): Promise<ProjectIndexEntry[]>
}

interface StorageProvider {
  projectRepository: ProjectRepository
  indexRepository: IndexRepository
  analyticsRepository: AnalyticsRepository
  cacheProvider: CacheProvider
}
```

### 7.2 GitHub Implementation (Phase 1)
- `ProjectRepository` → GitHub REST API (per-user repo)
- `IndexRepository` → Parquet files in shared index repo
- `CacheProvider` → Local ephemeral filesystem (Vercel /tmp)

### 7.3 S3/R2 Implementation (Phase 2)
- `ProjectRepository` → S3/R2 object storage (`s3://aepra-projects/{owner_id}/{project_id}.json`)
- `IndexRepository` → DynamoDB or managed parquet (Athena)
- `CacheProvider` → CloudFlare KV or local cache
- **No code changes to business logic** (only provider implementation)

### 7.4 Migration Flow
```
Current state: GitHub-backed (all repos)
↓
Phase 1: Introduce abstraction layer (GitHub still backing)
↓
Phase 2: Implement S3 providers (GitHub → S3 migration flag)
↓
Phase 3: Dual-write + sync (GitHub + S3 simultaneously)
↓
Phase 4: Cutover to S3 (GitHub becomes archive/backup)
↓
Phase 5: Decommission GitHub (optional)
```

---

## 8. Scalability Summary Table

| Metric | 10k Projects | 100k Projects | 1M Projects |
|--------|---|---|---|
| **Single Repo Size** | 425 MB | 4.25 GB | 42.5 GB |
| **Clone Time** | ~10s | ~60s | Timeout ❌ |
| **Commit History** | ~50k | ~500k | 5M ❌ |
| **API Calls/day (100 active users)** | 26k ✅ | 260k ⚠️ | 2.6M ❌ |
| **Per-User Repo Model** | ✅ | ✅ | ✅ |
| **Immediate Commits** | ✅ | ⚠️ | ❌ |
| **Buffered Commits** | ✅ | ✅ | ✅ |
| **GitHub Viable** | ✅ | ⚠️ | ❌ S3 needed |

---

## 9. Architecture Decision: RECOMMENDED DESIGN

### 9.1 Phase 1: MVP (Up to 100k Projects)

**Stack:**
1. **Per-user GitHub repos** for project storage
   - One repo per user: `{org}/user-{github_id}-projects`
   - Projects stored as: `projects/{project_id}.json`
   - Automatic repo creation on first save (via GitHub app)

2. **Single shared index repos** for parquet shards
   - `{org}/aepra-indexes-projects` (projects parquet, sharded by owner_id prefix)
   - `{org}/aepra-indexes-users` (users parquet)
   - `{org}/aepra-analytics-{YYYY-MM}` (monthly append-only events)

3. **Buffered commits** (batch every 30-60s)
   - Local buffer queue (in-memory)
   - Batch by user (one commit per user per batch)
   - Async reconciliation job

4. **Optimistic locking** for conflicts
   - Expected blob SHA in commit message
   - Retry with merge on mismatch

5. **Cache provider** for local ephemeral storage
   - Index cache (parquet in /tmp, 5 min TTL)
   - Project cache (recent opens, 10 min TTL)

**Rate Limit Budget:**
- Per user token: 5k/hour
- Sustainable: ~100 concurrent active users at peak, or 1000 sparse users

---

### 9.2 Phase 2: Scale to 1M+ (S3/R2 Migration)

**Trigger:** 100k+ projects OR dashboard/API latency > 2s

**Action:**
1. Implement `S3ProjectRepository` + `S3IndexRepository`
2. Enable dual-write (GitHub + S3 simultaneously)
3. Migrate in background (data sync worker)
4. Cutover to S3 (API flag switch)
5. Archive GitHub repos

**Cost implication:**
- GitHub storage: Free (via org)
- S3/R2: ~$0.01/GB/month (very cheap for this scale)

---

### 9.3 GitHub-Only Limitations to Accept

**Acknowledged limits:**
- Max 1M projects before S3 migration required
- GitHub outage = app write unavailability (read cache + stale data works)
- Rate limit contention if many users active simultaneously
- No real-time multi-user editing (acceptable; projects are single-owner)

---

## 10. Decision Rationale

**Why GitHub-backed first?**
1. No external infrastructure required for MVP
2. Built-in versioning + audit trail
3. Per-user repos scale rate limits
4. Familiar mental model for developers
5. Easy to implement, easy to test locally

**Why not single shared repo?**
- Merge conflicts on index updates
- Clone timeout risk at 100k+ scale
- All users share rate limit bucket
- Monorepo becomes unwieldy

**Why per-user repos + shared index?**
- Isolates conflicts per user
- Scales to millions of users
- Index remains performant (smaller datasets)
- Clean separation of concerns

**Why buffered commits?**
- Prevents commit explosion
- Rate limit friendly
- Easier batch conflict resolution
- Async doesn't block user

**Why this supports S3 migration?**
- Repository interfaces abstract implementation
- Can swap GitHub for S3 without business logic changes
- Dual-write provides safety net during migration

---

## 11. Risks & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| GitHub API rate limit exceeded | High | Per-user tokens, aggressive caching, batch updates |
| Concurrent save conflicts | Medium | Optimistic locking + retry, single owner per project |
| Buffer loss (process crash) | Medium | Persistent queue (Redis/SQS) in Phase 2 |
| GitHub outage | Medium | Read-through cache, circuit breaker, graceful degrade |
| Index corruption (stale parquet) | Low | Hourly reconciliation job, audit log in analytics |
| Per-user repo proliferation | Low | Auto-archive inactive repos, cleanup job |

---

## 12. Success Criteria

✅ **Phase 1 (MVP)** is successful if:
- Supports 100k projects without timeout
- Rate limit headroom for 100 concurrent users
- Save/open <500ms (cached)
- Index refresh <2s
- Conflict resolution <1% of saves

✅ **Phase 2 (S3)** is successful if:
- Supports 1M+ projects
- Latency <200ms (S3 is faster than GitHub)
- Unlimited concurrent users
- Zero GitHub dependency for writes

---

## 13. Recommendation: APPROVE & PROCEED WITH PHASE 1

**Decision: GitHub-backed MVP architecture with per-user repos + shared index + buffered commits**

**Rationale:**
- Supports MVP requirements (100k projects, serverless, no external DB)
- Scalable to Phase 2 via abstraction layer
- Simple to implement and test
- Clear migration path to S3
- Risk mitigation addresses all identified hazards

**Next Steps:**
1. Design repository interfaces (TypeScript)
2. Implement GitHub `ProjectRepository` + cache layer
3. Implement buffered commit queue
4. Implement `IndexRepository` (parquet shard)
5. Refactor API routes to use abstraction
6. Performance testing up to 100k scale

---

**Document Status:** Ready for Implementation Review  
**Target Implementation Start:** Immediately after approval
