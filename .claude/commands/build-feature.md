---
name: build-feature
description: Scaffold a full-stack feature — types → API → Redux slice → store → page(s) → i18n → nav. Use when starting any new feature, route, or data domain in this project.
argument-hint: <feature-name>
---

# Build Feature: $ARGUMENTS

You are building a new full-stack feature called **$ARGUMENTS** into this Next.js 15 / Redux Toolkit project. Follow every phase below in order. Do not skip ahead. Complete each phase before moving to the next.

---

## Phase 0 — Clarify Before Writing Any Code

Ask all of the following questions in a single message and wait for answers:

1. **Data shape** — What does a single `$ARGUMENTS` record look like? List the key fields and their types.
2. **List vs detail** — Does the feature need a list page, a detail page, or both?
3. **Route(s)** — What URL path(s) should the page(s) live at? (e.g. `/watchlist`, `/admin/watchlist`, `/analyst-ratings/[id]`)
4. **Admin or public?** — Is this under `/admin/` (requires `role === 'admin'`) or a public/user-authenticated route?
5. **CRUD scope** — Which operations are needed: fetch-list, fetch-one, create, update, delete, status-toggle?
6. **Pagination?** — Does the list endpoint return `{ data: T[], pagination: Pagination }` or just `{ data: T[] }`?
7. **Navigation** — Should a link appear in the public `Header` nav, the admin sidebar, or neither?
8. **API base path** — What is the backend path? (e.g. `/watchlist` — the axios baseURL already includes `/api`)

After receiving answers, summarise your understanding as a short bullet list and ask for confirmation before writing any code.

---

## Phase 1 — Types (`src/types/index.ts`)

Add new interface(s) to the bottom of `src/types/index.ts`.

Rules:
- All `id` fields are `string`.
- Optional fields use `?`.
- Reuse existing types via `Pick<>` for related entities (author, category, stock, etc.).
- If the feature has a numeric status enum (0/1/2 pattern), add a `LABEL` const and a `COLORS` const following the `DOC_STATUS_LABEL` / `DOC_STATUS_COLORS` pattern in this file.
- Add a `<FeatureName>Params` interface for query params when the list endpoint accepts filters.

```ts
export interface MyFeature {
  id: string;
  // ...fields from clarification
}

export interface MyFeatureParams {
  page?: number;
  limit?: number;
  search?: string;
}
```

---

## Phase 2 — API Endpoints (`src/services/api.ts`)

Add a namespaced API object before the `export default api` line. Use the shared `api` Axios instance — never create a new one.

```ts
export const $ARGUMENTSApi = {
  getAll:  (params?: MyFeatureParams | Record<string, unknown>) => api.get('/$ARGUMENTS', { params }),
  getById: (id: string)                                         => api.get(`/$ARGUMENTS/${id}`),
  create:  (data: unknown)                                      => api.post('/$ARGUMENTS', data),
  update:  (id: string, data: unknown)                          => api.put(`/$ARGUMENTS/${id}`, data),
  remove:  (id: string)                                         => api.delete(`/$ARGUMENTS/${id}`),
};
```

Include only the methods that match the CRUD scope from Phase 0. Add any new param types to the existing `import` from `'../types'` at the top.

---

## Phase 3 — Redux Slice (`src/store/slices/$ARGUMENTSSlice.ts`)

Create `src/store/slices/$ARGUMENTSSlice.ts`.

### 3a. State shape

```ts
interface $ARGUMENTSState {
  items: MyFeature[];
  currentItem: MyFeature | null;
  pagination: Pagination | null; // omit if no pagination
  loading: boolean;
  saving: boolean;               // add only if create/update mutations exist
  error: string | null;
}
```

### 3b. extractError — define locally, do NOT import

Every slice defines this two-liner locally. Copy it verbatim:

```ts
type ApiError = { response?: { data?: { error?: string } } };
const extractError = (err: unknown, fallback: string): string =>
  (err as ApiError).response?.data?.error ?? fallback;
```

### 3c. Async thunks

List thunk (paginated):
```ts
export const fetch$ARGUMENTSList = createAsyncThunk<
  { data: MyFeature[]; pagination: Pagination },
  MyFeatureParams | undefined,
  { rejectValue: string }
>('$ARGUMENTS/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await $ARGUMENTSApi.getAll(params);
    return res.data as { data: MyFeature[]; pagination: Pagination };
  } catch (err) {
    return rejectWithValue(extractError(err, 'Failed to fetch $ARGUMENTS'));
  }
});
```

Single-item thunk:
```ts
export const fetch$ARGUMENTSById = createAsyncThunk<MyFeature, string, { rejectValue: string }>(
  '$ARGUMENTS/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const res = await $ARGUMENTSApi.getById(id);
      return (res.data as { data: MyFeature }).data; // always unwrap .data
    } catch (err) {
      return rejectWithValue(extractError(err, 'Not found'));
    }
  }
);
```

For mutations (create/update/delete) use `saving: true` in pending, `saving: false` in fulfilled/rejected. Use `loading` for reads only.

### 3d. extraReducers pattern

```ts
extraReducers: (builder) => {
  const setLoading  = (state: $ARGUMENTSState) => { state.loading = true; state.error = null; };
  const setRejected = (state: $ARGUMENTSState, action: PayloadAction<string | undefined>) => {
    state.loading = false; state.error = action.payload ?? 'Error';
  };

  builder
    .addCase(fetch$ARGUMENTSList.pending,   setLoading)
    .addCase(fetch$ARGUMENTSList.fulfilled, (state, action) => {
      state.loading    = false;
      state.items      = action.payload.data;
      state.pagination = action.payload.pagination;
    })
    .addCase(fetch$ARGUMENTSList.rejected,  setRejected);
}
```

