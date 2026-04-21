# Admin Control Panel — Implementation Report

**Project:** ThanhDangBullish  
**Date:** 2026-04-15  
**Scope:** Full-stack admin panel for user, post, category, and stock management

---

## Overview

The application already had a 3-tier role system (`user | editor | admin`) but no admin-facing UI. This implementation adds a complete `/admin/*` route tree with its own layout, authentication guard, and all CRUD management pages. The backend was extended with user management endpoints and stock deletion. The frontend received a new Redux slice, API layer additions, and 7 new pages.

**Files changed / created:**

| Layer | File | Change |
|-------|------|--------|
| Backend | `repositories/userRepository.ts` | Added `findAll`, `adminUpdate`, `deleteById` |
| Backend | `repositories/stockRepository.ts` | Added `deleteBySymbol` |
| Backend | `services/adminService.ts` | **New** — business logic + dashboard stats |
| Backend | `controllers/adminController.ts` | **New** — HTTP handlers |
| Backend | `routes/admin.ts` | **New** — protected route group |
| Backend | `routes/stocks.ts` | Added `DELETE /:symbol` |
| Backend | `app.ts` | Mounted `/api/admin` |
| Frontend | `types/index.ts` | Added `AdminUser`, `AdminStats` |
| Frontend | `services/api.ts` | Added `adminApi`, `stockApi.remove` |
| Frontend | `store/slices/adminSlice.ts` | **New** Redux slice |
| Frontend | `store/index.ts` | Registered `adminReducer` |
| Frontend | `app/admin/layout.tsx` | **New** — shell + auth guard |
| Frontend | `app/admin/page.tsx` | **New** — dashboard |
| Frontend | `app/admin/users/page.tsx` | **New** — users list |
| Frontend | `app/admin/users/[id]/page.tsx` | **New** — user edit |
| Frontend | `app/admin/posts/page.tsx` | **New** — posts list |
| Frontend | `app/admin/posts/[id]/page.tsx` | **New** — post edit |
| Frontend | `app/admin/categories/page.tsx` | **New** — category management |
| Frontend | `app/admin/stocks/page.tsx` | **New** — stock management |
| Frontend | `i18n/locales/en.json` + `vi.json` | Added `admin` namespace |

---

## Step 1 — Extend `userRepository.ts`

**Why:** The existing repository only handled single-user lookups for authentication. Admin needs to list all users with filtering, update any field (including role and active status), and hard-delete accounts.

**Three methods were added:**

### `findAll` — paginated list with search and role filter

