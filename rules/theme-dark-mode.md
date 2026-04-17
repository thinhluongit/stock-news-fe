# Rule: Theme & Dark Mode

## Overview

This project supports light and dark themes via `next-themes`. The theme is stored in `localStorage` and applied by toggling `class="dark"` on `<html>`. Tailwind CSS reads this class to activate `dark:` prefixed utilities.

**Infrastructure files:**
- `tailwind.config.js` — `darkMode: 'class'`
- `src/app/providers.tsx` — `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>`
- `src/app/layout.tsx` — `<html suppressHydrationWarning>` + base body classes
- `src/components/layout/Header.tsx` — toggle button (Sun/Moon icons)

---

## Rule 1 — Always write both a light default and a dark variant

Every Tailwind background, text, and border class must have a light default and a `dark:` variant. Never write an unconditional dark value.

**Wrong:**
```tsx
<div className="bg-gray-900 text-white border border-gray-800">
```

**Correct:**
```tsx
<div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800">
```

**Why:** Tailwind's `dark:` prefix only activates when `<html class="dark">` is set by `next-themes`. An unconditional class like `bg-gray-900` renders the same color regardless of theme — it completely ignores the toggle.

---

## Rule 2 — Use the standard color mapping

Apply this mapping consistently across all components and pages:

| Hardcoded dark | Light default + dark variant |
|---|---|
| `bg-gray-950` | `bg-white dark:bg-gray-950` |
| `bg-gray-900` | `bg-gray-50 dark:bg-gray-900` |
| `bg-gray-800` | `bg-gray-100 dark:bg-gray-800` |
| `bg-gray-700` | `bg-gray-200 dark:bg-gray-700` |
| `text-white` | `text-gray-900 dark:text-white` |
| `text-gray-300` | `text-gray-700 dark:text-gray-300` |
| `text-gray-400` | `text-gray-600 dark:text-gray-400` |
| `border-gray-800` | `border-gray-200 dark:border-gray-800` |
| `border-gray-700` | `border-gray-300 dark:border-gray-700` |
| `hover:bg-gray-800` | `hover:bg-gray-100 dark:hover:bg-gray-800` |
| `hover:bg-gray-700` | `hover:bg-gray-200 dark:hover:bg-gray-700` |
| `divide-gray-800` | `divide-gray-200 dark:divide-gray-800` |
| `bg-black/60` (modal backdrop) | `bg-black/30 dark:bg-black/60` |

---

## Rule 3 — Do NOT add dark: variants to semantic/accent colors

The following colors are intentionally fixed and should not have `dark:` variants. They serve a semantic role (positive/negative, status) that is independent of theme:

```
text-green-400    bg-green-500    text-green-600
text-red-400      bg-red-600      bg-red-500/20
text-yellow-400   bg-yellow-500/10
text-purple-400   bg-purple-500/20
text-blue-400     bg-blue-500/20
```

**Also leave unchanged:**
- Conditional bullish/bearish classes: `s.change >= 0 ? 'text-green-400' : 'text-red-400'`
- Database-driven inline styles: `style={{ backgroundColor: category.color }}`

---

## Rule 4 — Modal backdrops use lighter overlay in light mode

```tsx
// Correct — lighter scrim in light mode, heavier in dark
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60 backdrop-blur-sm">
  <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-6 ...">
```

---

## Rule 5 — Use the `mounted` guard for JS theme detection

`useTheme()` returns `undefined` on the server. If you render different UI based on the current theme before mount, React throws a hydration mismatch error.

**Wrong:**
```tsx
const { theme } = useTheme();
return theme === 'dark' ? <Sun /> : <Moon />;  // hydration mismatch!
```

**Correct (Pattern A — Tailwind only, preferred):**
```tsx
// No JS needed — let dark: variants handle it entirely
<div className="bg-gray-50 dark:bg-gray-900">
```

**Correct (Pattern B — JS theme detection, only when necessary):**
```tsx
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

const { resolvedTheme } = useTheme();
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

// Server renders nothing; client hydrates the same; then shows correct icon after mount
{mounted && (resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />)}
```

Use Pattern B **only** when a JavaScript expression must vary by theme (e.g., a canvas color, computed inline style, chart palette). For all CSS-based differences, use Pattern A.

**Use `resolvedTheme` not `theme`** — `resolvedTheme` is the value after `localStorage` is read and the system preference is resolved.

**Default `isDark` to `true`** before mount to match `defaultTheme="dark"`:
```tsx
const isDark = !mounted || resolvedTheme === 'dark';
```

---

## Rule 6 — `suppressHydrationWarning` on `<html>` is required

`next-themes` mutates `class` on `<html>` after the server render. Without `suppressHydrationWarning`, React logs a hydration warning on every page load.

```tsx
// src/app/layout.tsx
<html lang="en" suppressHydrationWarning>
```

Do not remove this attribute.

---

## Rule 7 — The `transition-colors` utility makes theme switching smooth

Add `transition-colors` (or `transition-colors duration-200`) to any element that changes color on theme switch to avoid jarring hard cuts:

```tsx
<div className="bg-white dark:bg-gray-950 transition-colors duration-200">
```

The root `<body>` in `layout.tsx` already carries `transition-colors duration-200`.
