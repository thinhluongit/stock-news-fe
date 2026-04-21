# Admin Control Panel — ThanhDangBullish

## Context
The app has a 3-tier role system (`user | editor | admin`) but no admin-facing UI exists yet. Admins need a dedicated panel to manage users (view, edit role/status, disable — but not other admins), news posts (full CRUD + status/featured toggles), categories, and stocks. The backend already has most CRUD endpoints; gaps are user management routes and stock deletion. The frontend needs a completely new `/admin/*` route tree with its own layout, an auth guard, and a Redux slice for admin state.

---

## Scope: What gets built

### Backend (6 files changed / created)
| File | Change |
|------|--------|
| `backend/src/repositories/userRepository.ts` | Add `findAll`, `adminUpdate`, `deleteById` |
| `backend/src/services/adminService.ts` | **New** — user management + dashboard stats |
| `backend/src/controllers/adminController.ts` | **New** — HTTP handlers |
| `backend/src/routes/admin.ts` | **New** — all routes behind `authorize('admin')` |
| `backend/src/routes/stocks.ts` | Add `DELETE /:symbol` |
| `backend/src/app.ts` | Mount `/api/admin` |

### Frontend (13 files changed / created)
| File | Change |
|------|--------|
| `frontend/src/types/index.ts` | Add `AdminUser`, `AdminStats` types |
| `frontend/src/services/api.ts` | Add `adminApi`, add `stockApi.remove` |
| `frontend/src/store/slices/adminSlice.ts` | **New** Redux slice |
| `frontend/src/app/admin/layout.tsx` | **New** admin shell with auth guard + sidebar |
| `frontend/src/app/admin/page.tsx` | **New** dashboard (stats + recent items) |
| `frontend/src/app/admin/users/page.tsx` | **New** users list |
| `frontend/src/app/admin/users/[id]/page.tsx` | **New** user edit |
| `frontend/src/app/admin/posts/page.tsx` | **New** posts list |
| `frontend/src/app/admin/posts/[id]/page.tsx` | **New** post edit |
| `frontend/src/app/admin/categories/page.tsx` | **New** category management |
| `frontend/src/app/admin/stocks/page.tsx` | **New** stock management |
| `frontend/src/i18n/locales/en.json` | Add `admin` namespace |
| `frontend/src/i18n/locales/vi.json` | Add `admin` namespace |

---

## Backend Implementation

### Step 1 — Extend `userRepository.ts`

Add three methods to the existing `userRepository` object:

```ts
// List all users with pagination + optional search and role filter
async findAll(params: { page: number; limit: number; search?: string; role?: string })
  : Promise<{ rows: DBUser[]; total: number }>

// Admin-level update (role, is_active, full_name, email)
async adminUpdate(id: string, data: {
  full_name?: string; email?: string;
  role?: 'user' | 'editor' | 'admin'; is_active?: boolean;
}): Promise<AuthUser | null>

// Hard delete
async deleteById(id: string): Promise<void>
```

SQL patterns follow existing `query()` helper from `src/config/database.ts`.

---

### Step 2 — Create `src/services/adminService.ts`

```ts
export const adminService = {
  listUsers(params)              // calls userRepository.findAll
  getUserById(id)                // calls userRepository.findById
  updateUser(id, data, adminId)  // prevents changing own role; cannot edit other admins
  deleteUser(id, adminId)        // prevents self-deletion; cannot delete admins
  toggleStatus(id, adminId)      // prevents toggling own account
  getDashboardStats()            // COUNT queries on users/news/categories/stocks + SUM views
}
```

**Business rules enforced in service:**
- An admin cannot change their own role
- An admin cannot edit/delete/disable another `admin` account
- Self-deletion is blocked
- `getDashboardStats()` returns `{ users, articles, categories, stocks, totalViews }`

---

### Step 3 — Create `src/controllers/adminController.ts`

Handlers following existing controller pattern (validate → call service → respond):
- `listUsers` → `GET /admin/users`
- `getUser` → `GET /admin/users/:id`
- `updateUser` → `PATCH /admin/users/:id`
- `deleteUser` → `DELETE /admin/users/:id`
- `toggleStatus` → `PATCH /admin/users/:id/status`
- `getDashboardStats` → `GET /admin/stats`

---

### Step 4 — Create `src/routes/admin.ts`

```ts
router.use(authenticate, authorize('admin'))   // all routes require admin

router.get('/stats',               getDashboardStats)
router.get('/users',               listUsers)
router.get('/users/:id',           getUser)
router.patch('/users/:id',         updateUser)
router.delete('/users/:id',        deleteUser)
router.patch('/users/:id/status',  toggleStatus)
```

