# Bug Fix Report: EditorJS Content Rendered as Raw JSON on Article Page

## Bug Summary

Visiting an article page (e.g., `/news/chung-khoan-164`) displayed the raw EditorJS JSON object as plain text on screen instead of the rendered article body.

**Symptom:**

```
{"time":1776331222366,"blocks":[{"id":"MaNw8l4giS","type":"paragraph","data":{"text":"Hội thảo do Học viện Báo chí và Tuyên truyền..."}}],"version":"2.31.6"}
```

---

## Root Cause

**File:** `src/app/news/[id]/page.tsx` (line 102–103)

The article content is authored using the **EditorJS** rich-text editor and stored in the database as a serialized JSON string in EditorJS's `OutputData` format:

```json
{
  "time": 1776331222366,
  "blocks": [
    {
      "id": "MaNw8l4giS",
      "type": "paragraph",
      "data": { "text": "Hội thảo do Học viện Báo chí..." }
    }
  ],
  "version": "2.31.6"
}
```

The article page rendered this string directly:

```tsx
<div className="article-content"
  dangerouslySetInnerHTML={{ __html: article.content ?? '' }} />
```

`dangerouslySetInnerHTML` expects an **HTML string**, not a JSON string. Since the JSON was not valid HTML, React injected it as literal text into the DOM, which is exactly what the user saw on screen.

---

## Fix

### 1. Created `src/lib/editorjs-renderer.ts`

A new utility module that converts an EditorJS `OutputData` JSON string into an HTML string.

**How it works:**

1. Attempts to `JSON.parse` the content string
2. If the result contains a `blocks` array, maps each block to its HTML equivalent using a `renderBlock` switch
3. If parsing fails (legacy plain-HTML content), returns the original string unchanged — backwards compatible

**Block types handled:**

| Block type  | Output HTML                               |
|-------------|-------------------------------------------|
| `paragraph` | `<p>text</p>`                             |
| `header`    | `<h2>` through `<h6>` based on `level`   |
| `list`      | `<ul>` or `<ol>` with `<li>` items       |
| `quote`     | `<blockquote>text<cite>caption</cite></blockquote>` |
| `image`     | `<figure><img /><figcaption /></figure>`  |
| `embed`     | `<figure><iframe /></figure>`             |
| `delimiter` | `<hr />`                                  |

Inline formatting applied by EditorJS's inline toolbar (`<b>`, `<i>`, `<a>`, `<code>`) is preserved because it lives inside block `data.text` values as HTML markup, which passes through unchanged.

### 2. Updated `src/app/news/[id]/page.tsx`

Replaced the direct content passthrough with the renderer:

**Before:**
```tsx
import { formatDate } from '../../../lib/utils';
// ...
<div className="article-content"
  dangerouslySetInnerHTML={{ __html: article.content ?? '' }} />
```

**After:**
```tsx
import { formatDate } from '../../../lib/utils';
import { renderEditorContent } from '../../../lib/editorjs-renderer';
// ...
<div className="article-content"
  dangerouslySetInnerHTML={{ __html: renderEditorContent(article.content) }} />
```

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/editorjs-renderer.ts` | **Created** — EditorJS JSON → HTML converter |
| `src/app/news/[id]/page.tsx` | **Updated** — import and use `renderEditorContent` |

---

## Technologies Involved

| Technology | Role in this fix |
|---|---|
| **EditorJS** (`@editorjs/editorjs`) | Rich-text editor used to author posts; stores output as `OutputData` JSON |
| **EditorJS plugins** | `@editorjs/header`, `@editorjs/list`, `@editorjs/quote`, `@editorjs/image`, `@editorjs/embed` — define the block types that the renderer handles |
| **React** `dangerouslySetInnerHTML` | Injects the rendered HTML string into the DOM |
| **TypeScript** | Typed the `EditorBlock` and `EditorData` interfaces in the renderer |

---

## Verification

- `npm run build` completed successfully with no TypeScript errors
- Visiting `/news/chung-khoan-164` now renders the article body as formatted HTML paragraphs instead of the raw JSON string
- The renderer falls back gracefully for any content that is not valid EditorJS JSON (e.g., legacy plain HTML), so no other articles are affected
