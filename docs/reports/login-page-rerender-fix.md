# Bug Report: Login Page Re-renders on Wrong Credentials

## Summary

Entering incorrect email or password on the login page caused a full page reload instead of displaying an inline error message.

---

## Root Cause

`src/services/api.ts` contains a global Axios response interceptor that handles 401 responses:

```ts
if (status === 401 && typeof window !== 'undefined' && !url.includes('/auth/me')) {
  localStorage.removeItem('token');
  window.location.href = '/auth/login';
}
```

The intent of this interceptor is to log the user out and redirect to the login page when an authenticated request expires or becomes invalid. However, the exclusion list only covered `/auth/me` — the endpoint used to restore session on page load.

When the user submits wrong credentials on the login page, the backend (`POST /auth/login`) returns a `401 Unauthorized` response. The interceptor matched this 401, did not recognise it as a login attempt, and executed `window.location.href = '/auth/login'` — triggering a full browser navigation to the same page, effectively reloading it.

---

## Impact

- The error message from the server was never displayed — the page reloaded before React could render it.
- `localStorage.removeItem('token')` was called unnecessarily (no token exists during a failed login).
- User experience: the form fields were cleared on every failed attempt, forcing the user to retype credentials.

---

## Fix

**File:** `src/services/api.ts` — line 26

Added `/auth/login` to the interceptor's exclusion list so that a failed login attempt is handled solely by the Redux thunk (`loginUser.rejected`), which sets `error` in state and lets the UI render the error banner inline.

```ts
// Before
if (status === 401 && typeof window !== 'undefined' && !url.includes('/auth/me')) {

// After
if (status === 401 && typeof window !== 'undefined' && !url.includes('/auth/me') && !url.includes('/auth/login')) {
```

---

## Why the Exclusion Pattern

| Endpoint | Behaviour on 401 | Handled by |
|---|---|---|
| `/auth/me` | No token / expired session on load | `fetchCurrentUser.rejected` sets `initialized = true`, no redirect |
| `/auth/login` | Wrong credentials | `loginUser.rejected` sets `error` string, shown inline |
| Everything else | Token expired mid-session | Interceptor clears token and redirects to login |

---

## Related Files

| File | Role |
|---|---|
| `src/services/api.ts` | Axios instance and interceptors — where the fix lives |
| `src/app/auth/login/page.tsx` | Login form — renders the `error` string from Redux state |
| `src/store/slices/authSlice.ts` | `loginUser` thunk — sets `error` on rejection |