---

### Step 5 — Add stock deletion

`stockRepository.ts` → add `deleteBySymbol(symbol: string)`
`stockService.ts` → add `deleteStock(symbol: string)` (check exists first with AppError 404)
`stockController.ts` → add `remove` handler
`routes/stocks.ts` → add `router.delete('/:symbol', authenticate, authorize('admin'), remove)`

---

### Step 6 — Mount in `src/app.ts`

```ts
import adminRouter from './routes/admin';
app.use('/api/admin', adminRouter);
```

---

## Frontend Implementation

### Step 7 — Add types to `src/types/index.ts`

```ts
export interface AdminUser {
  id: string; email: string; full_name: string;
  role: 'user' | 'editor' | 'admin';
  is_active: boolean; avatar_url?: string; created_at: string;
}
export interface AdminStats {
  users: number; articles: number; categories: number;
  stocks: number; totalViews: number;
}
```

---

### Step 8 — Extend `src/services/api.ts`

```ts
export const adminApi = {
  getStats:      ()                                 => api.get('/admin/stats'),
  getUsers:      (params?: Record<string, unknown>) => api.get('/admin/users', { params }),
  getUser:       (id: string)                       => api.get(`/admin/users/${id}`),
  updateUser:    (id: string, data: unknown)        => api.patch(`/admin/users/${id}`, data),
  deleteUser:    (id: string)                       => api.delete(`/admin/users/${id}`),
  toggleStatus:  (id: string)                       => api.patch(`/admin/users/${id}/status`),
};
// also add to stockApi:
remove: (symbol: string) => api.delete(`/stocks/${symbol}`),
```

---

### Step 9 — Create `src/store/slices/adminSlice.ts`

State shape:
```ts
{
  users: AdminUser[];
  currentUser: AdminUser | null;
  stats: AdminStats | null;
  pagination: Pagination | null;
  loading: boolean;
  error: string | null;
}
```

AsyncThunks (follow pattern from existing slices — `createAsyncThunk` + `api.ts` call):
- `fetchAdminStats` → `adminApi.getStats()`
- `fetchAdminUsers(params)` → `adminApi.getUsers(params)`
- `fetchAdminUser(id)` → `adminApi.getUser(id)`
- `updateAdminUser(id, data)` → `adminApi.updateUser(id, data)`
- `deleteAdminUser(id)` → `adminApi.deleteUser(id)`
- `toggleAdminUserStatus(id)` → `adminApi.toggleStatus(id)`

---

### Step 10 — Admin Layout (`src/app/admin/layout.tsx`)

`'use client'` component. Wraps all `/admin/*` pages.

**Auth guard via `useEffect`:**
```ts
useEffect(() => {
  if (initialized && (!user || user.role !== 'admin')) {
    router.replace(user ? '/' : '/auth/login');
  }
}, [initialized, user]);
```

**Layout structure:**
```
┌──────────────────────────────────────────┐
│  Header bar: logo + "Admin Panel" + user │
├────────────┬─────────────────────────────┤
│  Sidebar   │  <children>                 │
│  Dashboard │                             │
│  Users     │                             │
│  Posts     │                             │
│  Categories│                             │
│  Stocks    │                             │
│  ─────     │                             │
│  ← Site    │                             │
└────────────┴─────────────────────────────┘
```

Sidebar uses `usePathname()` to highlight active link. "← Site" link goes to `/`.

---

### Step 11 — Dashboard (`src/app/admin/page.tsx`)

Dispatches `fetchAdminStats` + `fetchAdminUsers({limit:5})` + `fetchNews({limit:5, status:'all'})` on mount.

**UI:**
- Row of 5 `StatsCard` components: Users, Articles, Categories, Stocks, Total Views
- Two side-by-side tables: "Recent Users" (last 5) + "Recent Posts" (last 5)
- Each row has a link to the full admin section for that resource

---

### Step 12 — Users Page (`src/app/admin/users/page.tsx`)

**Table columns:** Name · Email · Role · Status · Joined · Actions

**Controls above table:**
- Search input (debounced, updates `?search=` query param)
- Role filter dropdown: All / User / Editor

**Actions per row:**
- **Edit** → navigates to `/admin/users/[id]`
- **Disable / Enable** → calls `toggleAdminUserStatus`, shows `is_active` as a pill badge
- **Delete** → `ConfirmDialog` before `deleteAdminUser`

Rows where `role === 'admin'` show a lock icon and no action buttons (admins are read-only).

