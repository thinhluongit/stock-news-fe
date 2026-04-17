# Plan: Dark / Light Theme Toggle in Header

## Context

The app is fully hardcoded dark theme (gray-950 backgrounds, gray-100 text, green accents). No `next-themes`, no Tailwind `darkMode`, no `dark:` classes exist anywhere. The user wants a toggle button added to `Header.tsx` that switches the entire app between dark and light modes. The toggle must persist across page loads.

---

## Approach

Use **`next-themes`** (industry standard for Next.js) with **Tailwind `darkMode: 'class'`**. This adds/removes `class="dark"` on `<html>`, persists preference to `localStorage`, and handles SSR flash prevention.

Scope: infrastructure setup + full Header theming. Other pages/components keep their existing dark classes as `dark:` variants — their light-mode appearance will be handled by globals.css base defaults and can be extended later.

---

## Step 1 — Install `next-themes`

```bash
npm install next-themes
```

---

## Step 2 — Enable Tailwind dark mode

**File:** `tailwind.config.js`

Add one line at the top level:

```js
module.exports = {
  darkMode: 'class',   // ← add this
  content: [...],
  theme: { ... },
  plugins: [],
};
```

---

## Step 3 — Add `ThemeProvider` to Providers

**File:** `src/app/providers.tsx`

- Import `ThemeProvider` from `next-themes`
- Wrap the existing tree with it (outermost wrapper)
- `attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}`

```tsx
import { ThemeProvider } from 'next-themes';

export default function Providers({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <LocaleProvider>
        <Provider store={store}>
          ...
        </Provider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
```

Also update the hardcoded dark Toaster style to be theme-aware by moving `style` to `className` or accepting both light/dark values.

---

## Step 4 — Fix `<html>` for SSR hydration

**File:** `src/app/layout.tsx`

- Add `suppressHydrationWarning` to `<html>` (required by next-themes to avoid mismatch warning)
- Add light/dark base classes to `<body>`:

```tsx
<html lang="en" suppressHydrationWarning>
  <body className="bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors duration-200">
    <Providers>{children}</Providers>
  </body>
</html>
```

---

## Step 5 — Update `globals.css` base body

**File:** `src/app/globals.css`

Replace hardcoded dark body with light defaults (dark: variants are now on the `<body>` element in layout.tsx):

```css
@layer base {
  body {
    @apply font-sans antialiased;   /* remove bg-gray-950 text-gray-100 */
  }
}
```

The background and text colors are now controlled by the `<body>` className in `layout.tsx`.

---

## Step 6 — Add toggle + full light/dark theming to Header

**File:** `src/components/layout/Header.tsx`

### Additions
- Import `useTheme` from `next-themes`
- Import `Sun`, `Moon` from `lucide-react`
- Add `const { theme, setTheme } = useTheme()` inside the component
- Add a toggle button between the language switcher and the user/login section

### Toggle button
```tsx
<button
  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
  aria-label="Toggle theme"
  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
>
  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
</button>
```

### Class replacements (dark → light + dark: variant)

| Element | Before | After |
|---|---|---|
| `<header>` | `bg-gray-900/95 border-gray-800` | `bg-white/95 border-gray-200 dark:bg-gray-900/95 dark:border-gray-800` |
| Desktop nav links | `text-gray-300 hover:text-white hover:bg-gray-800` | `text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800` |
| Search input | `bg-gray-800 text-gray-100 border-gray-700` | `bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700` |
| Language button | `bg-gray-800 border-gray-700 text-gray-300 hover:text-white hover:border-gray-600` | `bg-gray-100 border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white dark:hover:border-gray-600` |
| User name | `text-gray-300` | `text-gray-700 dark:text-gray-300` |
| Logout button | `text-gray-400 hover:text-red-400 hover:bg-gray-800` | `text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-gray-800` |
| Login link | `text-gray-300 hover:text-white hover:bg-gray-800` | `text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800` |
| Mobile hamburger | `text-gray-400 hover:text-white` | `text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white` |
| Mobile menu border | `border-gray-800` | `border-gray-200 dark:border-gray-800` |
| Mobile nav links | same as desktop nav | same as desktop nav |
| Mobile search input | same as desktop search | same as desktop search |

---

## Critical Files

| File | Change |
|---|---|
| `package.json` | Install `next-themes` |
| `tailwind.config.js` | Add `darkMode: 'class'` |
| `src/app/providers.tsx` | Wrap with `ThemeProvider` |
| `src/app/layout.tsx` | `suppressHydrationWarning` + body dark: classes |
| `src/app/globals.css` | Remove hardcoded dark from body |
| `src/components/layout/Header.tsx` | Toggle button + all dark: variants |

---

## Verification

1. `npm run dev` — app opens in dark mode (default)
2. Click the toggle (Sun/Moon icon) in the Header → app switches to light mode — page background becomes light, Header becomes white
3. Refresh the page → light mode persists (localStorage `theme` key = `"light"`)
4. Toggle back to dark → dark mode restores
5. `npm run build` — TypeScript passes cleanly
