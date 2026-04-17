# Rule: State Management & API

## Overview

State is managed with **Redux Toolkit**. All server data fetching goes through **`createAsyncThunk`** calling the centralized Axios client in `src/services/api.ts`. Components read state via `useAppSelector` and dispatch actions via `useAppDispatch`.

---

## Rule 1 — Always use `useAppSelector` and `useAppDispatch`, never the raw hooks

The typed wrappers live in `src/store/hooks.ts`:

```tsx
import { useAppDispatch, useAppSelector } from '../../store/hooks';

const dispatch = useAppDispatch();
const { articles, loading, error } = useAppSelector((s) => s.news);
```

Never import `useSelector` or `useDispatch` directly from `react-redux` — you would lose TypeScript inference on state shape.

---

## Rule 2 — Slice state interface always includes `loading`, `error`, and domain data

```ts
interface NewsState {
  articles:       Article[];
  currentArticle: Article | null;
  categories:     Category[];
  featured:       Article[];
  pagination:     Pagination | null;
  loading:        boolean;
  error:          string | null;
}
```

For slices with multiple async operations that have separate loading concerns, add a dedicated flag (e.g., `saving` for write operations vs `loading` for reads):

```ts
interface PostsState {
  posts:       Article[];
  currentPost: Article | null;
  loading:     boolean;   // read operations
  saving:      boolean;   // write operations (create/update)
  error:       string | null;
}
```

---

## Rule 3 — `createAsyncThunk` requires three type parameters

```ts
export const loginUser = createAsyncThunk<
  { token: string; user: User },  // 1. Return type (fulfilled payload)
  LoginCredentials,                // 2. Argument type (thunk input)
  { rejectValue: string }          // 3. ThunkAPI config — always set rejectValue
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const res = await authApi.login(credentials);
    const { token, user } = res.data as { token: string; user: User };
    return { token, user };
  } catch (err) {
    return rejectWithValue(extractError(err, 'Login failed'));
  }
});
```

**Action name convention:** `'sliceName/actionName'` — e.g., `'news/fetchAll'`, `'admin/deleteUser'`.

---

## Rule 4 — Extract API errors with the shared helper pattern

API errors come back as `{ response: { data: { error: string } } }`. Use this extraction pattern:

```ts
// Define once per slice (or import from a shared location)
type ApiError = { response?: { data?: { error?: string } } };

function extractError(err: unknown, fallback: string): string {
  return (err as ApiError).response?.data?.error ?? fallback;
}

// Use in every catch block
} catch (err) {
  return rejectWithValue(extractError(err, 'Failed to fetch news'));
}
```

---

## Rule 5 — extraReducers: use shared `pending`/`rejected` handlers to reduce repetition

```ts
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: { /* ... */ },
  extraReducers: (builder) => {
    const pending  = (state: AuthState) => { state.loading = true; state.error = null; };
    const rejected = (state: AuthState, action: { payload?: string }) => {
      state.loading = false;
      state.error = action.payload ?? 'Unknown error';
    };

    builder
      .addCase(loginUser.pending,    pending)
      .addCase(loginUser.fulfilled,  (state, action) => {
        state.loading = false;
        state.user    = action.payload.user;
        state.token   = action.payload.token;
      })
      .addCase(loginUser.rejected,   rejected)
      .addCase(registerUser.pending,   pending)
      .addCase(registerUser.fulfilled, (state, action) => { /* ... */ })
      .addCase(registerUser.rejected,  rejected);
  },
});
```

---

## Rule 6 — Check thunk result with `.fulfilled.match()` in components

```tsx
const result = await dispatch(loginUser(form));

if (loginUser.fulfilled.match(result)) {
  toast.success('Login successful');
  router.push('/');
} else {
  // error is already in state.auth.error — no need to handle here
}
```

This is type-safe and avoids manual `.type` string comparisons.

---

## Rule 7 — API calls are grouped by domain in `src/services/api.ts`

Never create a second Axios instance. All endpoints go into the relevant group in `api.ts`:

```ts
export const newsApi = {
  getAll:    (params?: NewsParams) => api.get('/news', { params }),
  getBySlug: (slug: string)        => api.get(`/news/${slug}`),
  create:    (data: unknown)       => api.post('/news', data),
  update:    (id: string, data: unknown) => api.put(`/news/${id}`, data),
  remove:    (id: string)          => api.delete(`/news/${id}`),
};

export const postsApi = {
  getAll:       ()                              => api.get('/posts'),
  getById:      (id: string)                    => api.get(`/posts/${id}`),
  create:       (data: unknown)                 => api.post('/posts', data),
  update:       (id: string, data: unknown)     => api.put(`/posts/${id}`, data),
  updateStatus: (id: string, status: 0 | 1 | 2) => api.patch(`/posts/${id}/status`, { doc_status: status }),
  remove:       (id: string)                    => api.delete(`/posts/${id}`),
};
```

**Groups that exist:** `authApi`, `newsApi`, `categoryApi`, `stockApi`, `adminApi`, `postsApi`.

---

## Rule 8 — Response unwrapping: cast `res.data` to the expected shape

API responses follow `{ data: T, pagination?: Pagination }`. Unwrap explicitly:

```ts
const res = await newsApi.getAll(params);
const { data, pagination } = res.data as { data: Article[]; pagination: Pagination };
return { data, pagination };
```

For single-resource responses:
```ts
const res = await postsApi.getById(id);
const article = (res.data as { data: Article }).data;
```

---

## Rule 9 — Pagination state shape

```ts
interface Pagination {
  page:  number;
  limit: number;
  total: number;
  pages: number;
}
```

Standard pagination UI (prev/next, no numbered pages):

```tsx
{pagination && pagination.pages > 1 && (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-500">
      {pagination.total} items · page {page} of {pagination.pages}
    </span>
    <div className="flex gap-2">
      <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
        <ChevronLeft size={14} /> Prev
      </button>
      <button disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>
        Next <ChevronRight size={14} />
      </button>
    </div>
  </div>
)}
```

---

## Rule 10 — Debounce search inputs at 400ms before dispatching

Never dispatch on every keystroke. Use a 400ms debounce:

```tsx
const [search, setSearch]               = useState('');
const [searchDebounce, setSearchDebounce] = useState('');

useEffect(() => {
  const timer = setTimeout(() => setSearchDebounce(search), 400);
  return () => clearTimeout(timer);
}, [search]);

// Reset to page 1 when filters change
useEffect(() => { setPage(1); }, [searchDebounce, docStatus]);

// Use searchDebounce in the load callback, not search
const load = useCallback(() => {
  dispatch(fetchNews({ page, search: searchDebounce || undefined }));
}, [dispatch, page, searchDebounce]);
```

---

## Rule 11 — Internationalization: always use `t()` for user-visible strings

```tsx
import { useLocale } from '../../i18n/LocaleContext';

const { t, locale, setLocale } = useLocale();

// Usage
<h1>{t('admin.posts')}</h1>
<button>{t('admin.actions.save')}</button>

// Language toggle
<button onClick={() => setLocale(locale === 'en' ? 'vi' : 'en')}>
  {locale === 'en' ? 'VI' : 'EN'}
</button>
```

Translation keys use dot-notation. Add new keys to both `src/i18n/locales/en.json` and `src/i18n/locales/vi.json`.

**Exception:** Hardcoded English strings are acceptable for admin/internal-only UI that is known to be single-language.