---

### Step 13 — User Edit (`src/app/admin/users/[id]/page.tsx`)

Form fields:
- `full_name` — text input
- `email` — read-only display
- `role` — `<select>`: user / editor (admin option disabled)
- `is_active` — toggle switch

Buttons: **Save changes** (calls `updateAdminUser`) · **Delete account** (ConfirmDialog → `deleteAdminUser` → redirect to `/admin/users`)

If the user being edited has `role === 'admin'`, show a banner "Admin accounts cannot be modified" and disable the form.

---

### Step 14 — Posts Page (`src/app/admin/posts/page.tsx`)

Reuses `newsApi.getAll` (already in `api.ts`) — passes `status=all` to show drafts and archived.

**Table columns:** Title · Author · Category · Status · Featured · Views · Date · Actions

**Controls:** Search · Status filter (All / Draft / Published / Archived)

**Actions per row:**
- **Edit** → `/admin/posts/[id]`
- **Toggle featured** → `newsApi.update(id, { is_featured: !current })`
- **Status change** → inline dropdown (Draft / Published / Archived)
- **Delete** → ConfirmDialog → `newsApi.remove(id)`

---

### Step 15 — Post Edit (`src/app/admin/posts/[id]/page.tsx`)

Form fields:
- `title` — text input
- `summary` — textarea (3 rows)
- `content` — textarea (10 rows)
- `thumbnail_url` — text input
- `category_id` — `<select>` populated from `fetchCategories`
- `status` — `<select>`: draft / published / archived
- `is_featured` — checkbox toggle

**Save** → `newsApi.update(id, data)`. **Delete** → ConfirmDialog → `newsApi.remove` → redirect.

---

### Step 16 — Categories Page (`src/app/admin/categories/page.tsx`)

Inline approach (no separate edit page — categories are simple):

**Table columns:** Name · Slug · Color · Article count · Actions (Edit inline / Delete)

**"Add new category" form** at top:
- `name` (auto-generates slug via slugify client-side for preview)
- `description`
- `color` — `<input type="color">`

Uses `categoryApi` from `api.ts`.

---

### Step 17 — Stocks Page (`src/app/admin/stocks/page.tsx`)

**Table columns:** Symbol · Company · Exchange · Sector · Price · Change% · Actions

**"Add stock" form** at top: symbol, company_name, exchange, sector, current_price

**Actions per row:**
- **Update price** → inline price input + confirm
- **Delete** → ConfirmDialog → `stockApi.remove(symbol)` (new endpoint)

---

### Step 18 — i18n — add `admin` namespace

Add to both `en.json` and `vi.json`:

```json
"admin": {
  "dashboard": "Dashboard",
  "users": "Users",
  "posts": "Posts",
  "categories": "Categories",
  "stocks": "Stocks",
  "back_to_site": "← Back to site",
  "stats": { "users": "Total Users", "articles": "Articles", "categories": "Categories", "stocks": "Stocks", "total_views": "Total Views" },
  "user": { "role": "Role", "status": "Status", "active": "Active", "inactive": "Inactive", "joined": "Joined", "admin_readonly": "Admin accounts cannot be modified" },
  "post": { "status_draft": "Draft", "status_published": "Published", "status_archived": "Archived", "featured": "Featured" },
  "actions": { "edit": "Edit", "delete": "Delete", "save": "Save changes", "cancel": "Cancel", "enable": "Enable", "disable": "Disable", "confirm_delete": "Are you sure? This action cannot be undone." }
}
```

---

## Shared Admin Components (defined inline, reused across admin pages)

- **`StatsCard`** — card with icon, label, number; defined in `admin/page.tsx`
- **`ConfirmDialog`** — modal overlay with confirm/cancel
- **`StatusBadge`** — coloured pill: `draft`=gray, `published`=green, `archived`=yellow, `active`=green, `inactive`=red

---

## Verification

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Log in as an admin account
4. Navigate to `/admin` — dashboard shows stat counts
5. `/admin/users` — lists all non-admin users with disable/delete actions; admin rows show lock icon
6. Edit a user's role `user` → `editor` — verify change persists
7. Disable a user — verify `is_active` toggles
8. Access `/admin` while logged in as `user` role — redirects to `/`
9. Access `/admin` while unauthenticated — redirects to `/auth/login`
10. `/admin/posts` — drafts and archived posts visible (status=all)
11. `/admin/categories` — create, edit inline, delete a category
12. `/admin/stocks` — create a stock, update price, delete it
13. Language switcher works inside admin panel
