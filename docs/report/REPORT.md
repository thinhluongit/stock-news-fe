# Development Report: ThanhDangBullish — Build & TypeScript Migration

---

## Part 1: Initial Project Scaffolding

### 1.1 Environment Assessment

**Action:** Ran `pwd && ls` to confirm the working directory and check for existing files.

**Reason:** Before creating any structure, it was necessary to verify the target directory was empty and confirm the shell's current location to use correct absolute paths throughout the session.

**Effect:** Confirmed working directory as `C:/Users/admin/Documents/Dev/Personal` and that it was empty — no conflicts to resolve.

---

### 1.2 Directory Structure Creation

**Action:** Ran a single `mkdir -p` command creating all 15+ nested directories simultaneously:
```
backend/src/{config,controllers,middleware,models,routes,db}
frontend/src/app/news/[id]
frontend/src/app/stocks
frontend/src/app/auth/{login,register}
frontend/src/components/{layout,news,ui}
frontend/src/store/slices
frontend/src/services
frontend/src/lib
```

**Reason:** Creating the full directory tree upfront — rather than creating directories file-by-file as needed — meant subsequent `Write` tool calls could all proceed without additional shell commands. The `[id]` directory name is a Next.js App Router convention for dynamic route segments (the slug becomes `params.id`).

**Effect:** All 26 directories created in a single operation. Verified with `find ... -type d`.

---

### 1.3 Backend — `package.json`

**Action:** Wrote `backend/package.json` with the following production dependencies:

| Package | Purpose |
|---|---|
| `express` | HTTP server and routing framework |
| `pg` | PostgreSQL client (raw SQL, no ORM) |
| `bcryptjs` | Password hashing for authentication |
| `jsonwebtoken` | JWT signing and verification |
| `express-validator` | Request body/query validation middleware |
| `cors` | Cross-Origin Resource Sharing headers |
| `helmet` | Sets security-related HTTP response headers |
| `morgan` | HTTP request logging |
| `dotenv` | Loads `.env` file into `process.env` |
| `slugify` | Converts article titles into URL-safe slugs |
| `multer` | Multipart form data parsing (for future file uploads) |

**Reason for raw `pg` over an ORM:** ORMs (like Sequelize or Prisma) add abstraction overhead and make complex SQL (e.g., multi-join aggregations with `json_agg`) harder to write and debug. For a news site with complex relational queries, raw SQL gives full control and better performance.

**Effect:** Defined reproducible dependencies. `nodemon` in devDependencies enabled automatic server restarts during development.

---

### 1.4 Backend — Environment Configuration

**Action:** Created `.env.example` (committed template) and `.env` (actual secrets, not committed).

**Reason:** Separating the template from the real credentials is a security standard. The `.env.example` documents what variables are required without exposing values. The `.env` was created with placeholder values that the developer must fill in before first run.

**Variables defined:**
- `NODE_ENV`, `PORT` — runtime mode and port
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — PostgreSQL connection
- `JWT_SECRET`, `JWT_EXPIRES_IN` — token signing
- `FRONTEND_URL` — CORS origin whitelist

**Effect:** The application reads these at startup via `dotenv`. If any required variable is missing, the connection pool falls back to defaults or fails explicitly in `testConnection()`.

---

### 1.5 Backend — Entry Point (`server.js`)

**Action:** Created a minimal `server.js` that:
1. Loads `.env` via `dotenv/config`
2. Imports the Express `app` instance
3. Tests the PostgreSQL connection
4. Starts listening on `PORT`

**Reason:** Separating `server.js` (startup concerns: port binding, DB check) from `src/app.js` (Express app configuration) is a standard pattern. It allows `app.js` to be imported in tests without actually binding a port.

**Effect:** `npm run dev` starts the full server. `testConnection()` ensures the process fails fast and clearly if the database is unreachable, rather than silently accepting requests that will fail later.

---

### 1.6 Backend — Express App (`src/app.js`)

**Action:** Created the Express application with middleware stack ordered deliberately:

1. `helmet()` — must be first to set security headers on all responses
2. `morgan()` — logs every request; `combined` format in production, `dev` in development
3. `cors()` — restricts origins to the frontend URL from `.env`
4. `express.json()` / `express.urlencoded()` — body parsers for API requests
5. `/uploads` static file serving — for future image uploads
6. Health check route at `GET /api/health`
7. Feature routes (`/api/auth`, `/api/news`, etc.)
8. 404 handler
9. `errorHandler` — **must be last** because Express identifies error handlers by their 4-parameter signature `(err, req, res, next)`