```ts
async findAll(params: { page: number; limit: number; search?: string; role?: string })
  : Promise<{ rows: Omit<DBUser, 'password_hash'>[]; total: number }> {

  const offset = (params.page - 1) * params.limit;
  const conditions: string[] = [];
  const qp: unknown[] = [];

  if (params.search) {
    qp.push(`%${params.search}%`);
    conditions.push(`(full_name ILIKE $${qp.length} OR email ILIKE $${qp.length})`);
  }
  if (params.role) {
    qp.push(params.role);
    conditions.push(`role = $${qp.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Two queries: total count (for pagination math) + data rows
  const countResult = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM users ${where}`, qp
  );
  const total = countResult.rows[0]?.total ?? 0;

  qp.push(params.limit, offset);
  const dataResult = await query<Omit<DBUser, 'password_hash'>>(
    `SELECT id, email, full_name, role, is_active, avatar_url, created_at
     FROM users ${where}
     ORDER BY created_at DESC
     LIMIT $${qp.length - 1} OFFSET $${qp.length}`,
    qp
  );
  return { rows: dataResult.rows, total };
}
```

**Effect:** The `ILIKE` operator enables case-insensitive partial matching for search. `COUNT(*)::int` casts the Postgres `bigint` result to a plain JS number. The same `qp` array is reused for both queries — filter params are pushed first, then `limit`/`offset` are appended at the end so their `$N` placeholders always stay at the right positions.

### `adminUpdate` — partial update with `COALESCE`

```ts
async adminUpdate(id: string, data: {
  full_name?: string; email?: string;
  role?: AuthUser['role']; is_active?: boolean;
}): Promise<AuthUser | null> {
  const result = await query<AuthUser>(
    `UPDATE users
     SET full_name  = COALESCE($1, full_name),
         email      = COALESCE($2, email),
         role       = COALESCE($3, role),
         is_active  = COALESCE($4, is_active),
         updated_at = NOW()
     WHERE id = $5
     RETURNING id, email, full_name, role, is_active, avatar_url, created_at`,
    [data.full_name ?? null, data.email ?? null, data.role ?? null, data.is_active ?? null, id]
  );
  return result.rows[0] ?? null;
}
```

**Effect:** `COALESCE($N, column)` means "use the new value if provided, otherwise keep the existing value." Passing `null` for a field leaves that column unchanged. This avoids building dynamic `SET` clauses and lets the caller send partial updates safely.

### `deleteById` — hard delete

```ts
async deleteById(id: string): Promise<void> {
  await query('DELETE FROM users WHERE id = $1', [id]);
}
```

**Effect:** Permanently removes the user row from the database. The service layer is responsible for checking that the target is not an admin before this is called.

---

## Step 2 — Add `deleteBySymbol` to `stockRepository.ts`

**Why:** The existing stock repository had no delete method. Admin needs to remove stocks from the database.

```ts
async deleteBySymbol(symbol: string): Promise<void> {
  await query('DELETE FROM stocks WHERE symbol = $1', [symbol]);
}
```

**Effect:** Deletes a stock by its ticker symbol (the natural key for stocks, e.g. `AAPL`). The service layer checks for existence before calling this.

---

## Step 3 — Create `adminService.ts`

**Why:** Business rules for admin operations are complex and must not live in the controller. The service layer enforces safety invariants regardless of which endpoint calls it.

**Key business rules enforced:**

| Situation | Rule |
|-----------|------|
| Admin tries to change their own role or active status | → 400 error |
| Admin tries to edit/delete/disable another admin | → 403 error |
| Admin tries to promote a user to admin role | → 403 error |
| Admin tries to delete their own account | → 400 error |

```ts
async updateUser(id, data, adminId) {
  // Cannot touch own role/status
  if (id === adminId && (data.role !== undefined || data.is_active !== undefined)) {
    throw new AppError(400, 'Cannot change your own role or status');
  }
  const target = await userRepository.findById(id);
  if (!target) throw new AppError(404, 'User not found');
  // Cannot edit another admin
  if (target.role === 'admin' && id !== adminId) {
    throw new AppError(403, 'Cannot modify another admin account');
  }
  // Cannot promote to admin
  if (data.role === 'admin') {
    throw new AppError(403, 'Cannot promote users to admin via this endpoint');
  }
  return userRepository.adminUpdate(id, data);
}
```

**Dashboard stats** are gathered in a single SQL query using correlated subqueries — one round-trip to the database instead of five:

```ts
async getDashboardStats() {
  const result = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM users)      AS users,
      (SELECT COUNT(*)::int FROM news)       AS articles,
      (SELECT COUNT(*)::int FROM categories) AS categories,
      (SELECT COUNT(*)::int FROM stocks)     AS stocks,
      (SELECT COALESCE(SUM(views), 0)::int FROM news) AS "totalViews"
  `);
  return result.rows[0];
}
```

**Effect:** `COALESCE(SUM(views), 0)` ensures the total views field returns `0` rather than `NULL` when the news table is empty. The `"totalViews"` alias with quotes preserves camelCase for the JavaScript consumer.

---

## Step 4 — Create `adminController.ts`

**Why:** Controllers are thin — they extract parameters from the request, call the service, and shape the response. All business logic lives in the service.

```ts
export const updateUser = async (req, res, next) => {
  try {
    const updated = await adminService.updateUser(
      String(req.params.id),
      req.body,
      (req.user as AuthUser).id,   // adminId from JWT middleware
    );
    res.json({ data: updated });
  } catch (err) { next(err); }
};

