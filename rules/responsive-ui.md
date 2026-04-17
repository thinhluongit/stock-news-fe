# Rule: Responsive UI

## Overview

All layouts are **mobile-first**. The base (no prefix) styles target mobile. Larger breakpoints progressively enhance the layout. The project uses Tailwind's standard breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).

---

## Rule 1 — Write mobile styles first, add breakpoints to enhance

Never write desktop-first styles and override down. Write for the smallest screen first, then layer larger breakpoints on top.

**Wrong (desktop-first):**
```tsx
<div className="grid-cols-4 sm:grid-cols-1">
```

**Correct (mobile-first):**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
```

---

## Rule 2 — Standard breakpoint usage in this project

| Breakpoint | Width | Common use |
|---|---|---|
| *(none)* | 0px+ | Mobile — single column, full width, stacked |
| `sm:` | 640px+ | 2-column grids, row layout for filter bars |
| `md:` | 768px+ | Show/hide secondary table columns, desktop nav |
| `lg:` | 1024px+ | Main page layout split (content + sidebar), 3–5 column grids |
| `xl:` | 1280px+ | Extra detail columns in tables (rarely needed) |

---

## Rule 3 — Page layout: content + sidebar uses `lg:` grid

All public pages with a sidebar follow this pattern:

```tsx
// src/app/news/page.tsx, src/app/page.tsx
<main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
    <div className="lg:col-span-3">
      {/* Main content */}
    </div>
    <div className="lg:col-span-1">
      <Sidebar />
    </div>
  </div>
</main>
```

The sidebar is `lg:sticky lg:top-24` and only visible as a column at `lg:` and above. Below `lg`, it stacks below the main content.

---

## Rule 4 — News card grids use `sm:` and `lg:` progression

```tsx
// src/components/news/NewsList.tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
```

- Mobile: 1 column (full width cards)
- Tablet (`sm:`): 2 columns
- Desktop (`lg:`): 3 columns

---

## Rule 5 — Table columns use `hidden` + breakpoint to progressively reveal detail

In admin and dashboard tables, show fewer columns on mobile and reveal more at larger breakpoints:

```tsx
<th className="hidden md:table-cell">Author</th>      {/* visible ≥ 768px */}
<th className="hidden lg:table-cell">Featured</th>    {/* visible ≥ 1024px */}
<th className="hidden xl:table-cell">Views</th>       {/* visible ≥ 1280px */}
<th className="hidden xl:table-cell">Date</th>        {/* visible ≥ 1280px */}
```

The matching `<td>` must carry the same class:
```tsx
<td className="hidden md:table-cell">{a.author?.full_name}</td>
```

**Always keep visible (no hide):** Title/name column, status column, Actions column.

**Mobile fallback — inline secondary info in the title cell:**
```tsx
<td className="px-4 py-3">
  <p className="text-gray-900 dark:text-white font-medium">{a.title}</p>
  {/* Show status badge inline on mobile when status column is hidden */}
  <div className="flex items-center gap-2 mt-0.5 sm:hidden">
    <span className={`text-xs px-1.5 py-0.5 rounded-full ${DOC_STATUS_COLORS[ds]}`}>
      {DOC_STATUS_LABEL[ds]}
    </span>
  </div>
</td>
```

---

## Rule 6 — Filter bars stack vertically on mobile, row on `sm:`

```tsx
// Admin list pages
<div className="flex flex-col sm:flex-row gap-3">
  <input className="flex-1 ..." />   {/* full width mobile, flexible desktop */}
  <select className="..." />          {/* stacks below on mobile */}
</div>
```

---

## Rule 7 — Admin/dashboard sidebars are fixed-width, not responsive

The admin and dashboard panel sidebars are `w-60 flex-shrink-0` — always visible on all screen sizes. There is no mobile hamburger menu. The layout uses `flex` row with `min-w-0` on the main content area to allow proper shrinking:

```tsx
<div className="min-h-screen bg-white dark:bg-gray-950 flex">
  <aside className="w-60 flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-r ...">
    {/* Always visible sidebar */}
  </aside>
  <div className="flex-1 flex flex-col min-w-0">
    {/* min-w-0 prevents flex children from overflowing */}
    <main className="flex-1 p-6 overflow-y-auto">
      {children}
    </main>
  </div>
</div>
```

---

## Rule 8 — Use `max-w-*` containers to constrain form pages

Detail/edit pages (not tables) use a `max-w-*` wrapper to keep forms readable on wide screens:

```tsx
// Single-entity edit pages
<div className="max-w-lg space-y-5">   {/* user edit */}
<div className="max-w-2xl space-y-5">  {/* post edit */}
<div className="max-w-3xl space-y-5">  {/* full post editor */}
```

---

## Rule 9 — Page max-width is `max-w-7xl` with horizontal padding

```tsx
<main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
```

- `px-4` on mobile, `px-6` on `sm:` and above
- Always `mx-auto` to center

---

## Rule 10 — Images use `next/image` with `fill` for responsive containers

```tsx
<div className="relative w-full h-72 sm:h-96 rounded-xl overflow-hidden">
  <Image src={url} alt={title} fill className="object-cover" />
</div>
```

- Container is `relative` with an explicit height
- `fill` makes the image expand to fill the container
- Height increases at `sm:` for a taller hero on larger screens
- `object-cover` maintains aspect ratio with cropping
