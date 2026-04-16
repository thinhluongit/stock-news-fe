# Plan: Post Writing System (Editor & Admin Roles)

## Context

The platform is a stock-market news site built on Express.js + PostgreSQL (backend) and Next.js + Redux Toolkit (frontend). Users with `editor` and `admin` roles need a proper post authoring experience. Currently, posts are edited via a plain `<textarea>` in the admin panel, there is no Cloudflare R2 integration, and the status system is a simple VARCHAR. This plan introduces:

- Integer `doc_status` replacing the VARCHAR `status` column, with a defined lifecycle state machine
- EditorJS as the rich-text editor (block-based, outputs JSON, SSR-compatible via dynamic import)
- Cloudflare R2 file storage for images and videos, accessed via the S3-compatible API
- A new `/dashboard/` area for both editors and admins (the existing `/admin/` stays admin-only)
- A dedicated `/api/posts` route set separate from the public `/api/news` routes

---

## docStatus Integer Mapping

| Value | Meaning    | Who can edit content       |
|-------|------------|----------------------------|
| `0`   | Draft      | Author (editor/admin)      |
| `1`   | Published  | Nobody — archive first     |
| `2`   | Archived   | Author (editor/admin)      |

**Allowed status transitions:**

| From      | To(s)            |
|-----------|-----------------|
| `0` draft | `1`, `2`        |
| `1` pub   | `2` only        |
| `2` arch  | `0`, `1`        |

---

## Critical Files

### Existing files to modify
- `backend/src/db/schema.sql` — update `status` → `doc_status INTEGER`
- `backend/src/types/index.ts` — update `NewsArticle`, add `DOC_STATUS` constants
- `backend/src/repositories/newsRepository.ts` — add `findAllForDashboard`, `createWithDocStatus`, `updateContent`, `updateDocStatus`, `findRawById` update
- `backend/src/services/newsService.ts` — update public `/api/news` to use integer filter
- `backend/src/app.ts` — register new `/api/upload` and `/api/posts` routers
- `frontend/src/types/index.ts` — update `Article` type, add `DOC_STATUS_LABEL/COLORS`
- `frontend/src/services/api.ts` — add `postsApi` and `uploadApi`
- `frontend/src/store/index.ts` — register `postsReducer`
- `frontend/src/app/admin/posts/page.tsx` — update status references to integer
- `frontend/src/app/admin/posts/[id]/page.tsx` — update for `doc_status`, disable edit if published

### New files to create
- `backend/src/db/migrations/002_doc_status.sql`
- `backend/src/services/uploadService.ts`
- `backend/src/controllers/uploadController.ts`
- `backend/src/routes/upload.ts`
- `backend/src/controllers/postsController.ts`
- `backend/src/services/postsService.ts`
- `backend/src/routes/posts.ts`
- `frontend/src/components/editor/EditorBlock.tsx`
- `frontend/src/store/slices/postsSlice.ts`
- `frontend/src/app/dashboard/layout.tsx`
- `frontend/src/app/dashboard/page.tsx` (redirects to `/dashboard/posts`)
- `frontend/src/app/dashboard/posts/page.tsx`
- `frontend/src/app/dashboard/posts/new/page.tsx`
- `frontend/src/app/dashboard/posts/[id]/edit/page.tsx`

---

## Step 1 — Database Migration

**File:** `backend/src/db/migrations/002_doc_status.sql`

```sql
BEGIN;

ALTER TABLE news ADD COLUMN doc_status INTEGER;

UPDATE news SET doc_status = CASE
  WHEN status = 'draft'     THEN 0
  WHEN status = 'published' THEN 1
  WHEN status = 'archived'  THEN 2
  ELSE 0
END;

ALTER TABLE news
  ALTER COLUMN doc_status SET NOT NULL,
  ADD CONSTRAINT news_doc_status_check CHECK (doc_status IN (0, 1, 2));

ALTER TABLE news ALTER COLUMN doc_status SET DEFAULT 0;

DROP INDEX IF EXISTS idx_news_status;
ALTER TABLE news DROP COLUMN status;

CREATE INDEX idx_news_doc_status ON news(doc_status);

COMMIT;
```

Also update `backend/src/db/schema.sql` to replace the `status` VARCHAR column with `doc_status INTEGER DEFAULT 0 CHECK (doc_status IN (0, 1, 2))`.

---

## Step 2 — Backend Packages

Install in `backend/`:
```
npm install @aws-sdk/client-s3
```

Multer is already installed. No extra types needed (AWS SDK ships its own).

---

## Step 3 — Backend Types (`backend/src/types/index.ts`)

```typescript
export const DOC_STATUS = {
  DRAFT: 0,
  PUBLISHED: 1,
  ARCHIVED: 2,
} as const;
export type DocStatus = typeof DOC_STATUS[keyof typeof DOC_STATUS];

// In NewsArticle: replace `status: 'draft' | 'published' | 'archived'` with:
doc_status: DocStatus;
```

---

## Step 4 — Cloudflare R2 Upload Service