Every thunk must have all three cases. Rejected handlers must use `PayloadAction<string | undefined>` (not `PayloadAction<string>`) — RTK types the payload as `T | undefined`.

---

## Phase 4 — Register in Store (`src/store/index.ts`)

1. Import: `import $ARGUMENTSReducer from './slices/$ARGUMENTSSlice';`
2. Add to the reducer map: `$ARGUMENTS: $ARGUMENTSReducer,`

`RootState` and `AppDispatch` are derived automatically — no manual type changes needed.

---

## Phase 5 — Page Component(s)

### Route placement

| Type | Location |
|------|----------|
| Public page | `src/app/<route>/page.tsx` |
| Admin page | `src/app/admin/<route>/page.tsx` |
| Dynamic segment | `src/app/<route>/[id]/page.tsx` |

### Required boilerplate

```ts
'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetch$ARGUMENTSList } from '@/store/slices/$ARGUMENTSSlice';
import { useLocale } from '@/i18n/LocaleContext';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
```

Always use `@/` path alias — never relative `../../` imports in page files.

### Auth guards

**Admin routes** (`/admin/**`): `src/app/admin/layout.tsx` already checks `initialized`, `user`, and `role === 'admin'` — **do not add a duplicate guard inside the page**.

**Non-admin authenticated routes**: Add this guard:
```ts
useEffect(() => {
  if (!initialized) return;
  if (!user) router.replace('/auth/login');
}, [initialized, user, router]);

if (!initialized || !user) {
  return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-400" size={32} /></div>;
}
```

### Data loading

```ts
const dispatch = useAppDispatch();
const { items, pagination, loading, error } = useAppSelector((s) => s.$ARGUMENTS);
const { t } = useLocale();

useEffect(() => {
  dispatch(fetch$ARGUMENTSList());
}, [dispatch]);
```

### Tailwind design tokens

| Element | Classes |
|---------|---------|
| Page background | `bg-white dark:bg-gray-950` |
| Card / panel | `bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl` |
| Table row hover | `hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors` |
| Positive value | `text-green-400` |
| Negative value | `text-red-400` |
| Loading spinner | `<Loader2 className="animate-spin text-green-400" size={32} />` |
| Primary button | `bg-green-600 hover:bg-green-500 text-white rounded-lg px-4 py-2.5 text-sm transition-colors` |
| Danger button | `bg-red-600 hover:bg-red-500 text-white rounded-lg` |
| Input | `bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-green-500` |
| Badge positive | `bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full font-medium` |
| Badge negative | `bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full font-medium` |
| Badge neutral | `bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full font-medium` |

Use `cn()` whenever classes are conditionally composed.

### Error and empty states

```tsx
{error && (
  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
    {error}
  </div>
)}

{!loading && items.length === 0 && (
  <p className="text-center text-gray-500 text-sm py-8">
    {t('$ARGUMENTS.no_items')}
  </p>
)}
```

---

## Phase 6 — i18n Keys

Add to **both** locale files. Keys must be parallel — same structure, different language values.

`src/i18n/locales/en.json` — add at the end:
```json
"$ARGUMENTS": {
  "title": "...",
  "no_items": "No items found.",
  "search_placeholder": "Search...",
  "actions": {
    "add": "Add",
    "edit": "Edit",
    "delete": "Delete",
    "save": "Save changes"
  }
}
```

`src/i18n/locales/vi.json` — add the same structure with Vietnamese values. Ask the user to supply translations, or make a best-effort attempt and flag strings that need native review.

**Important:** `t()` silently returns the key path on a miss — missing keys produce no runtime error, making them easy to overlook. Verify every `t('$ARGUMENTS.xxx')` call has a matching key in both files.

---

## Phase 7 — Navigation (only if requested in Phase 0)

**Public header** (`src/components/layout/Header.tsx`):
```ts
{ href: '/$ARGUMENTS', label: t('nav.$ARGUMENTS') },
```
Add `"$ARGUMENTS": "..."` under `"nav"` in both locale files.

**Admin sidebar** (`src/app/admin/layout.tsx`):
```ts
{ href: '/admin/$ARGUMENTS', label: t('admin.$ARGUMENTS'), icon: SomeIcon },
```
Pick an icon from `lucide-react` (already installed). Add `"$ARGUMENTS": "..."` under `"admin"` in both locale files.

---

## Phase 8 — Final Verification Checklist

Work through every item before declaring the feature complete:

- [ ] `src/types/index.ts` — interfaces added, no TypeScript errors
- [ ] `src/services/api.ts` — new API object uses shared `api` instance
- [ ] `src/store/slices/$ARGUMENTSSlice.ts` — all thunks have pending/fulfilled/rejected; `extractError` defined locally
- [ ] `src/store/index.ts` — reducer imported and registered
- [ ] Page file(s) under correct `src/app/` path, marked `'use client'`
- [ ] All page imports use `@/` alias
- [ ] Admin pages rely on shared layout guard (no duplicate)
- [ ] Non-admin authenticated pages have their own `useEffect` guard
- [ ] `useAppDispatch` and `useAppSelector` used (not raw Redux hooks)
- [ ] Every user-visible string goes through `t('...')`
- [ ] Both `en.json` and `vi.json` updated with matching key structure
- [ ] Navigation updated if requested

Then run:
```bash
npm run lint
```

Fix every error and warning. Common issues:
- Unused imports (especially lucide-react icons)
- Missing `key` props on list items
- `useEffect` missing dependency array entries
- `PayloadAction<string | undefined>` on rejected handlers (not `PayloadAction<string>`)
- `as any` — never use this; find the correct type

Report the lint output to the user. If lint passes clean, the feature is complete.
