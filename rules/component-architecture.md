# Rule: Component Architecture

## Overview

Components live under `src/components/` organized by domain. Pages live under `src/app/`. UI primitives (inputs, buttons) are in `src/components/ui/`. All components are React functional components written in TypeScript.

---

## Rule 1 — Directory structure

```
src/
  components/
    layout/       Header.tsx, Footer.tsx, Sidebar.tsx     — present on every page
    news/         NewsCard.tsx, NewsList.tsx, FeaturedNews.tsx
    editor/       EditorBlock.tsx                          — heavy/dynamic, SSR-disabled
    ui/           Input.tsx, Button.tsx                    — reusable primitives
  app/
    page.tsx                    — home
    news/[id]/page.tsx          — public article
    admin/layout.tsx            — admin shell (role-gated)
    admin/posts/page.tsx        — admin CRUD pages
    dashboard/layout.tsx        — dashboard shell (editor/admin-gated)
  lib/
    utils.ts                    — cn(), formatDate(), formatNumber(), etc.
    editorjs-renderer.ts        — EditorJS JSON → HTML converter
  store/
    slices/                     — Redux Toolkit slices
  services/
    api.ts                      — Axios instance + all endpoint groups
  i18n/
    LocaleContext.tsx           — useLocale() hook
    locales/en.json, vi.json    — translation strings
  types/
    index.ts                    — shared TypeScript interfaces
```

---

## Rule 2 — File naming: PascalCase for components, camelCase for utilities

```
NewsCard.tsx       ✓  (component)
editorjs-renderer.ts ✓  (utility module)
newsCard.tsx       ✗
news-card.tsx      ✗
```

---

## Rule 3 — Export pattern

Use `export default function` for page and layout components. Named exports for utilities and types:

```tsx
// Component (page or layout)
export default function AdminPostsPage() { ... }

// Utility
export function cn(...inputs: ClassValue[]): string { ... }
export function renderEditorContent(content: string | null | undefined): string { ... }

// Type re-export
export type { Article, Category, User } from './types';
```

---

## Rule 4 — Props typing with explicit interfaces

Always define an explicit interface for component props. Extend HTML element attributes when the component wraps a native element:

```tsx
// Wrapping a native element — extend its attributes
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

// Composing data — define your own shape
interface NewsCardProps {
  article: Article;
  size?: 'sm' | 'md' | 'lg';
}

// Children prop
interface LayoutProps {
  children: React.ReactNode;
}
```

Use `import type` for type-only imports to keep the bundle clean:
```tsx
import type { Article, Category } from '../../types';
```

---

## Rule 5 — Use `cn()` for conditional class merging

`cn()` from `src/lib/utils.ts` combines `clsx` and `tailwind-merge`. Use it whenever classes are conditionally applied to avoid conflicts:

```tsx
import { cn } from '../../lib/utils';

// Simple conditional
<div className={cn(
  'base-classes',
  isActive && 'active-class',
  isError && 'error-class',
  className  // always accept and merge external className
)}>

// Variant lookup
const variants: Record<Variant, string> = {
  primary: 'bg-green-500 hover:bg-green-600 text-white',
  secondary: 'bg-gray-200 dark:bg-gray-700 ...',
};
<button className={cn('base', variants[variant], className)}>
```

---

## Rule 6 — Use the `Button` component for all interactive buttons

`src/components/ui/Button.tsx` supports `variant` and `size` props. Use it instead of writing raw `<button>` elements for standalone actions:

```tsx
import Button from '../../components/ui/Button';

<Button variant="primary" size="lg" loading={saving} onClick={handleSubmit}>
  Save Draft
</Button>

<Button variant="danger" size="sm" onClick={() => setDeleteId(id)}>
  Delete
</Button>
```

**Variants:** `primary` (green), `secondary` (gray), `danger` (red), `ghost` (transparent), `outline` (bordered)
**Sizes:** `sm`, `md`, `lg`

**Exception:** Inline icon-only action buttons within tables use raw `<button>` elements for compactness:
```tsx
<button className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
  <Pencil size={14} />
</button>
```

---

## Rule 7 — Use the `Input` component for text fields on standalone forms

`src/components/ui/Input.tsx` handles label, error state, and consistent styling:

```tsx
import Input from '../../components/ui/Input';

<Input
  label="Email"
  id="email"
  name="email"
  type="email"
  value={form.email}
  onChange={handleChange}
  error={errors.email}
  required
  autoComplete="email"
/>
```

**Exception:** Inline inputs within table rows or filter bars use raw `<input>` / `<select>` / `<textarea>` elements with the project's standard class string:
```tsx
// Standard inline input class string
className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500"
```

---

## Rule 8 — Icons come exclusively from `lucide-react`

```tsx
import { Pencil, Trash2, ChevronLeft, Loader2, Sun, Moon } from 'lucide-react';
```

Standard sizes used in this project:
- `size={14}` — inline table action icons
- `size={16}` — navigation/header icons
- `size={18}` — back navigation chevrons
- `size={24}` — loader spinners in content areas
- `size={28}` or `size={32}` — page-level loading states

---

## Rule 9 — Loading states use `Loader2` with `animate-spin`

```tsx
import { Loader2 } from 'lucide-react';

// Full-page loading
<div className="flex justify-center py-12">
  <Loader2 className="animate-spin text-green-400" size={24} />
</div>

// Inline button loading
<button disabled={saving}>
  {saving && <Loader2 size={13} className="animate-spin" />}
  Save
</button>
```

---

## Rule 10 — Heavy components are loaded with `next/dynamic` and `ssr: false`

The EditorJS editor requires browser APIs and cannot be server-rendered:

```tsx
import dynamic from 'next/dynamic';

const EditorBlock = dynamic(
  () => import('../../../../components/editor/EditorBlock'),
  { ssr: false }
);
```

Apply this pattern to any component that uses `window`, `document`, or browser-only libraries.

---

## Rule 11 — Error and success banners follow a consistent pattern

```tsx
{error && (
  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
    {error}
  </div>
)}

{saved && (
  <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm">
    {t('admin.save_success')}
  </div>
)}
```

For toast notifications (triggered by user actions), use `react-hot-toast`:
```tsx
import toast from 'react-hot-toast';

toast.success('Saved!');
toast.error('Something went wrong');
```

---

## Rule 12 — Confirm dialogs are local `ConfirmDialog` components within the same file

Destructive actions (delete) show a confirmation modal. Define it as a local function component at the top of the file:

```tsx
function ConfirmDialog({ message, onConfirm, onCancel }: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <p className="text-gray-900 dark:text-white text-sm mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Usage: controlled by a state variable holding the target ID
const [deleteId, setDeleteId] = useState<string | null>(null);

{deleteId && (
  <ConfirmDialog
    message={t('admin.actions.confirm_delete')}
    onConfirm={handleDelete}
    onCancel={() => setDeleteId(null)}
  />
)}
```