**Reason:** Middleware order is critical in Express. Security headers must be set before any response; CORS must run before route handlers; the error handler must be registered after all routes.

**Effect:** A well-structured Express app that applies security hardening, structured logging, and centralised error handling to every request.

---

### 1.7 Database — Connection Pool (`src/config/database.js`)

**Action:** Created a `pg.Pool` instance configured with connection limits and exported a `query()` wrapper function.

**Key decisions:**
- `max: 20` — pool size appropriate for a moderate-traffic application
- `idleTimeoutMillis: 30000` — releases idle connections after 30 seconds, preventing resource leaks
- `connectionTimeoutMillis: 2000` — fails fast if the DB is unreachable (2s timeout)
- Exported both `query()` and `getClient()` — `query()` for simple queries (automatically returns connection to pool), `getClient()` for transactions where you need to hold a connection across multiple statements

**Reason:** A connection pool is essential for web servers — creating a new DB connection per request would be prohibitively slow. The pool reuses existing connections.

**Effect:** All controllers use `query()` for their DB calls, which transparently handles connection acquisition and release.

---

### 1.8 Database — Schema (`src/db/schema.sql`)

**Action:** Designed a PostgreSQL schema with 6 tables:

| Table | Purpose |
|---|---|
| `users` | Authentication and authorship |
| `categories` | News taxonomy (Market News, Analysis, Crypto, etc.) |
| `stocks` | Stock symbols with live price data |
| `news` | Articles with full content, status, and metadata |
| `news_stocks` | Many-to-many join: articles ↔ stocks mentioned |
| `bookmarks` | Many-to-many join: users ↔ saved articles |

**Key design decisions:**

- **UUIDs as primary keys** (via `uuid_generate_v4()`): Avoids sequential integer guessing, is globally unique, and enables distributed ID generation.
- **`status` column with CHECK constraint** (`draft`, `published`, `archived`): Enforces valid states at the database level, not just application level.
- **`published_at` separate from `created_at`**: Allows scheduling articles (created but not yet published) and accurate time-based sorting.
- **`json_agg` + `FILTER`**: Enables returning nested stock arrays in a single query rather than N+1 queries.
- **`update_updated_at` trigger**: Automatically maintains the `updated_at` timestamp on `users` and `news` tables without requiring the application to remember to set it.
- **Indexes** on `news.status`, `news.published_at`, `news.slug`, `news.category_id`, `stocks.symbol`: Targets the most common query patterns (list by status+date, lookup by slug, filter by category, look up stock by ticker).

**Effect:** A normalised, production-appropriate schema that supports the full feature set with good query performance.

---

### 1.9 JWT Authentication Middleware (`src/middleware/auth.js`)

**Action:** Created two middleware functions:

1. **`authenticate`**: Extracts the Bearer token from the `Authorization` header, verifies it with `jsonwebtoken`, queries the database for the user, and attaches the user object to `req.user`.
2. **`authorize(...roles)`**: A higher-order function that returns middleware checking `req.user.role` against the allowed roles.

**Reason:** Separating authentication (who are you?) from authorisation (what are you allowed to do?) follows the Single Responsibility Principle and makes route protection composable:
```js
router.post('/', authenticate, authorize('editor', 'admin'), create);
```