**New file: `backend/src/services/uploadService.ts`**

- Uses `@aws-sdk/client-s3` with `S3Client` pointing to `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
- `region: 'auto'` (required for R2)
- Uploads buffer via `PutObjectCommand`, keys files as `uploads/<uuid><ext>`
- Returns `${R2_PUBLIC_URL}/${key}`

**New file: `backend/src/controllers/uploadController.ts`**

- Validates `req.file` exists
- Allowlist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, `video/webm`
- Max 50 MB
- Returns `{ success: 1, file: { url } }` (EditorJS image tool format)

**New file: `backend/src/routes/upload.ts`**

```typescript
router.post('/', authenticate, authorize('editor', 'admin'), upload.single('image'), uploadFile);
```

- `multer.memoryStorage()` — no disk writes
- Register in `app.ts`: `app.use('/api/upload', uploadRoutes)`

**New env vars** (add to `.env` and `.env.example`):
```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

---

## Step 5 — Posts Routes & Business Logic

### Route structure: `backend/src/routes/posts.ts`

All routes: `authenticate, authorize('editor', 'admin')`

| Method | Path                    | Purpose                            |
|--------|-------------------------|------------------------------------|
| GET    | `/api/posts`            | List posts (editor=own, admin=all) |
| GET    | `/api/posts/:id`        | Get single post                    |
| POST   | `/api/posts`            | Create draft                       |
| PUT    | `/api/posts/:id`        | Edit content (draft/archived only) |
| PATCH  | `/api/posts/:id/status` | Change status (state machine)      |
| DELETE | `/api/posts/:id`        | Delete (admin only)                |

### Status machine (in `backend/src/services/postsService.ts`)

```typescript
const ALLOWED_TRANSITIONS: Record<number, number[]> = {
  0: [1, 2],   // draft → published | archived
  1: [2],      // published → archived only
  2: [0, 1],   // archived → draft | published
};
```

- `updatePost` throws `422` if `doc_status === 1` (published)
- `updateStatus` validates transition before applying
- `assertOwnerOrAdmin` runs on all mutations (editors only own, admins any)
- `listPosts`: if `user.role !== 'admin'`, scopes to `author_id = user.id`
- On publish: sets `published_at` to `NOW()` if not previously set

### Repository additions (`backend/src/repositories/newsRepository.ts`)

New methods needed:
- `createWithDocStatus(data)` — INSERT with `doc_status` instead of `status`
- `updateContent(id, data)` — COALESCE UPDATE for title/summary/content/thumbnail/category
- `updateDocStatus(id, docStatus, publishedAt)` — UPDATE only status + published_at
- `findAllForDashboard(opts)` — paginated, filterable by `authorId`, `docStatus`, `search`
- `findRawById(id)` — add `doc_status` and `published_at` to the return shape

Update `findAll` (public): replace `status` string filter with `doc_status` integer.
Update `create`: replace `status` with `doc_status: 0`.

---

## Step 6 — Frontend Packages

Install in `frontend/`:
```
npm install @editorjs/editorjs @editorjs/header @editorjs/list @editorjs/quote @editorjs/image @editorjs/embed
```

---

## Step 7 — EditorJS Wrapper Component

**New file: `frontend/src/components/editor/EditorBlock.tsx`**

Key implementation notes:
- `'use client'` directive
- `forwardRef<EditorBlockRef, Props>` — exposes `save(): Promise<OutputData>` method
- All tool imports done async inside `useEffect` via `Promise.all([ import(...), ... ])` — prevents SSR issues and reduces initial bundle
- EditorJS image tool uses a **custom `uploadByFile` function** (not `additionalRequestHeaders`) so the JWT token is read fresh from `localStorage` on each upload:

```typescript
uploader: {
  uploadByFile: async (file: File) => {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return res.json(); // { success: 1, file: { url } }
  },
},
```

- `@editorjs/embed` for YouTube/Vimeo (URL-based, no upload)
- In any page that uses `EditorBlock`, import with `dynamic(..., { ssr: false })`

---

## Step 8 — Frontend Types (`frontend/src/types/index.ts`)

```typescript
// Replace: status: 'draft' | 'published' | 'archived'
// With:
doc_status: 0 | 1 | 2;

export const DOC_STATUS_LABEL: Record<0 | 1 | 2, string> = {
  0: 'Draft', 1: 'Published', 2: 'Archived',
};
export const DOC_STATUS_COLORS: Record<0 | 1 | 2, string> = {
  0: 'bg-gray-700 text-gray-400',
  1: 'bg-green-500/20 text-green-400',
  2: 'bg-yellow-500/20 text-yellow-400',
};
```

---

## Step 9 — API Client & Redux Slice

**`frontend/src/services/api.ts`** — add:
```typescript
export const postsApi = {
  getAll:       (params?) => api.get('/posts', { params }),
  getById:      (id)      => api.get(`/posts/${id}`),
  create:       (data)    => api.post('/posts', data),
  update:       (id, data)=> api.put(`/posts/${id}`, data),
  updateStatus: (id, doc_status) => api.patch(`/posts/${id}/status`, { doc_status }),
  remove:       (id)      => api.delete(`/posts/${id}`),
};
```

