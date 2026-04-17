# Rule: Auth & Routing

## Overview

Authentication is **client-side only** — there is no Next.js middleware (`middleware.ts`). Route protection is enforced in layout components using the Redux `auth` slice. The `initialized` flag prevents premature redirects during the token hydration window on page load.

---

## Rule 1 — Wait for `initialized` before redirecting

On page load, `providers.tsx` dispatches `fetchCurrentUser()` which reads the token from `localStorage` and fetches the current user. Until this completes, `auth.initialized` is `false`. Never redirect based on `auth.user` before `initialized` is `true`:

```tsx
useEffect(() => {
  if (!initialized) return;           // ← wait for hydration
  if (!user) {
    router.replace('/auth/login');
    return;
  }
  if (user.role !== 'admin') {
    router.replace('/');
  }
}, [initialized, user, router]);
```

**Why:** Without this guard, an authenticated user with a valid token gets redirected to `/auth/login` for one render cycle before `fetchCurrentUser()` returns, causing a brief flash or broken navigation.

---

## Rule 2 — Show a loading spinner while auth is being resolved

The layout must render nothing meaningful (only a spinner) while `initialized` is `false`, or while the user exists but doesn't have the required role:

```tsx
if (!initialized || !user || user.role !== 'admin') {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-green-400" size={32} />
    </div>
  );
}

// Only reaches here if authenticated with correct role
return <div className="min-h-screen ...">...</div>;
```

This also prevents a flash of the protected content before the redirect fires.

---

## Rule 3 — Role levels and access

| Role | Access |
|---|---|
| `user` | Public site only (`/`, `/news`, `/stocks`). Redirected away from `/dashboard` and `/admin`. |
| `editor` | Public site + `/dashboard` (create and manage own posts). No access to `/admin`. |
| `admin` | Public site + `/dashboard` + `/admin` (full CRUD, user management, stats). |

**Admin layout check** (`src/app/admin/layout.tsx`):
```tsx
if (user.role !== 'admin') { router.replace('/'); }
```

**Dashboard layout check** (`src/app/dashboard/layout.tsx`):
```tsx
if (user.role === 'user') { router.replace('/'); }  // allows editor and admin
```

---

## Rule 4 — Use `router.replace()` not `router.push()` for auth redirects

```tsx
router.replace('/auth/login');   // ✓ removes the protected URL from history
router.push('/auth/login');      // ✗ user can navigate "back" to the protected page
```

---

## Rule 5 — Protect admin-only UI elements with inline role checks

For UI elements that are conditionally visible based on role (not full route protection), check `user.role` directly:

```tsx
// Show admin panel link only for admin users (in dashboard sidebar)
{user.role === 'admin' && (
  <Link href="/admin" className="flex items-center gap-3 ...">
    <Shield size={16} />
    Admin Panel
  </Link>
)}
```

---

## Rule 6 — Token is stored in `localStorage` under the key `'token'`

```ts
// Store after login
localStorage.setItem('token', token);

// Remove on logout
localStorage.removeItem('token');
```

The Axios request interceptor in `src/services/api.ts` automatically attaches the token to every request:

```ts
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

Always check `typeof window !== 'undefined'` before accessing `localStorage` to avoid SSR errors.

---

## Rule 7 — 401 responses auto-redirect to login (except `/auth/me`)

The Axios response interceptor handles expired/invalid tokens globally:

```ts
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url    = err.config?.url ?? '';
    if (status === 401 && typeof window !== 'undefined' && !url.includes('/auth/me')) {
      localStorage.removeItem('token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  }
);
```

`/auth/me` is excluded because it's the initialization call — a 401 there means "not logged in", which is handled gracefully by `fetchCurrentUser`.

---

## Rule 8 — New protected routes follow the same layout pattern

When adding a new protected section, create a `layout.tsx` using this template:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '../../store/hooks';
import { Loader2 } from 'lucide-react';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, initialized } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (!initialized) return;
    if (!user) { router.replace('/auth/login'); return; }
    if (user.role !== 'editor' && user.role !== 'admin') { router.replace('/'); }
  }, [initialized, user, router]);

  if (!initialized || !user || (user.role !== 'editor' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-green-400" size={32} />
      </div>
    );
  }

  return <>{children}</>;
}
```

---

## Rule 9 — Active nav item detection

The sidebar `isActive()` helper handles exact match for root paths and prefix match for nested paths:

```tsx
const isActive = (href: string) =>
  href === '/admin'
    ? pathname === '/admin'           // exact match for the root dashboard
    : pathname.startsWith(href);      // prefix match for nested pages

// Usage
className={isActive(href)
  ? 'bg-green-500/15 text-green-400 font-medium'
  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}
```

The exact-match guard on the root path (`/admin`) prevents `/admin` from matching as active when on `/admin/users`.
