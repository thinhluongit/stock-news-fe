# Responsive Design Integration — ThanhDangBullish Frontend

## Context
The project is a Next.js 16 + React 18 + Tailwind CSS v3 stock market news app with a dark theme. Responsive foundations exist (mobile hamburger menu, overflow-x-auto on the stocks table, basic grid breakpoints), but several gaps remain:
- A bug in `tailwind.config.js` removes all default Tailwind animations (`animate-spin`, `animate-pulse`, etc.) because `animation`/`keyframes` are placed at `theme.*` instead of `theme.extend.*`
- Missing tablet breakpoints in the featured news grid
- Sidebar is not sticky on desktop — scrolls away immediately on long pages
- NewsList grid jumps from 2 → 3 columns at `xl` (1280px) instead of `lg` (1024px)
- Touch targets on mobile nav/auth buttons fall below the 44px accessibility minimum
- Auth form cards use `p-8` with no reduction on narrow phones
- The stocks table exposes all 7 columns (including low-priority Exchange/Sector) on mobile
- Article content headings are desktop-sized with no mobile scaling
- The featured-news side article image containers have no explicit height, breaking Next.js Image `fill`

---

## Files to Modify

| File | What changes |
|------|-------------|
| `frontend/tailwind.config.js` | Move `animation` + `keyframes` inside `extend` (bug fix) |
| `frontend/src/app/globals.css` | Shrink article heading sizes to mobile-friendly defaults |
| `frontend/src/app/layout.tsx` | Add explicit `viewport` export (Next.js App Router pattern) |
| `frontend/src/components/layout/Header.tsx` | Increase touch targets on mobile nav/auth links |
| `frontend/src/components/layout/Sidebar.tsx` | Add `lg:sticky lg:top-24` for desktop sticky behaviour |
| `frontend/src/components/news/FeaturedNews.tsx` | Add `sm:` breakpoint for side-article grid; fix image container height |
| `frontend/src/components/news/NewsList.tsx` | `xl:grid-cols-3` → `lg:grid-cols-3`; enlarge pagination touch targets |
| `frontend/src/app/auth/login/page.tsx` | Form card `p-8` → `p-5 sm:p-8` |
| `frontend/src/app/auth/register/page.tsx` | Form card `p-8` → `p-5 sm:p-8` |
| `frontend/src/app/stocks/page.tsx` | Hide `Exchange` + `Sector` columns below `md`; add scroll-hint text |

---

## Change Details

### 1. `tailwind.config.js` — fix animation bug
Move `animation` and `keyframes` from `theme.*` into `theme.extend.*` so they merge with Tailwind's built-ins (`animate-spin`, `animate-pulse`, etc.) instead of replacing them.

```js
// Before (broken — removes all default animations)
theme: {
  extend: { colors: {...}, fontFamily: {...} },
  animation: { marquee: '...' },
  keyframes: { marquee: {...} },
}

// After
theme: {
  extend: {
    colors: {...},
    fontFamily: {...},
    animation: { marquee: 'marquee 30s linear infinite' },
    keyframes: { marquee: { '0%': {...}, '100%': {...} } },
  },
}
```

### 2. `globals.css` — mobile article typography
Scale heading sizes down so they don't overflow on phones. Before: `h1 text-3xl`, `h2 text-2xl`, `h3 text-xl`. After: `h1 text-2xl`, `h2 text-xl`, `h3 text-lg` (these are more readable on 375px-wide screens; the article page already uses `text-2xl sm:text-3xl` for the article title itself).

### 3. `layout.tsx` — explicit viewport
Add `export const viewport: Viewport = { width: 'device-width', initialScale: 1 }` alongside the existing `metadata` export (Next.js 13+ canonical pattern).

### 4. `Header.tsx` — touch targets
- Mobile nav links: `py-2` → `py-3` (~48px tap height)
- Login link: `py-1.5` → `py-2`
- Sign Up link: `py-1.5` → `py-2`
- Logout button: `py-1` → `py-1.5`

### 5. `Sidebar.tsx` — sticky on desktop
Change `<aside className="space-y-6">` to `<aside className="space-y-6 lg:sticky lg:top-24">`.
`top-24` (96px) = 64px header + 32px breathing room.

### 6. `FeaturedNews.tsx` — tablet layout + image fix
**Grid change:**
```jsx
// Side container: was "lg:col-span-2 space-y-3"
// becomes a responsive grid that shows 2 cols on sm–md then stacks on lg
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 lg:col-span-2 gap-3">
```
This gives:
- Mobile (<640px): main full width, side articles stacked 1-col below
- sm–md (640–1023px): main full width, side articles in 2-col row below
- Desktop (1024px+): original 3-left + 2-right layout

**Image container fix:**  
`<div className="relative w-24 flex-shrink-0 bg-gray-800">` → add `h-24` so Next.js Image `fill` has a defined height to render into.

### 7. `NewsList.tsx` — grid + pagination
- `xl:grid-cols-3` → `lg:grid-cols-3` (3-col at 1024px, not 1280px)
- Page number buttons: `w-9 h-9` → `w-10 h-10`
- Prev/Next buttons: `py-2` → `py-2.5`

### 8. Auth pages — form card padding
`<div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">` → `p-5 sm:p-8` in both `login/page.tsx` and `register/page.tsx`.

### 9. `stocks/page.tsx` — mobile-friendly table
Hide low-priority columns at narrow widths:
- `Exchange` column `<th>` + `<td>`: add `hidden sm:table-cell`
- `Sector` column `<th>` + `<td>`: add `hidden md:table-cell`
- Add `<p className="text-xs text-gray-600 mt-2 sm:hidden">Scroll horizontally to see more →</p>` below the table wrapper so mobile users know it scrolls.

This requires changing the header row from a `.map()` over a string array to individual `<th>` elements (or a column config array with a `hideClass` property).

---

## Verification
1. Start the dev server: `cd frontend && npm run dev`
2. Open browser DevTools → toggle device toolbar
3. At **375px (iPhone SE)**: header hamburger works, featured news is 1-col, side articles stack, auth form card has comfortable padding, stocks table shows 5 cols with scroll hint, article content headings fit without overflow
4. At **640px (sm)**: side articles become a 2-col grid, news list is 2-col
5. At **768px (md)**: stocks table shows Exchange column
6. At **1024px (lg)**: full desktop layout — sidebar sticky, news list goes to 3 columns, featured news is 3+2
7. Check loading spinners (`Loader2` / `animate-spin`) display correctly after the tailwind config fix
