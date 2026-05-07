# ThanhDangBullish Frontend — Maintenance & Expansion Plan

## Context

This is a Next.js 15 financial news and stock-tracking platform with a full admin panel, EditorJS rich-text editing, Redux Toolkit state management, and EN/VI i18n. The core feature set is largely implemented. This plan identifies what is missing, what is partially built, and what needs polish — ordered by impact.

---

## Current State Summary

| Area | Status |
|------|--------|
| Admin panel (posts, users, categories, stocks) | ✅ Complete |
| EditorJS editor + custom tools | ✅ Complete |
| Public news list + article detail | ✅ Complete |
| Featured news (server-rendered LCP) | ✅ Complete |
| Stock tracker (public view) | ✅ Complete |
| Home page (ticker + featured + latest) | ✅ Complete |
| Authentication (login + register) | ✅ Complete |
| Dashboard (user post management) | ✅ Complete |
| Header dropdown (role-based) | ✅ Recently added |
| Account / profile page | ❌ Missing (linked in Header) |
| Stock detail page `/stocks/[symbol]` | ❌ Missing (Redux thunk exists) |
| Search page | ❌ Missing (nav placeholder exists) |
| Password reset / forgot-password flow | ❌ Missing |
| Dynamic ticker bar on home page | ⚠️ Hardcoded |
| VI translations (parity with EN) | ⚠️ Needs audit |
| SEO metadata on public pages | ⚠️ Incomplete |

---

## Phase 1 — Missing Pages (Linked but Unimplemented)

### 1.1 Account / Profile Page (`/account`)

**Why it's needed:** The Header dropdown already links to "Account Information" at `/account`. Clicking it 404s.

**Scope:**
- New page `src/app/account/page.tsx`
- Form to update `full_name` — calls `authApi.updateProfile()`
- Display-only email field
- Avatar URL update (already in `updateProfile` API)
- Protected: redirect to `/auth/login` if not authenticated
- Reuse `Input`, `Button` UI components

**Redux:** `authSlice` already has `fetchCurrentUser`; add `updateProfile` thunk calling `authApi.updateProfile`.

**i18n keys needed:** `account.title`, `account.full_name`, `account.email`, `account.save`, `account.save_success`

**Files to create/edit:**
- `src/app/account/page.tsx` (new)
- `src/store/slices/authSlice.ts` — add `updateProfile` thunk
- `src/i18n/locales/en.json` + `vi.json` — add `account.*` keys

---

### 1.2 Stock Detail Page (`/stocks/[symbol]`)

**Why it's needed:** `fetchStockDetail` thunk and `stockApi.getBySymbol` + `stockApi.getStockNews` are implemented but no page exists. The stocks table has a "View news" column — that link currently goes nowhere useful.

**Scope:**
- New page `src/app/stocks/[symbol]/page.tsx`
- Hero card: symbol, company, exchange, sector, price, change %
- Price history placeholder (static chart or simple table)
- Related news list using `stockApi.getStockNews` (reuse `NewsCard`)
- Back to stocks link
- `generateMetadata` for SEO

**Redux:** `stockSlice.fetchStockDetail` already exists; wire it up.

**Files to create/edit:**
- `src/app/stocks/[symbol]/page.tsx` (new)
- `src/i18n/locales/en.json` + `vi.json` — add `stock_detail.*` keys

---

### 1.3 Search Page (`/search`)

**Why it's needed:** The Header has a search placeholder input but no search action is wired up.

**Scope:**
- New page `src/app/search/page.tsx`
- Accepts `?q=` query param
- Calls `newsApi.getAll({ search: q })` — already supported by the API
- Renders results using `NewsList` component or similar grid
- Connects Header search form to navigate to `/search?q=...`

**Files to create/edit:**
- `src/app/search/page.tsx` (new)
- `src/components/layout/Header.tsx` — wire `onSubmit` to `router.push('/search?q=...')`

---

### 1.4 Forgot Password / Reset Password Flow

**Why it's needed:** No recovery path if a user forgets their password. Standard auth expectation.

**Scope (frontend only — requires backend endpoints):**
- `src/app/auth/forgot-password/page.tsx` — email input, calls `POST /auth/forgot-password`
- `src/app/auth/reset-password/page.tsx` — new password + confirm, reads `?token=` from URL, calls `POST /auth/reset-password`
- Link from login page: "Forgot password?"
- `authApi` additions: `forgotPassword(email)`, `resetPassword(token, password)`

**Files to create/edit:**
- `src/app/auth/forgot-password/page.tsx` (new)
- `src/app/auth/reset-password/page.tsx` (new)
- `src/app/auth/login/page.tsx` — add "Forgot password?" link
- `src/services/api.ts` — add `forgotPassword`, `resetPassword`
- `src/i18n/locales/en.json` + `vi.json`

---