export const deleteUser = async (req, res, next) => {
  try {
    await adminService.deleteUser(String(req.params.id), (req.user as AuthUser).id);
    res.status(204).send();   // No content — nothing to return after deletion
  } catch (err) { next(err); }
};
```

**Effect:** `req.user` is set by the `authenticate` middleware and typed as `AuthUser`. The controller passes `req.user.id` as `adminId` to the service so business rules can compare the operator against the target. Delete returns `204 No Content` following REST convention.

---

## Step 5 — Create `routes/admin.ts`

**Why:** All admin endpoints must require both authentication (valid JWT) and admin role authorization. Applying middleware at the router level ensures no handler can accidentally be left unprotected.

```ts
const router = Router();

// Applied to EVERY route in this file
router.use(authenticate, authorize('admin'));

router.get('/stats',              getDashboardStats);
router.get('/users',              listUsers);
router.get('/users/:id',          getUser);
router.patch('/users/:id',        updateUser);
router.delete('/users/:id',       deleteUser);
router.patch('/users/:id/status', toggleStatus);

export default router;
```

**Effect:** `router.use(authenticate, authorize('admin'))` runs before any handler. Any request with a missing/invalid token returns 401. Any request from a non-admin user returns 403. The `/status` sub-route is a separate `PATCH` endpoint rather than overloading the main update endpoint, keeping the toggle operation atomic and semantically clear.

---

## Step 6 — Add stock deletion + mount admin router

**`routes/stocks.ts`** — Added delete route, placed after `/:symbol/news` to prevent routing conflicts:

```ts
router.get('/',              getAll);
router.get('/:symbol/news',  getStockNews);   // must come before /:symbol
router.get('/:symbol',       getBySymbol);
router.post('/',             authenticate, authorize('admin'), create);
router.patch('/:symbol/price', authenticate, authorize('admin'), updatePrice);
router.delete('/:symbol',    authenticate, authorize('admin'), remove);
```

**Effect:** Without the ordering fix, `GET /stocks/AAPL/news` would match the `/:symbol` handler before reaching `/:symbol/news`, returning a stock object instead of news. Express matches routes in declaration order, so more specific paths must be declared first.

**`app.ts`** — Mounted the admin router:

```ts
app.use('/api/admin', adminRoutes);
```

**Effect:** All admin routes become accessible at `/api/admin/*`. The router's internal `router.use(authenticate, authorize('admin'))` applies to every sub-route automatically.

---

## Step 7 — Add types to `types/index.ts`

**Why:** TypeScript needs explicit interfaces for the new admin-specific data shapes. `AdminUser` is separate from `User` because it includes `is_active` as a required field (not optional) and always has `created_at`.

```ts
export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'editor' | 'admin';
  is_active: boolean;        // required — admin always needs the active state
  avatar_url?: string;
  created_at: string;        // required — shown in the users table
}

export interface AdminStats {
  users: number;
  articles: number;
  categories: number;
  stocks: number;
  totalViews: number;
}
```

**Effect:** These types are used by the Redux slice, API layer, and all admin page components. TypeScript enforces the shape at compile time, preventing property access bugs.

---

## Step 8 — Extend `services/api.ts`

**Why:** The frontend communicates with the backend exclusively through the API service layer. Admin operations need their own namespace, and stock deletion needed to be added to the existing stock API.

```ts
// Added to stockApi:
remove: (symbol: string) => api.delete(`/stocks/${symbol}`),

// New namespace:
export const adminApi = {
  getStats:     ()                                 => api.get('/admin/stats'),
  getUsers:     (params?: Record<string, unknown>) => api.get('/admin/users', { params }),
  getUser:      (id: string)                       => api.get(`/admin/users/${id}`),
  updateUser:   (id: string, data: unknown)        => api.patch(`/admin/users/${id}`, data),
  deleteUser:   (id: string)                       => api.delete(`/admin/users/${id}`),
  toggleStatus: (id: string)                       => api.patch(`/admin/users/${id}/status`),
};
```

**Effect:** The axios instance `api` already has the JWT interceptor attached — any call through these methods automatically includes the `Authorization: Bearer <token>` header. The `params` object for `getUsers` is passed as query string parameters by axios, supporting `?page=1&limit=20&search=john&role=editor`.

---

## Step 9 — Create `store/slices/adminSlice.ts`

**Why:** Admin state needs to be isolated from the news and stock slices. The admin slice manages users list, currently-viewed user, dashboard stats, pagination, and async operation state.

**State shape:**
```ts
interface AdminState {
  users: AdminUser[];
  currentUser: AdminUser | null;
  stats: AdminStats | null;
  pagination: Pagination | null;
  loading: boolean;
  error: string | null;
}
```

**Six async thunks following the `createAsyncThunk` pattern:**

```ts
export const fetchAdminUsers = createAsyncThunk<
  { data: AdminUser[]; pagination: Pagination },
  Record<string, unknown> | undefined,
  { rejectValue: string }
>(
  'admin/fetchUsers',
  async (params, { rejectWithValue }) => {
    try {
      const res = await adminApi.getUsers(params);
      return res.data as { data: AdminUser[]; pagination: Pagination };
    } catch (err) {
      return rejectWithValue(extractError(err, 'Failed to fetch users'));
    }
  }
);
```

**Effect of `toggleAdminUserStatus` reducer case:**

```ts
.addCase(toggleAdminUserStatus.fulfilled, (state, action) => {
  // Update the user in the list in-place — no refetch needed
  state.users = state.users.map((u) =>
    u.id === action.payload.id ? action.payload : u
  );
  // Also update currentUser if it's the same person
  if (state.currentUser?.id === action.payload.id) {
    state.currentUser = action.payload;
  }
})
```

**Effect:** The toggle result is the updated user returned by the server. Replacing the entry in the `users` array means the UI updates immediately without a full page refetch. The `currentUser` sync ensures the edit page stays consistent if both pages are mounted.

---

## Step 10 — Admin Layout (`app/admin/layout.tsx`)

**Why:** Every admin page needs the same shell (sidebar + top bar) and auth guard. Putting this in a Next.js layout component means it wraps all child routes automatically, and the guard runs once rather than being duplicated in each page.

**Auth guard pattern:**

```ts
const { user, initialized } = useAppSelector((s) => s.auth);

useEffect(() => {
  if (!initialized) return;                         // still loading auth state
  if (!user) { router.replace('/auth/login'); return; }
  if (user.role !== 'admin') { router.replace('/'); }
}, [initialized, user, router]);

// Block render until verified — shows spinner during check
if (!initialized || !user || user.role !== 'admin') {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-green-400" size={32} />
    </div>
  );
}
```

**Effect:** On initial load, `initialized` is `false` until the `checkAuth` thunk completes. Returning early prevents a flash-redirect before auth state is known. Once initialized, unauthenticated users go to `/auth/login` and non-admins go to `/`. The spinner prevents any admin UI from briefly rendering before the redirect.

**Active link detection:**

```ts
const isActive = (href: string) =>
  href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
```

**Effect:** The exact match for `/admin` prevents the Dashboard link from staying highlighted when navigating to `/admin/users`. All other links use `startsWith` so child routes (e.g. `/admin/users/abc123`) keep the parent nav item highlighted.

---

## Step 11 — Dashboard (`app/admin/page.tsx`)

**Why:** The dashboard gives a quick overview of the system's state. It reuses the existing `fetchNews` thunk (with `status: 'all'` to include drafts) alongside the new admin thunks.

**Stats cards dispatched on mount:**

```ts
useEffect(() => {
  dispatch(fetchAdminStats());
  dispatch(fetchAdminUsers({ limit: 5 }));
  dispatch(fetchNews({ limit: 5, status: 'all' }));
}, [dispatch]);
```

**`StatsCard` component (defined inline):**

```tsx
function StatsCard({ label, value, icon: Icon, color }: {
  label: string; value: number | undefined; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">
        {value !== undefined ? value.toLocaleString() : '—'}
      </p>
    </div>
  );
}
```

**Effect:** `value !== undefined ? value.toLocaleString() : '—'` renders an em dash while stats are loading (since `stats` is `null` until the API responds), then switches to a locale-formatted number. `toLocaleString()` adds thousands separators automatically (e.g. `1,234,567`).

---

## Step 12 — Users List (`app/admin/users/page.tsx`)

**Why:** The primary management page for users. Needs live search, role filtering, pagination, and per-row actions.

**Debounced search — avoids firing an API call on every keystroke:**

```ts
const [search, setSearch]             = useState('');
const [searchDebounce, setSearchDebounce] = useState('');

useEffect(() => {
  const timer = setTimeout(() => setSearchDebounce(search), 400);
  return () => clearTimeout(timer);
}, [search]);

const load = useCallback(() => {
  dispatch(fetchAdminUsers({
    page,
    limit: 20,
    search: searchDebounce || undefined,
    role: role || undefined,
  }));
}, [dispatch, page, searchDebounce, role]);

useEffect(() => { load(); }, [load]);

// Reset page when filters change to avoid showing page 5 of 1
useEffect(() => { setPage(1); }, [searchDebounce, role]);
```

**Effect:** The 400ms debounce window means the API is called at most once per typing pause, not once per character. Using `useCallback` with explicit dependencies means `load` only recreates when those dependencies actually change, preventing infinite render loops in the `useEffect` that calls it.

**Admin row protection:**

```tsx
{u.role === 'admin' ? (
  <div className="flex justify-end">
    <Lock size={14} className="text-gray-600" title={t('admin.user.admin_readonly')} />
  </div>
) : (
  <div className="flex items-center justify-end gap-2">
    <button onClick={() => router.push(`/admin/users/${u.id}`)}>
      <Pencil size={14} />
    </button>
    <button onClick={() => handleToggle(u.id)}>
      {u.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
    </button>
    <button onClick={() => setDeleteId(u.id)}>
      <Trash2 size={14} />
    </button>
  </div>
)}
```

**Effect:** Admin accounts show only a lock icon in the actions column — no edit, toggle, or delete buttons. This provides a visual hint to the operator and prevents accidental modifications, complementing the server-side enforcement in `adminService`.

---

## Step 13 — User Edit (`app/admin/users/[id]/page.tsx`)

**Why:** A dedicated edit page prevents inline editing sprawl in the list. It loads a single user by ID, populates a form, and allows role change, name edit, and active toggle — or shows a readonly banner for admin accounts.

**Admin-readonly banner:**

```tsx
const isAdmin = currentUser?.role === 'admin';

{isAdmin && (
  <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30
                  rounded-xl px-4 py-3 text-yellow-400 text-sm">
    <AlertTriangle size={16} className="flex-shrink-0" />
    {t('admin.user.admin_readonly')}
  </div>
)}
```

**Toggle switch (CSS-only, no library):**

```tsx
<button
  type="button"
  disabled={isAdmin}
  onClick={() => setIsActive((v) => !v)}
  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
    ${isActive ? 'bg-green-500' : 'bg-gray-600'}`}
>
  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
    ${isActive ? 'translate-x-6' : 'translate-x-1'}`}
  />
</button>
```

**Effect:** The thumb slides between `translate-x-1` (off) and `translate-x-6` (on) using a Tailwind transition — no external toggle library needed. The `disabled` prop on the button blocks interaction when viewing an admin account.

---

## Step 14 — Posts List (`app/admin/posts/page.tsx`)

**Why:** Editors and admins need to see all posts regardless of status (drafts, archived, published) and be able to change status or mark posts as featured without navigating away.

**Inline status change (dropdown in table cell):**

```tsx
<select
  value={a.status}
  onChange={(e) => handleStatusChange(a.id, e.target.value)}
  className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1
             text-xs text-white focus:outline-none focus:border-green-500"
>
  <option value="draft">{t('admin.post.status_draft')}</option>
  <option value="published">{t('admin.post.status_published')}</option>
  <option value="archived">{t('admin.post.status_archived')}</option>
</select>
```

```ts
const handleStatusChange = async (id: string, newStatus: string) => {
  await newsApi.update(id, { status: newStatus });
  load();   // refetch the list to reflect the change
};
```

**Featured star toggle:**

```tsx
<button onClick={() => handleToggleFeatured(a.id, !!a.is_featured)}>
  <Star size={14} fill={a.is_featured ? 'currentColor' : 'none'} />
</button>
```

**Effect:** The `fill` prop changes between `currentColor` (solid star = featured) and `none` (outline star = not featured). Both status change and featured toggle fire an API call then reload the list, keeping the table in sync with the server.

---

## Step 15 — Post Edit (`app/admin/posts/[id]/page.tsx`)

**Why:** Full editing of post content, metadata, category, and publish status in a single form. Categories are fetched from Redux and populated in a `<select>`.

**Fetching the article on mount:**

```ts
useEffect(() => {
  dispatch(fetchCategories());
  newsApi.getBySlug(id!)
    .then((res) => {
      const data = (res.data as { data: Article }).data;
      setTitle(data.title ?? '');
      setSummary(data.summary ?? '');
      setContent(data.content ?? '');
      setThumbnail(data.thumbnail_url ?? '');
      setCategoryId(data.category?.id ?? '');
      setStatus(data.status as 'draft' | 'published' | 'archived');
      setIsFeatured(!!data.is_featured);
    })
    .catch(() => setError(t('admin.error_load')))
    .finally(() => setFetching(false));
}, [id, dispatch, t]);
```

**Save handler:**

```ts
const handleSave = async () => {
  setSaving(true);
  setSaved(false);
  setError('');
  try {
    await newsApi.update(id!, {
      title, summary, content,
      thumbnail_url: thumbnail,
      category_id: categoryId || undefined,
      status,
      is_featured: isFeatured,
    });
    setSaved(true);
  } catch {
    setError(t('admin.error_load'));
  } finally {
    setSaving(false);
  }
};
```

**Effect:** Local component state (`title`, `summary`, etc.) is pre-populated from the fetched article. The save sends only what the form controls — not the full article object — letting the backend's `COALESCE` pattern handle fields the form doesn't touch. `category_id: categoryId || undefined` sends `undefined` (omitted from JSON) when no category is selected, rather than sending an empty string.

---

## Step 16 — Categories Page (`app/admin/categories/page.tsx`)

**Why:** Categories are simple enough that a separate edit page would be excessive. An inline edit pattern (row transforms into inputs on click) keeps the workflow compact.

**Client-side slug preview:**

```ts
function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // remove special chars
    .replace(/[\s_-]+/g, '-')   // replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '');   // trim leading/trailing hyphens
}
```

```tsx
{addName && (
  <p className="text-xs text-gray-500 mt-1">
    Slug: <span className="text-gray-400">{slugify(addName)}</span>
  </p>
)}
```

**Effect:** Shows the user what slug will be generated before they submit. The actual slug is generated server-side; this preview is for UX only.

**Inline edit row:**

```tsx
{editId === cat.id ? (
  <>
    <td colSpan={3}>
      <div className="flex flex-wrap gap-2">
        <input value={editName} onChange={(e) => setEditName(e.target.value)} ... />
        <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} ... />
        <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} ... />
      </div>
    </td>
    <td>{/* article count stays visible */}</td>
    <td>
      <button onClick={() => saveEdit(cat.id)}><Check /></button>
      <button onClick={cancelEdit}><X /></button>
    </td>
  </>
) : (
  <>
    {/* normal display row */}
  </>
)}
```

**Effect:** When `editId === cat.id`, the row for that category renders input fields instead of text. All other rows continue showing read-only values. Clicking the checkmark calls `categoryApi.update()` and reloads; clicking X simply clears `editId`.

---

## Step 17 — Stocks Page (`app/admin/stocks/page.tsx`)

**Why:** Stocks need to be created, have their prices updated frequently, and occasionally deleted. Inline price editing (click the price cell to edit) makes price updates as frictionless as possible.

**Inline price edit — clicking the price cell reveals an input:**

```tsx
{priceEditSymbol === s.symbol ? (
  <div className="flex items-center gap-1">
    <input
      type="number"
      value={priceEditValue}
      onChange={(e) => setPriceEditValue(e.target.value)}
      min="0" step="0.01" autoFocus
      className="w-24 bg-gray-800 border border-green-500 rounded px-2 py-1 text-xs text-white"
    />
    <button onClick={() => savePriceEdit(s.symbol)}>
      <Check size={12} />
    </button>
    <button onClick={() => setPriceEditSymbol(null)}>
      <X size={12} />
    </button>
  </div>
) : (
  <button onClick={() => startPriceEdit(s.symbol, s.current_price)}>
    {formatPrice(s.current_price)}
  </button>
)}
```

**Price save:**

```ts
const savePriceEdit = async (symbol: string) => {
  await stockApi.updatePrice(symbol, { current_price: parseFloat(priceEditValue) });
  setPriceEditSymbol(null);
  reload();
};
```

**Effect:** `autoFocus` places the cursor in the input immediately when it appears. `parseFloat` converts the string input to a number for the API. After saving, the edit field disappears and the list reloads to show the new price.

**Change% colour coding:**

```tsx
<span className={
  s.price_change_pct === undefined || s.price_change_pct === null
    ? 'text-gray-500'
    : s.price_change_pct >= 0 ? 'text-green-400' : 'text-red-400'
}>
  {formatChange(s.price_change_pct)}
