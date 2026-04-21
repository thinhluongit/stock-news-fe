# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Next.js)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test suite is configured.

## Environment

Copy `.env.local.example` to `.env.local`. The key variable is:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Architecture

**Stack:** Next.js 15 (App Router) · React 18 · TypeScript (strict) · Redux Toolkit · Axios · Tailwind CSS · react-hot-toast

### Routing

File-based App Router under `src/app/`:
- `/` — home (featured news + article list + sidebar)
- `/auth/login`, `/auth/register` — authentication
- `/news`, `/news/[id]` — public news pages
- `/stocks` — stock market tracker
- `/admin/**` — admin CRUD (posts, categories, users, stocks) — role-gated

### State Management

Redux Toolkit slices in `src/store/slices/`:
- `authSlice` — user session, login/register/profile
- `newsSlice` — articles, featured news, categories, pagination
- `stockSlice` — stock data
- `adminSlice` — admin user management and stats

All async operations use `createAsyncThunk`. Components read state via `useAppSelector` and dispatch via `useAppDispatch`.

### API Layer (`src/services/api.ts`)

Single Axios instance pointed at `NEXT_PUBLIC_API_URL`. Two interceptors:
1. **Request** — attaches `Authorization: Bearer <token>` from localStorage
2. **Response** — on 401, clears token and redirects to `/auth/login`

API responses follow the shape `{ data: T, pagination?: Pagination }`. Slices extract `.data` before storing.

### Authentication Flow

1. `src/app/providers.tsx` dispatches `fetchCurrentUser()` on mount (reads token from localStorage)
2. State has an `initialized` flag — protected UI waits for this before rendering to prevent flicker
3. Admin routes (`src/app/admin/layout.tsx`) check `user.role === 'admin'` via `useEffect` and redirect if not satisfied
4. There is **no Next.js middleware** (`middleware.ts`) — all auth enforcement is client-side

### Internationalization (`src/i18n/`)

Custom context-based i18n (no external library). Supports `en` and `vi`. Locale preference persisted to localStorage. Access translations via the `useLocale()` hook:

```ts
const { t, locale, setLocale } = useLocale();
t('auth.login.title'); // dot-notation key resolution
```

Locale JSON files live in `src/i18n/locales/`.

### Key Utilities (`src/lib/utils.ts`)

- `cn(...classes)` — Tailwind class merging (clsx + tailwind-merge)
- `formatDate()`, `formatDateRelative()` — date display helpers
- `formatNumber()` — K/M/B/T notation
- `formatPrice()` — USD currency

### Styling

Dark-themed Tailwind UI. Custom brand tokens in `tailwind.config.js`:
- Green (`#22c55e`) for bullish/positive indicators
- Red (`#ef4444`) for bearish/negative indicators
- Background layers: `gray-950` (page) / `gray-900` (cards)

Path alias `@/*` maps to `src/*` (configured in `tsconfig.json`).

## Rules

@docs/rules/images.md