## Phase 2 — Expand Existing Features

### 2.1 Dynamic Ticker Bar on Home Page

**Current state:** Home page `page.tsx` has a hardcoded array of 8 stock ticker entries (symbol, price, change). These never update.

**Fix:** Replace with `stockApi.getAll()` call in the Server Component. Show up to 8 stocks sorted by trading volume or market cap. Falls back gracefully if API is unavailable.

**Files to edit:**
- `src/app/page.tsx` — fetch stocks server-side, pass to ticker component
- Extract ticker into `src/components/home/TickerBar.tsx` (accept `stocks` prop)

---

### 2.2 SEO Metadata for Public Pages

**Current state:** Most public pages are missing `generateMetadata`. Only the root layout has basic metadata.

**Pages that need `generateMetadata`:**
- `src/app/news/[id]/page.tsx` — title = article title, description = summary, OG image = thumbnail
- `src/app/stocks/page.tsx` — static title/description
- `src/app/stocks/[symbol]/page.tsx` — dynamic title per stock
- `src/app/search/page.tsx` — dynamic title with query

**Pattern:** Use Next.js 15 `generateMetadata` async export. For dynamic routes, reuse the same server fetch already done for the page.

---

### 2.3 Article Reading Time

**Current state:** Article detail shows views and date but no reading time estimate.

**Fix:** Add a `readingTime(content: string): number` utility to `src/lib/utils.ts` (words / 200 = minutes). Display in article header: "5 min read".

**Files to edit:**
- `src/lib/utils.ts` — add `readingTime()`
- `src/app/news/[id]/page.tsx` — display reading time
- `src/i18n/locales/en.json` + `vi.json` — `article.min_read`

---

### 2.4 VI Translation Parity Audit

**Current state:** `vi.json` exists but recent additions (register validation keys, admin post/stock keys, etc.) may not be reflected.

**Fix:** Diff `en.json` vs `vi.json` key-by-key. Add missing VI translations for:
- `auth.register.error_full_name_required`
- Any admin keys added in recent commits
- New `account.*`, `stock_detail.*`, `search.*` keys from Phase 1

**Files to edit:**
- `src/i18n/locales/vi.json`

---

### 2.5 Pagination as URL State (News & Admin Lists)

**Current state:** Pagination in `NewsList` and admin list pages is managed in local component state. Refreshing the page resets to page 1. Sharing a URL doesn't preserve the page.

**Fix:** Use `useSearchParams` / `router.push` to sync `page` param with the URL. Low-risk change — the API already accepts `page` param.

**Files to edit:**
- `src/components/news/NewsList.tsx`
- `src/app/admin/posts/page.tsx`
- `src/app/admin/users/page.tsx`

---

## Phase 3 — Maintenance & Quality

### 3.1 Image Compliance Audit

Ensure all `<Image>` usages follow `docs/rules/images.md`:
- All `fill` images have `sizes` props
- Fixed-dimension images have `width` + `height`
- LCP image has `priority` (only one per route)
- No missing `alt` attributes

**Scan:** `src/components/news/`, `src/app/news/[id]/page.tsx`, admin pages.

---

### 3.2 Error Boundary Coverage

**Current state:** Redux slices set `error` strings, but most UI shows raw error text or nothing at all on fetch failure.

**Fix:** Add a reusable `ErrorMessage` component. Use it consistently in `NewsList`, news detail, stocks page, and admin pages instead of ad-hoc `{error && <p>}` patterns.

---

### 3.3 Admin Posts — Published Article Lock UX

**Current state:** Edit post page disables the editor when `doc_status === 1` (published). However the user still sees the editor but cannot interact with it — potentially confusing.

**Fix:** Add a visible "Published — content locked" banner above the editor with an "Unarchive to edit" call to action. Already uses `changePostStatus` thunk.

---

## Verification Checklist

After each phase:

1. Run `npm run build` — zero TypeScript errors, zero ESLint errors
2. `npm run dev` — manually navigate each new/modified page
3. Check EN/VI language toggle on each new page (no missing keys)
4. Verify auth guard: unauthenticated users hitting `/account` redirect to `/auth/login`
5. Check browser Network tab: no 404s for linked routes
6. Run `npm run lint` — no warnings

---

## Priority Order

| Priority | Item |
|----------|------|
| P1 | 1.1 Account/Profile page |
| P1 | 1.2 Stock detail page |
| P1 | 1.3 Search page |
| P2 | 2.1 Dynamic ticker bar |
| P2 | 2.2 SEO metadata |
| P2 | 2.4 VI translation parity |
| P3 | 1.4 Forgot/reset password |
| P3 | 2.3 Reading time |
| P3 | 2.5 URL-based pagination |
| P4 | 3.1 Image compliance audit |
| P4 | 3.2 Error boundary coverage |
| P4 | 3.3 Published article lock UX |