</span>
```

**Effect:** Positive change is green, negative is red, absent data is grey. The explicit `=== null` check is necessary because Postgres returns `NULL` as `null` in JSON, not `undefined`.

---

## Step 18 — i18n: Add `admin` namespace to both locale files

**Why:** All visible strings in the admin panel go through the `t()` function from `LocaleContext` so the language toggle in the admin top bar works correctly.

**`en.json` additions (abridged):**

```json
"admin": {
  "panel": "Admin Panel",
  "dashboard": "Dashboard",
  "users": "Users",
  "posts": "Posts",
  "categories": "Categories",
  "stocks": "Stocks",
  "back_to_site": "← Back to site",
  "stats": {
    "users": "Total Users",
    "articles": "Total Articles",
    "categories": "Categories",
    "stocks": "Stocks",
    "total_views": "Total Views"
  },
  "user": {
    "name": "Name", "email": "Email", "role": "Role", "status": "Status",
    "joined": "Joined", "active": "Active", "inactive": "Inactive",
    "enable": "Enable", "disable": "Disable",
    "admin_readonly": "Admin accounts cannot be modified",
    "role_user": "User", "role_editor": "Editor", "role_admin": "Admin"
  },
  "post": {
    "title": "Title", "author": "Author", "category": "Category",
    "status": "Status", "featured": "Featured", "views": "Views", "date": "Date",
    "status_draft": "Draft", "status_published": "Published", "status_archived": "Archived",
    "yes": "Yes", "no": "No", "summary": "Summary", "content": "Content",
    "thumbnail": "Thumbnail URL", "is_featured": "Mark as Featured"
  },
  "category": {
    "name": "Name", "slug": "Slug", "color": "Color",
    "description": "Description", "article_count": "Articles", "add_new": "Add New Category"
  },
  "stock": {
    "symbol": "Symbol", "company": "Company", "exchange": "Exchange",
    "sector": "Sector", "price": "Price", "change": "Change%",
    "add_new": "Add New Stock", "update_price": "Update Price"
  },
  "actions": {
    "edit": "Edit", "delete": "Delete", "save": "Save changes",
    "cancel": "Cancel", "add": "Add", "update": "Update",
    "confirm_delete": "Are you sure? This action cannot be undone.",
    "view_all": "View all →"
  },
  "search_placeholder": "Search...",
  "all_roles": "All Roles", "all_statuses": "All Statuses",
  "no_users": "No users found.", "no_posts": "No posts found.",
  "no_categories": "No categories found.", "no_stocks": "No stocks found.",
  "save_success": "Saved successfully.",
  "delete_success": "Deleted successfully.",
  "error_load": "Failed to load data."
}
```

**Effect:** Vietnamese equivalents mirror the structure exactly. The language toggle button in the admin header (`EN` / `VI`) switches the locale stored in both React state and `localStorage`, so all admin labels re-render in the selected language instantly.

---

## Shared Design Decisions

### `ConfirmDialog` component

Defined locally in each page that needs it (users list, user edit, posts list, post edit, categories, stocks). A modal overlay with backdrop blur, a message string passed as a prop, and confirm/cancel buttons.

```tsx
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6
                      max-w-sm w-full mx-4 shadow-2xl">
        <p className="text-white text-sm mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onConfirm} className="... bg-red-600">Delete</button>
        </div>
      </div>
    </div>
  );
}
```

**Why inline:** Each page mounts the dialog conditionally based on its own state (e.g. `deleteId`). Sharing via a separate file would require either a context or prop-drilling. The component is small enough (< 20 lines) that repetition is preferable to abstraction.

### Responsive table columns

Tables use Tailwind responsive prefixes to hide less-critical columns on smaller screens:

```tsx
<th className="hidden md:table-cell">Email</th>     // hidden below 768px
<th className="hidden lg:table-cell">Joined</th>    // hidden below 1024px
<th className="hidden xl:table-cell">Views</th>     // hidden below 1280px
```

On mobile, the most important information (name, status, actions) remains visible. Less critical data appears progressively at wider breakpoints.

### Pagination pattern

Consistent across users and posts pages:

```tsx
const load = useCallback(() => {
  dispatch(fetchAdminUsers({ page, limit: 20, search: searchDebounce || undefined }));
}, [dispatch, page, searchDebounce, role]);