**New file: `frontend/src/store/slices/postsSlice.ts`**

State shape:
```typescript
{ posts: Article[]; pagination: Pagination | null; currentPost: Article | null;
  loading: boolean; saving: boolean; error: string | null }
```

Async thunks: `fetchPosts`, `fetchPost`, `createPost`, `updatePost`, `changePostStatus`

Register in `frontend/src/store/index.ts`: `posts: postsReducer`

---

## Step 10 — Dashboard Layout & Pages

### Layout: `frontend/src/app/dashboard/layout.tsx`

- Guards: `user.role === 'user'` → redirect `/`; `!user` → redirect `/auth/login`
- Sidebar links: "My Posts" `/dashboard/posts`, "New Post" `/dashboard/posts/new`
- Admin-only link: "Admin Panel" → `/admin`
- Pattern mirrors existing `frontend/src/app/admin/layout.tsx`

### Posts List: `frontend/src/app/dashboard/posts/page.tsx`

- Fetches from `/api/posts` via `fetchPosts` thunk
- Shows status badges using `DOC_STATUS_LABEL` + `DOC_STATUS_COLORS`
- **Published posts**: show "Archive & Edit" button (archives first, then navigates to edit)
- **Draft/Archived posts**: show direct "Edit" button → `/dashboard/posts/[id]/edit`

```typescript
const handleArchiveAndEdit = async (id: string) => {
  await postsApi.updateStatus(id, 2);  // archive
  router.push(`/dashboard/posts/${id}/edit`);
};
```

### New Post: `frontend/src/app/dashboard/posts/new/page.tsx`

- Fields: title, summary, thumbnail URL, category select, is_featured toggle, stock tags
- `EditorBlock` (dynamic imported, `ssr: false`) with `ref`
- On submit: `editorRef.current.save()` → serialize to JSON string → dispatch `createPost`
- Always creates as draft (`doc_status: 0`) — publish happens on the edit page

### Edit Post: `frontend/src/app/dashboard/posts/[id]/edit/page.tsx`

- Fetches post on mount; parses `content` JSON string to `OutputData` for `EditorBlock`
- Guard: if `doc_status === 1` (published), shows warning banner + disabled editor
- Status action bar above editor:
  - `doc_status: 0` → "Publish" button → `changePostStatus(id, 1)`
  - `doc_status: 2` → "Republish" + "Revert to Draft" buttons
- "Save" button: calls `editorRef.current.save()` → dispatch `updatePost`

---

## Step 11 — Update Existing Admin Posts Pages

**`frontend/src/app/admin/posts/page.tsx`**:
- Replace all `a.status === 'published'` → `a.doc_status === 1`
- Replace status select `<option>` values with integers (`"0"`, `"1"`, `"2"`)
- Use `postsApi.updateStatus(id, parseInt(val) as 0|1|2)` instead of `newsApi.update`
- Use `DOC_STATUS_COLORS` for badges

**`frontend/src/app/admin/posts/[id]/page.tsx`**:
- Replace `status` state with `docStatus: 0 | 1 | 2`
- Show warning if `docStatus === 1` (published) and disable the save button
- Separate content save (`postsApi.update`) from status change (`postsApi.updateStatus`)

---

## Step 12 — Security Notes

1. **Upload MIME check**: The allowlist in `uploadController.ts` is a first-pass filter. For production, use the `file-type` npm package to inspect the buffer's magic bytes (clients can spoof `Content-Type`)
2. **Status machine is server-side only**: Frontend buttons are UX. The service-layer transition check runs unconditionally on every `PATCH /api/posts/:id/status`
3. **Ownership is layered**: `assertOwnerOrAdmin` runs on every mutation. The editor scoping in `listPosts` is secondary UX
4. **Legacy `/api/news` PUT route**: Does not enforce the status machine. Consider restricting to `authorize('admin')` to prevent bypassing the new flow

---

## Verification

Run in order:

```bash
# 1. Migrate DB
psql -d thanhdangbullish -f backend/src/db/migrations/002_doc_status.sql
psql -d thanhdangbullish -c "SELECT id, title, doc_status FROM news LIMIT 5;"

# 2. Start backend and test status machine
# Create post → doc_status should be 0
# Publish (0→1) → should succeed
# Edit while published → should return 422
# Try (1→0) transition → should fail with "Invalid status transition"
# Archive (1→2) → should succeed
# Edit while archived → should succeed

# 3. Test upload endpoint
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@test.jpg"
# Expect: { "success": 1, "file": { "url": "https://..." } }

# 4. Frontend: log in as editor, navigate to /dashboard/posts
# Verify: only own posts shown, status badges correct
# Create new post, upload image in EditorJS, publish
# Verify published post shows "Archive & Edit" button
# Click Archive & Edit, verify edit page opens in archived state
```
