# Bug Report: Infinite Redirect Loop on Unauthenticated Page Access

**Date:** 2026-04-16  
**Severity:** Critical — app is unusable for unauthenticated users  
**Status:** Fixed

---

## Symptom

Accessing any page (e.g. `/`) without being logged in caused the browser to continuously redirect to `/auth/login` and back, resulting in an infinite reload loop.

---

## Root Cause

Two components interact to create the loop:

### 1. `AuthBootstrap` (always runs on every page)

`src/app/providers.tsx` wraps every page with a `Providers` component that contains `AuthBootstrap`. On mount, `AuthBootstrap` dispatches `fetchCurrentUser()`, which calls `GET /auth/me` to restore the user session from a stored JWT.

When no token exists, the backend returns **401 Unauthorized**.

### 2. The Axios response interceptor (unconditional 401 redirect)

`src/services/api.ts` registers a response error interceptor:

```typescript
// Before fix
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    if (status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/auth/login'; // ← hard navigation, reloads everything
    }
    return Promise.reject(err);
  }
);
```

This interceptor fires for **every** 401 response — including the startup `GET /auth/me` call — and performs a full-page hard navigation (`window.location.href`) to `/auth/login`.

### The loop

```
[Any page load]
      │
      ▼
AuthBootstrap → fetchCurrentUser() → GET /auth/me → 401
      │
      ▼
Response interceptor → window.location.href = '/auth/login'
      │
      ▼  (full page reload)
AuthBootstrap → fetchCurrentUser() → GET /auth/me → 401
      │
      └─ repeat forever
```

### Why the existing guard didn't stop it

The `fetchCurrentUser.rejected` case in `authSlice` correctly handles the "no token" scenario — it sets `initialized=true` and `user=null` without redirecting, allowing the Redux state to drive UI. However, the response interceptor fires **first** (before the rejected action is dispatched) and triggers the hard navigation, bypassing Redux entirely.

---

## Fix

**File:** `src/services/api.ts`

Added a URL check in the interceptor to skip the redirect when the failing request is `GET /auth/me`:

```typescript
// After fix
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const axiosErr = err as { response?: { status?: number }; config?: { url?: string } };
    const status = axiosErr.response?.status;
    const url    = axiosErr.config?.url ?? '';
    // Skip redirect for /auth/me — fetchCurrentUser.rejected already handles
    // the "no token" case by setting initialized=true without navigating.
    // Redirecting here would cause an infinite reload loop on public pages.
    if (status === 401 && typeof window !== 'undefined' && !url.includes('/auth/me')) {
      localStorage.removeItem('token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  }
);
```

---

## Behaviour After Fix

| Scenario | Before | After |
|---|---|---|
| Visit `/` without token | Infinite redirect loop | Page renders normally; `initialized=true`, `user=null` |
| Visit `/auth/login` without token | Infinite redirect loop | Login page renders normally |
| Visit `/admin` without token | Infinite redirect loop | `admin/layout.tsx` guard redirects to `/auth/login` once |
| Visit `/dashboard` without token | Infinite redirect loop | `dashboard/layout.tsx` guard redirects to `/auth/login` once |
| Token expires during session | (worked) redirect to `/auth/login` | (works) redirect to `/auth/login` |

The `fetchCurrentUser.rejected` case in `authSlice` already cleared the token and set `initialized=true` correctly. Protected routes (`/admin`, `/dashboard`) have their own `useEffect` guards that redirect unauthenticated users via `router.replace('/auth/login')` — a client-side navigation without a full reload — which is the appropriate mechanism.

---

## Lesson

The global 401 interceptor pattern is useful for handling session expiry during active use, but it must be scoped to exclude the "bootstrap" endpoint used to check authentication on startup. Startup auth checks should only update Redux state, leaving page-level redirect decisions to each layout's own guard.