useEffect(() => { load(); }, [load]);          // refetch when load changes
useEffect(() => { setPage(1); }, [searchDebounce, role]);  // reset page on filter change
```

Resetting to page 1 when filters change prevents the jarring situation where a user searches for "alice", gets 1 result on page 1, then the page tries to show page 5 of the filtered results.

---

## Architecture Summary

```
User browser
     │
     ▼
Next.js /admin/* (App Router)
     │
     ├── layout.tsx       ← Auth guard + sidebar + header shell
     ├── page.tsx         ← Dashboard (stats + recent tables)
     ├── users/
     │   ├── page.tsx     ← List + search + filter + pagination
     │   └── [id]/page.tsx ← Edit form + delete
     ├── posts/
     │   ├── page.tsx     ← List + inline status/featured
     │   └── [id]/page.tsx ← Full post editor
     ├── categories/
     │   └── page.tsx     ← Add form + inline edit table
     └── stocks/
         └── page.tsx     ← Add form + inline price edit table
               │
               ▼ (via Redux + axios)
     Express /api/admin/* (all routes: authenticate + authorize('admin'))
               │
               ├── GET    /stats           ← getDashboardStats
               ├── GET    /users           ← listUsers (pagination + search + role filter)
               ├── GET    /users/:id       ← getUser
               ├── PATCH  /users/:id       ← updateUser (COALESCE partial update)
               ├── DELETE /users/:id       ← deleteUser
               └── PATCH  /users/:id/status ← toggleStatus
               │
               ▼ (and via existing routes, admin-protected)
     /api/stocks DELETE /:symbol
     /api/news   PUT /:id, DELETE /:id
     /api/categories PUT /:id, DELETE /:id
               │
               ▼
     PostgreSQL (users, news, categories, stocks tables)
```

---

## Verification Checklist

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Log in as an admin account
4. Navigate to `/admin` — dashboard shows stat counts and recent items
5. `/admin/users` — lists all users; admin rows show lock icon, no actions
6. Filter by role "Editor" — only editor accounts appear
7. Edit a user's role from `user` → `editor` — change persists after reload
8. Disable a user — status badge changes to "Inactive"
9. Log in as a `user` role — navigating to `/admin` redirects to `/`
10. Log out — navigating to `/admin` redirects to `/auth/login`
11. `/admin/posts` — drafts and archived posts visible (status=all)
12. Change a post's status via the inline dropdown — no page reload needed
13. Toggle featured star — star fills / unfills immediately
14. `/admin/categories` — create a category; slug preview shows while typing
15. Inline edit a category — row transforms to inputs; checkmark saves
16. `/admin/stocks` — add a stock; appears in table immediately
17. Click a price value to edit inline — input appears with autoFocus
18. Delete a stock — confirm dialog prevents accidental deletion
19. Language toggle in top bar switches EN ↔ VI across all admin labels