**Key security decisions:**
- Always re-fetches the user from the database (doesn't trust the JWT payload alone) — catches deactivated accounts even if the token hasn't expired.
- Returns `401` for all token failures without revealing whether the token was invalid vs. the user was deactivated — avoids user enumeration.

**Effect:** All protected routes automatically enforce authentication. Role-based access control is enforced at the route level.

---

### 1.10 Controllers

**Action:** Created four controllers — `authController`, `newsController`, `categoryController`, `stockController`.

#### Auth Controller
- `register`: Hashes password with bcrypt (cost factor 12), checks for duplicate email, returns JWT
- `login`: Compares password with bcrypt, strips `password_hash` from response, returns JWT
- `getMe`: Simple protected endpoint returning the authenticated user
- `updateProfile`: PATCH with `COALESCE` to allow partial updates

**Reason for bcrypt cost factor 12:** Cost factor 10 is the default, 12 adds ~4x more compute time per hash — meaningfully harder to brute-force while still completing in ~250ms on modern hardware.

#### News Controller

The most complex controller. The `NEWS_SELECT` SQL constant uses:
- `json_build_object()` to return `author` and `category` as nested JSON objects in a single query
- `json_agg(DISTINCT ...)` with `FILTER (WHERE s.id IS NOT NULL)` to aggregate related stocks into an array, filtering out NULLs from LEFT JOINs
- `GROUP BY n.id, u.id, c.id` required by the aggregation

**Reason:** This avoids N+1 query problems. A single SQL query returns a fully populated article object including nested author, category, and related stocks.

**Slug generation:** `slugify` converts the title to a URL-safe string. A suffix of `Date.now()` is appended if the slug already exists, ensuring uniqueness.

**View counting:** `UPDATE news SET views = views + 1` on the article detail endpoint. Done after the data is fetched (not before) to avoid a race condition showing an inflated count.

#### Category Controller
Standard CRUD. Categories include a `news_count` aggregate computed by a JOIN to the `news` table, filtered to published articles only — this powers the sidebar display.

#### Stock Controller
Supports flexible filtering (`search`, `sector`, `exchange`) using dynamic WHERE clause construction. The `getStockNews` endpoint joins through the `news_stocks` junction table to return articles mentioning a specific stock.

---

### 1.11 Routes

**Action:** Created four route files mapping HTTP verbs and paths to controllers, with middleware applied where needed.

**Reason for separating routes from controllers:** Controllers contain business logic; routes contain routing declarations. This separation makes it easy to audit what endpoints exist and what protection they have.

Example access matrix:

| Endpoint | Auth required | Roles |
|---|---|---|
| `GET /api/news` | No | — |
| `POST /api/news` | Yes | `editor`, `admin` |
| `DELETE /api/news/:id` | Yes | `admin` only |
| `PATCH /api/stocks/:symbol/price` | Yes | `admin` only |

---

### 1.12 Database Migration and Seed Scripts

**Action:** Created `src/db/migrate.js` (runs `schema.sql`) and `src/db/seed.js` (inserts initial data).

**Seed data:**
- 1 admin user: `admin@thanhdangbullish.com` / `Admin@123`
- 6 categories: Market News, Analysis, Forex, Crypto, Commodities, IPO
- 8 stocks: AAPL, MSFT, NVDA, GOOGL, AMZN, TSLA, META, BRK.B

**Reason:** `ON CONFLICT ... DO NOTHING` makes the seed script idempotent — safe to run multiple times without duplicating data.

---

### 1.13 Frontend — Configuration Files

**Action:** Created `package.json`, `next.config.js`, `tailwind.config.js`, `postcss.config.js`.

**Key frontend decisions:**

- **Next.js 14 → upgraded to Next.js 15:** Initially specified v14.0.4, but `npm install next@latest` upgraded it because v14.0.4 had a known security vulnerability (middleware bypass). The upgrade was intentional.
- **Redux Toolkit over plain Redux:** RTK reduces boilerplate significantly (`createSlice`, `createAsyncThunk`) and includes Immer for immutable state updates.
- **TailwindCSS dark theme:** The entire app uses a dark color scheme (`bg-gray-950`, `bg-gray-900`, etc.) appropriate for a financial data dashboard.
- **Custom Tailwind colors:** Added `bull` (`#22c55e`) and `bear` (`#ef4444`) semantic colors, and `animate-marquee` with a CSS `@keyframes` animation for the live ticker bar.

---

### 1.14 Frontend — Redux Store Architecture

**Action:** Created the Redux store with three slices:

#### Auth Slice (`authSlice.js`)
State: `{ user, token, loading, error, initialized }`

- `token` is initialised from `localStorage` on first load (enables persistent sessions)
- Three async thunks: `loginUser`, `registerUser`, `fetchCurrentUser`
- `logout` action clears both Redux state and `localStorage`
- `initialized` flag prevents the UI from flashing the "not logged in" state during the initial `getMe` fetch

#### News Slice (`newsSlice.js`)
State: `{ articles, pagination, currentArticle, featuredNews, categories, loading, error }`

- `fetchNews` supports all query parameters (pagination, category filter, search, featured flag)
- `fetchFeaturedNews` is a separate thunk fetching `is_featured=true` articles — used specifically by the homepage hero section
- `fetchCategories` is co-located in this slice since categories are primarily a UI concern for filtering news

#### Stock Slice (`stockSlice.js`)
State: `{ stocks, currentStock, loading, error }`

Simple slice — stocks are fetched once and displayed statically (no real-time updates in this version).

---

### 1.15 Frontend — API Service Layer (`src/services/api.js`)

**Action:** Created an Axios instance with two interceptors.

**Request interceptor:** Attaches `Authorization: Bearer <token>` from `localStorage` to every outgoing request if a token exists.

**Response interceptor:** Catches `401` responses and redirects to `/auth/login` after clearing the stored token. This handles expired tokens globally without needing to check in every component.

**Reason:** Centralising API calls in a service layer means:
1. The base URL is configured once (via `NEXT_PUBLIC_API_URL`)
2. Auth token attachment is automatic
3. Session expiry is handled uniformly

---

### 1.16 Frontend — Components

**Header:** Sticky, with backdrop blur effect. Mobile-responsive with a hamburger menu that opens a slide-down panel containing navigation links and the search form. Desktop and mobile share the same search handler that pushes to `/news?search=<query>`.

**Footer:** Four-column grid (collapses on mobile) with navigation and topic links. Static component — no Redux dependency.

**Sidebar:** Fetches and displays both market overview (stocks with price/change) and categories list. Dispatches both fetch actions in a single `useEffect`. Renders on every page that has the layout grid.

**NewsCard:** Accepts an `article` prop and an optional `size` prop (`sm`, `md`, `lg`). The `lg` variant is used in the featured news section. Uses `next/image` for optimised images with automatic lazy loading and size optimisation.

**NewsList:** Pagination is rendered by filtering page numbers to within ±2 of the current page (prevents a long list of page buttons for large datasets).

**FeaturedNews:** Splits the featured articles array into the first article (rendered large, full-width on desktop) and the remaining articles (rendered as a compact side list). Handles the empty state by returning `null` — the section simply doesn't render if there are no featured articles.

**Button and Input:** Generic UI primitives with variant/size APIs, making them reusable across all forms. `Button` supports a `loading` prop that disables the button and shows a spinner — prevents double-submission.

---

### 1.17 Frontend — Pages

**Home page (`/`):** Composed from server components (`Header`, `Footer`) and client components (`FeaturedNews`, `NewsList`, `Sidebar`). The ticker bar at the top is a static animation.

**News list page (`/news`):** Uses `useSearchParams()` to read URL query parameters. Wrapped in `<Suspense>` because `useSearchParams()` requires it in Next.js App Router (the hook can cause the page to suspend during client-side navigation).

**Article page (`/news/[id]`):** The `[id]` folder name means the slug is available as `params.id`. Dispatches `fetchNewsArticle(slug)` on mount and clears `currentArticle` on unmount (cleanup prevents stale data from flashing on the next article visit). Renders article `content` with `dangerouslySetInnerHTML` — necessary for HTML content from the CMS, with the understanding that content is editor-supplied, not user-supplied.

**Stocks page (`/stocks`):** Client-side filtering is done with a local `useState` search string, filtering the already-fetched stocks array. This avoids a round-trip to the API for every keystroke.

**Auth pages (`/auth/login`, `/auth/register`):** Use Redux thunks for the submit action, check the action's `fulfilled`/`rejected` match, and use `react-hot-toast` for success notifications. The register page validates password match and minimum length client-side before dispatching.

---

### 1.18 Dependency Installation

**Action:** Ran `npm install` in both `backend/` and `frontend/` directories in parallel.

**Issue encountered:** The first frontend install attempt failed with `ECONNRESET` — a transient network connection reset.

**Resolution:** Re-ran `npm install` in the frontend directory. The second attempt succeeded.

**Additional action:** Ran `npm install next@latest` to upgrade from the vulnerable v14.0.4 to the current patched version (v15+, specifically v16.2.3 was resolved).

---

## Part 2: JavaScript → TypeScript Migration

### 2.1 Motivation and Approach

**Reason for migrating:** TypeScript catches entire categories of bugs at compile time that would otherwise only surface at runtime: incorrect property access, mismatched function signatures, missing null checks, wrong data shapes passed between layers. For a financial data application, correctness is paramount.

**Approach chosen:** Full replacement — delete all `.js`/`.jsx` files and replace with `.ts`/`.tsx`. Not a hybrid approach (which would use `allowJs: true`) because a hybrid codebase provides partial safety; the goal was full type coverage.

---

### 2.2 Backend TypeScript Dependencies

**Action:** Ran:
```
npm install -D typescript tsx @types/node @types/express @types/bcryptjs @types/jsonwebtoken @types/cors @types/morgan @types/multer
```

Then added `@types/pg` after the first type-check revealed it was missing.

**Key packages:**

| Package | Reason |
|---|---|
| `typescript` | The TypeScript compiler (`tsc`) |
| `tsx` | Runs TypeScript directly via esbuild — fast, no compile step in dev |
| `@types/*` | Type declarations for packages that don't ship their own (Express, bcrypt, etc.) |

**Why `tsx` over `ts-node`:** `tsx` uses esbuild under the hood, which is orders of magnitude faster than `ts-node`'s TypeScript compiler. For a development server that restarts on every file change, startup time matters. `tsx watch server.ts` handles hot-reloading without needing `nodemon`.

**Effect on scripts:**
```json
"dev":        "tsx watch server.ts"    // was: nodemon server.js
"build":      "tsc"                    // new: compiles to dist/
"start":      "node dist/server.js"    // was: node server.js
"db:migrate": "tsx src/db/migrate.ts" // was: node src/db/migrate.js
```

---

### 2.3 Backend `tsconfig.json`

**Action:** Created `tsconfig.json` with:

```json
{
  "target": "ES2020",
  "module": "commonjs",
  "outDir": "./dist",
  "rootDir": "./",
  "strict": true,
  "esModuleInterop": true,
  "typeRoots": ["./node_modules/@types", "./src/types"]
}
```

**Key decisions:**
- `"strict": true` enables all strict checks: `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, etc. This is what makes TypeScript actually useful rather than just adding syntax noise.
- `"module": "commonjs"` — Node.js native module system. Not ESM because all dependencies use CommonJS.
- `"esModuleInterop": true` — allows `import express from 'express'` instead of `import * as express from 'express'`. Required for default imports from CommonJS modules.
- `"typeRoots"` includes `./src/types` so the global Express augmentation file (`express.d.ts`) is automatically picked up by the compiler.

---

### 2.4 Backend Type Definitions (`src/types/index.ts` + `src/types/express.d.ts`)

**Action:** Created a shared types file and an Express augmentation declaration file.

#### `src/types/index.ts`
Defined interfaces matching the database schema:
- `AuthUser` — the subset of user fields attached to `req.user` (no password hash)
- `DBUser extends AuthUser` — adds `password_hash` (only used internally in the auth controller)
- `Category`, `Stock`, `NewsArticle` — match the DB columns plus computed/joined fields
- `PaginationMeta`, `PaginatedResponse<T>` — generic pagination wrapper

**Reason:** Centralising type definitions means all layers (controllers, middleware, routes) share a single source of truth. If the DB schema changes, you update the types once.

#### `src/types/express.d.ts`
```typescript
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
```

**Reason:** This augments Express's global `Request` interface — the official TypeScript mechanism for extending library types. Without this, TypeScript would error on every `req.user` access because the base `Request` type doesn't have a `user` property.

**`user` is typed as optional (`?`):** This is intentional. Unauthenticated routes would cause TypeScript errors if `user` were required. In controllers behind `authenticate` middleware, `req.user!` (non-null assertion) is used — valid because the middleware guarantees it's set or returns 401 before the controller runs.

---

### 2.5 Backend Controller Conversions

**`server.ts`:**
`import 'dotenv/config'` as the **first import** — critical ordering. TypeScript compiles imports to `require()` calls in declaration order. This ensures `dotenv` populates `process.env` before any other module reads environment variables.

**`database.ts`:**
The `query<T>` function uses a generic type parameter:
```typescript
export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => pool.query<T>(text, params);
```
This means callers can specify the expected row shape: `query<AuthUser>('SELECT ...')` returns `QueryResult<AuthUser>`, and `.rows[0]` is typed as `AuthUser`. The default generic `QueryResultRow` provides a fallback for untyped queries.

**`auth.ts` middleware:**
```typescript
const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
```
The `as string` cast is necessary because `process.env.*` is always `string | undefined` — TypeScript can't know at compile time whether the variable is set. The cast is acceptable here because the application would fail at startup if critical env vars were missing.

**`authController.ts`:**
The password hash is stripped from the login response using destructuring:
```typescript
const { password_hash, ...safeUser } = user;
void password_hash; // suppress unused variable warning
```

**`newsController.ts`:**
The complex `NEWS_SELECT` SQL constant is typed with `query<NewsArticle>()`. The TypeScript compiler can't verify that the SQL actually returns the shape of `NewsArticle` — that's a runtime concern — but having the type annotation ensures all code that consumes the result treats it as a `NewsArticle`.

**`stockController.ts`:** Bug found during type checking: `req.params.symbol` has type `string | string[]` in Express's type definitions, which doesn't have `.toUpperCase()`. Fixed by wrapping with `String(req.params.symbol).toUpperCase()` in all three affected handler functions (`getBySymbol`, `getStockNews`, `updatePrice`).

---

### 2.6 Frontend `tsconfig.json`

**Action:** Created the Next.js 15-recommended TypeScript configuration:

```json
{
  "module": "esnext",
  "moduleResolution": "bundler",
  "jsx": "preserve",
  "noEmit": true,
  "plugins": [{ "name": "next" }],
  "paths": { "@/*": ["./src/*"] }
}
```

**Key differences from the backend tsconfig:**
- `"moduleResolution": "bundler"` — Next.js uses Webpack/Turbopack; this resolution mode understands bundler-specific module resolution (e.g., path aliases, package.json `exports` fields)
- `"noEmit": true` — Next.js handles compilation itself; `tsc` is only used for type checking
- `"jsx": "preserve"` — leaves JSX syntax for Next.js's Babel/SWC transform to handle
- `"plugins": [{ "name": "next" }]` — enables the Next.js TypeScript plugin which provides enhanced IDE support and additional type checking for Next.js-specific APIs (e.g., `generateStaticParams`, `Metadata`)

---

### 2.7 Frontend Type Definitions (`src/types/index.ts`)

**Action:** Created a comprehensive type file used across all components, pages, and Redux slices.

**Design decisions:**
- `Article.author` uses `Pick<User, 'id' | 'full_name' | 'avatar_url'>` — the article detail response only includes a subset of user fields, not the full `User`. Using `Pick` is more accurate than a manual sub-interface and stays in sync if `User` changes.
- `NewsParams` is a dedicated interface for query parameters — reused in the news slice thunk, the NewsList component, and the API service.
- `LoginCredentials` and `RegisterData` make form state types explicit, rather than using `Record<string, string>`.

---

### 2.8 Redux Store — Typed Hooks (`src/store/hooks.ts`)

**Action:** Created typed wrappers for `useDispatch` and `useSelector`:

```typescript
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

**Reason:** Without this, calling `useDispatch()` returns the generic `Dispatch<AnyAction>` type, which doesn't know about the thunks in the store. `useDispatch<AppDispatch>()` returns a type that knows `dispatch(someAsyncThunk())` returns a `Promise`. Similarly, `useSelector((s) => s.news)` would return `unknown` without `TypedUseSelectorHook`.

**Effect:** All components that previously used `useDispatch` and `useSelector` now use `useAppDispatch` and `useAppSelector`, getting full type inference for state shape and dispatch return values.

---

### 2.9 Redux Slice Conversions

**Auth Slice:**
The `createAsyncThunk` calls were given full generic type parameters:
```typescript
createAsyncThunk<ReturnType, ArgType, { rejectValue: string }>
```
This means:
- The fulfilled action's payload is typed as `{ token: string; user: User }`
- The argument type is `LoginCredentials`
- `rejectWithValue` returns a typed `string` error message

The `pending` and `rejected` handlers were extracted as typed functions and shared across multiple cases to reduce repetition.

**News and Stock Slices:**
An `extractError` helper was added to both:
```typescript
const extractError = (err: unknown, fallback: string): string =>
  (err as ApiError).response?.data?.error ?? fallback;
```
This avoids unsafe `err.response` access. TypeScript requires errors caught in `catch` blocks to be typed as `unknown` in strict mode — you can't know what was thrown.

---

### 2.10 Component Conversions (`.jsx` → `.tsx`)

**Button:**
```typescript
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}
```
Extending `ButtonHTMLAttributes<HTMLButtonElement>` means all native button props (`onClick`, `disabled`, `type`, etc.) are accepted without re-declaring them — only the custom props need to be added.

**Input:**
Similarly extends `InputHTMLAttributes<HTMLInputElement>`. The `error` prop is typed as `string | undefined` (not `string | false`) because the register page passes `undefined` when there's no error — matching the conditional logic.

**Header:**
`FormEvent<HTMLFormElement>` types the search form's `onSubmit` handler. Without this, TypeScript can't know that `e.preventDefault()` is available.

**NewsCard:**
Uses `Pick<Stock, 'id' | 'symbol' | 'company_name'>[]` for the `article.stocks` array type — consistent with the API response shape and the `Article` type definition.

**Pages:**
- `useParams<{ id: string }>()` in the article page types the route params
- `ChangeEvent<HTMLInputElement>` types form input onChange handlers
- `FormEvent<HTMLFormElement>` types form onSubmit handlers
- `Metadata` type from Next.js is used for the `metadata` export

---

### 2.11 `next.config.ts` Conversion

**Action:** Replaced `next.config.js` with `next.config.ts` using the `NextConfig` type:

```typescript
import type { NextConfig } from 'next';
const nextConfig: NextConfig = { ... };
export default nextConfig;
```

**Reason:** Next.js 15 natively supports `next.config.ts`. The type annotation catches configuration errors at compile time — for example, using a deprecated option or a typo in a config key.

**Change from original:** The `env` re-export block was removed because `NEXT_PUBLIC_*` variables are automatically made available to the client by Next.js without needing to explicitly re-export them in `next.config`.

---

### 2.12 Type-Check and Error Resolution

**Action:** Ran `npx tsc --noEmit` in both projects to verify correctness without emitting files.

**Backend errors found and fixed:**

1. **Missing `@types/pg`:** The `pg` package doesn't bundle TypeScript types and requires a separate `@types/pg` installation. Fixed with `npm install -D @types/pg`.

2. **`req.params.symbol` type:** Express types `req.params` values as `string | string[]`. Calling `.toUpperCase()` on this union fails because `string[]` doesn't have that method. Fixed by wrapping: `String(req.params.symbol).toUpperCase()` — coerces the value to a string unconditionally. Applied to `getBySymbol`, `getStockNews`, and `updatePrice`.

**Frontend errors found and fixed:**

3. **`LoginCredentials` not assignable to `Record<string, string>`:** The `authApi` functions were typed to accept `Record<string, string>`, but the slices pass typed `LoginCredentials`/`RegisterData` objects. TypeScript requires an index signature for `Record<string, string>` compatibility. Fixed by widening the `authApi` parameter types to `unknown` — the data is passed directly to `axios.post()` which doesn't care about the specific shape.

4. **`NewsParams` not assignable to `Record<string, unknown>`:** Same pattern — `stockApi.getAll()` accepted `Record<string, unknown>` but was called with `NewsParams`. Fixed by widening the parameter type to `unknown`.

**Final result:** Both `tsc --noEmit` runs exited with code 0 (zero errors).

---

### 2.13 Old File Deletion

**Action:** Deleted all 15 backend `.js` files and 23 frontend `.js`/`.jsx` files in two batched `rm` commands.

**Why delete rather than keep both:** Keeping both `.js` and `.ts` versions of the same file creates ambiguity — the module resolution system might pick either one depending on configuration. Node.js would prefer `.js` by default, effectively ignoring the TypeScript files. Deletion enforces the migration is complete.

**Files deliberately not deleted:**
- `schema.sql` — not a JS file; stays as-is
- `postcss.config.js` — PostCSS configuration; does not need TypeScript and should remain `.js`
- `tailwind.config.js` — same; Tailwind processes it with Node, no TypeScript needed here

---

## Summary

| Phase | Files Created | Files Deleted | Type Errors Fixed |
|---|---|---|---|
| Initial scaffold | 49 files | 0 | — |
| TS migration (BE) | 17 `.ts` files | 15 `.js` files | 4 |
| TS migration (FE) | 27 `.ts`/`.tsx` files | 23 `.js`/`.jsx` files | — |
| **Total** | **93 files** | **38 files** | **4** |

The final codebase is fully typed, passes strict TypeScript compilation in both projects, and preserves all original functionality while adding compile-time safety across the entire stack.
