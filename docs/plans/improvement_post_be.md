# Backend Changes Required — Frontend Improvement Alignment

This document covers every backend implication of the frontend changes made in this project:
server-side featured news fetching, EditorJS inline formatting tools (underline, text colour,
delimiter), the EditorBlock double-init bug fix, and the video renderer fix.

---

## 1. HTML Sanitization — Allow New Inline Tags

### What changed
Three new EditorJS inline tools were added. They embed HTML directly inside the `text` field
of paragraph, header, quote, and list blocks when content is saved:

| Tool | HTML produced |
|---|---|
| `@editorjs/underline` | `<u>selected text</u>` |
| `editorjs-text-color-plugin` — text colour | `<span class="cdx-text-color--Color" style="color: #xxxxxx;">text</span>` |
| `editorjs-text-color-plugin` — highlight | `<mark class="cdx-marker--Color" style="background: #xxxxxx;">text</mark>` |

A paragraph block with mixed formatting will look like this in the stored JSON:
```json
{
  "type": "paragraph",
  "data": {
    "text": "Normal text, <u>underlined</u>, <span style=\"color: #F87171;\">red text</span>, and <mark style=\"background: #22c55e;\">highlighted</mark>."
  }
}
```

### Backend requirement
**If the backend runs any HTML sanitization on the `content` field or on any `text`
sub-field inside the EditorJS JSON, it must be updated to whitelist the following.**

#### Tags to allow
```
b, strong, i, em, u, a, br, span, mark
```
(The first four are the existing EditorJS bold/italic defaults; `u`, `span`, `mark` are new.)

#### Attributes to allow
```
span: [style, class]
mark: [style, class]
a:    [href, target, rel]
```

#### CSS properties to allow inside `style` attributes
```
color
background
background-color
```

#### CSS classes to allow (for EditorJS plugin identification)
```
cdx-text-color--Color     (any variant — the suffix is the colour name)
cdx-marker--Color
```

#### Common sanitizer configs

**Node.js `sanitize-html`:**
```js
const sanitizeOptions = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'u', 'mark'],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    'span': ['style', 'class'],
    'mark': ['style', 'class'],
  },
  allowedStyles: {
    '*': {
      'color':            [/.*/],
      'background':       [/.*/],
      'background-color': [/.*/],
    },
  },
};
```

**Python `bleach`:**
```python
import bleach

ALLOWED_TAGS = bleach.ALLOWED_TAGS + ['u', 'span', 'mark', 'p', 'h2', 'h3', 'h4',
                                       'ul', 'ol', 'li', 'blockquote', 'br']
ALLOWED_ATTRS = {
    **bleach.ALLOWED_ATTRIBUTES,
    'span': ['style', 'class'],
    'mark': ['style', 'class'],
}
ALLOWED_STYLES = ['color', 'background', 'background-color']
```

**Important:** The sanitizer should be applied to the individual `text` fields extracted from
the EditorJS JSON — NOT to the entire `content` string (which is valid JSON, not HTML). If
the backend stores `content` as a raw string without parsing it, no sanitization change is
needed at all.

---

## 2. Upload Endpoint — Accept Video Files

### What changed
`VideoTool.ts` allows authors to upload video files directly into article content. It posts
to the same `/upload` endpoint used for images.

### Exact request sent by VideoTool.ts
```
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Field name : "image"          ← VideoTool hard-codes this field name
MIME types : video/mp4, video/webm
Max size   : 50 MB            ← enforced client-side; backend must match
```

### Expected response shape
```json
{ "success": 1, "file": { "url": "https://..." } }
```
On failure:
```json
{ "success": 0, "message": "reason" }
```

### Backend requirements

#### 2a. Accept video MIME types
The upload handler's file-type whitelist must include:
```
video/mp4
video/webm
```
In addition to the existing image types:
```
image/jpeg, image/png, image/webp, image/gif
```

#### 2b. Increase file size limit
The backend must allow payloads up to **50 MB** for this endpoint. If using a framework-level
body size limit (e.g., `express-fileupload`, `multer`, `nginx client_max_body_size`),
raise it to at least `52428800` (50 × 1024 × 1024) bytes.

Example for **multer**:
```js
const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 },   // was probably lower
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm',                              // new
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});
```

Example for **nginx** (upstream proxy):
```nginx
client_max_body_size 55M;
```

#### 2c. Storage — video files
If using Cloudflare R2, AWS S3, or similar, ensure the bucket policy and CORS configuration
allow storing and serving `.mp4` / `.webm` files. The returned `url` must be a directly
streamable URL (not a presigned URL with a short TTL, as it will be embedded in article
content permanently).

#### 2d. Response consistency
The response must always follow the EditorJS uploader contract exactly. The `file.url` value
is stored inside the EditorJS block data and later embedded as the `src` of a `<video>`
element, so it must be an absolute, publicly accessible URL.

---

## 3. Featured News Endpoint — Public Access (No Auth)

### What changed
`src/app/page.tsx` was converted from a client component to a Next.js **Server Component**.
It now fetches featured news directly from the backend **on the server**, before the page
renders:

```ts
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/news?featured=true&limit=5`, {
  next: { revalidate: 60 },
});
```

**There is no `Authorization` header in this request.** The Next.js server has no access
to the user's browser localStorage token.

### Backend requirement
`GET /news` (or at minimum `GET /news?featured=true`) must be accessible **without
authentication**. If the route is currently behind an auth middleware, it must be exempted
for GET requests.

Example in Express:
```js
// Before (fully protected):
router.get('/news', authMiddleware, newsController.getAll);

// After (public read, protected write):
router.get('/news', newsController.getAll);          // no auth for GET
router.post('/news', authMiddleware, newsController.create);
```

### Query parameters the endpoint must support
| Param | Type | Meaning |
|---|---|---|
| `featured` | `'true'` | Filter to featured articles only |
| `limit` | number | Max articles returned |
| `page` | number | Page number for pagination |
| `search` | string | Free-text search |
| `doc_status` | number | Filter by status (0/1/2) |

### Response shape
```json
{
  "data": [
    {
      "id": "...",
      "title": "...",
      "slug": "...",
      "summary": "...",
      "thumbnail_url": "...",
      "published_at": "...",
      "views": 0,
      "is_featured": true,
      "category": { "id": "...", "name": "...", "slug": "...", "color": "..." },
      "author": { "id": "...", "full_name": "...", "avatar_url": null }
    }
  ],
  "pagination": { "total": 5, "page": 1, "limit": 5, "pages": 1 }
}
```

---

## 4. API Route Inconsistency — `/news/{id}` vs `/posts/{id}`

### What the frontend does today

| Action | Frontend call | HTTP endpoint |
|---|---|---|
| Delete (list page) | `newsApi.remove(id)` | `DELETE /news/{id}` |
| Delete (edit page) | `postsApi.remove(id)` | `DELETE /posts/{id}` |
| Featured toggle | `newsApi.update(id, { is_featured })` | `PUT /news/{id}` |
| Status change | `postsApi.updateStatus(id, status)` | `PATCH /posts/{id}/status` |
| Create post | `postsApi.create(formData)` | `POST /posts` |
| Update post | `postsApi.update(id, formData)` | `PUT /posts/{id}` |
| Get post (edit) | `postsApi.getById(id)` | `GET /posts/{id}` |

The same Article resource is being accessed via both `/news/{id}` and `/posts/{id}`.

### Backend options

**Option A (Recommended) — Alias routes**
Register both route prefixes pointing to the same controller:
```js
// Both resolve to articleController
router.delete('/news/:id',  authMiddleware, articleController.remove);
router.delete('/posts/:id', authMiddleware, articleController.remove);

router.put('/news/:id',  authMiddleware, articleController.update);
router.put('/posts/:id', authMiddleware, articleController.update);
```
This requires no frontend changes and maintains backward compatibility.

**Option B — Standardise in frontend**
Migrate the list page to use `postsApi` exclusively and remove the `newsApi` calls for
delete/featured. This is the cleaner long-term fix but requires a frontend change.

### `PUT /news/{id}` — Partial update support
The featured toggle call is:
```js
newsApi.update(id, { is_featured: !current })   // sends only { is_featured: bool }
```
The backend must accept a **partial body** for `PUT /news/{id}` or `PUT /posts/{id}` — it
should merge the provided fields into the existing record, not replace all fields.
If the endpoint currently requires all fields, change it to treat omitted fields as
"unchanged".

---

## 5. Media Gallery — `existing_media_ids` Handling

### What the frontend sends on edit/save

When the user modifies the media gallery (`mediaWasTouched === true`), the edit page
sends:

```
PUT /posts/{id}
Content-Type: multipart/form-data

title                  = "..."
summary                = "..."
content                = "{...EditorJS JSON...}"
category_id            = "..."
is_featured            = "true"
existing_media_ids     = "[\"uuid-1\", \"uuid-2\"]"   ← JSON-encoded string array
media                  = File                           ← repeated for each new upload
```

When `mediaWasTouched === false` (user did not touch media section), neither
`existing_media_ids` nor `media` fields are sent — the backend must treat this as "leave
media unchanged".

### Backend logic required

```
1. Receive PUT /posts/{id}
2. If "existing_media_ids" field is present in FormData:
   a. Parse it as JSON → string[]
   b. Find all MediaItem records currently linked to this post
   c. Delete MediaItem records whose id is NOT in the array
      (these were removed by the user in the UI)
   d. Upload any new files from the "media" field(s)
   e. Create new MediaItem records and link to post
3. If "existing_media_ids" field is absent:
   → Do not modify existing media at all
4. Return updated Article including full media[] array
```

### MediaItem response shape (must match frontend type)
```json
{
  "id": "uuid",
  "url": "https://...",
  "media_type": "image",      ← "image" or "video"
  "display_order": 0
}
```

### Article response after update
The frontend reads these fields immediately after save:
```js
setArticle(updated);
setThumbnail(updated.thumbnail_url ?? '');
setKeptMedia(updated.media ?? []);
```

So `PUT /posts/{id}` must return the full updated Article with `thumbnail_url` and `media`
populated.

---

## 6. Post Create/Update — FormData Field Reference

### `POST /posts` — Create

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | Yes | |
| `summary` | string | No | Only sent if non-empty |
| `content` | string | No | EditorJS JSON string; can be `""` or `{"blocks":[]}` |
| `category_id` | string | No | UUID; only sent if selected |
| `is_featured` | string | Yes | `"true"` or `"false"` (FormData coerces booleans to strings) |
| `thumbnail` | File | No | Mutually exclusive with `thumbnail_url` |
| `thumbnail_url` | string | No | Mutually exclusive with `thumbnail` |
| `media` | File | No | Repeated key — multiple files |

Response: `{ "data": Article }` where `Article.id` is used for redirect.

### `PUT /posts/{id}` — Update

Same fields as create, plus:

| Field | Type | Condition | Notes |
|---|---|---|---|
| `existing_media_ids` | string | Only if media was touched | JSON array of UUIDs to keep |
| `media` | File | Only if media was touched | New files to upload |

Note: `doc_status` is **NOT** included here. Status is changed via the dedicated endpoint.

Response: `{ "data": Article }` — full Article with updated `thumbnail_url` and `media[]`.

### `PATCH /posts/{id}/status` — Status change

Request body (JSON):
```json
{ "doc_status": 0 }
```
Where `0` = Draft, `1` = Published, `2` = Archived.

Response: `{ "data": Article }` with updated `doc_status`.

---

## 7. Empty Content — Do Not Validate as Required

### What changed
The EditorBlock double-initialisation bug was fixed. Before the fix, content was always
sent as `{"blocks":[]}`. Now it correctly reflects what the user typed.

However, an author may legitimately save a draft with no body content yet. The frontend
sends `content = ""` (empty string) or omits it when the editor has no blocks.

### Backend requirement
- `content` must be **optional** (nullable / can be empty string)
- Do not reject `POST /posts` or `PUT /posts/{id}` when `content` is absent, `""`, or
  `{"time":...,"blocks":[],"version":"..."}`
- If the backend currently enforces `content` as required, remove that validation

---

## 8. New Delimiter Block — No Action Required (Informational)

The new `delimiter` EditorJS block produces:
```json
{ "type": "delimiter", "data": {} }
```

This is stored inside the `content` JSON string. The backend stores `content` as a raw
string and does not parse it, so no backend change is needed. The delimiter block is
rendered to `<hr />` entirely on the frontend renderer.

**Exception:** If the backend extracts a text preview from content (e.g., for meta
descriptions or search indexing by parsing the blocks array), add a handler for
`"delimiter"` that returns an empty string — the delimiter has no text content.

---

## 9. Article Response Shape — Complete Reference

Every endpoint that returns an Article (create, update, get, status change) must return
this shape. Fields marked optional may be omitted or null:

```json
{
  "data": {
    "id":            "uuid",
    "title":         "string",
    "slug":          "string",
    "summary":       "string | null",
    "content":       "string | null",
    "thumbnail_url": "string | null",
    "doc_status":    0,
    "is_featured":   false,
    "views":         0,
    "published_at":  "ISO string | null",
    "created_at":    "ISO string",
    "updated_at":    "ISO string",
    "author": {
      "id":         "uuid",
      "full_name":  "string",
      "avatar_url": "string | null"
    },
    "category": {
      "id":    "uuid",
      "name":  "string",
      "slug":  "string",
      "color": "#rrggbb"
    },
    "stocks": [
      { "id": "uuid", "symbol": "AAPL", "company_name": "Apple Inc." }
    ],
    "media": [
      {
        "id":            "uuid",
        "url":           "https://...",
        "media_type":    "image",
        "display_order": 0
      }
    ]
  }
}
```

---

## 10. CORS — Server-Side Fetch Compatibility

Next.js now fetches `/news?featured=true&limit=5` **from the Node.js server process**, not
from a browser. The request's `Origin` header will reflect the Next.js server's hostname,
not the browser's origin.

### Requirements
- The backend must not reject requests where `Origin` does not match a known browser origin
- If CORS is configured as a whitelist, add the Next.js server's internal hostname
  (e.g., `http://localhost:3000` for local, your deployment domain for production)
- Alternatively, allow `*` for GET requests on public routes only

---

## Summary — Priority Order

| Priority | Item | Breaking if missed |
|---|---|---|
| 🔴 Critical | **§1** HTML sanitizer whitelist `<u>`, `<span style>`, `<mark style>` | Underline and text colour stripped on save/reload |
| 🔴 Critical | **§3** `GET /news` publicly accessible without auth header | Homepage blank on server render (500 or empty) |
| 🔴 Critical | **§2** Upload endpoint accepts `video/mp4`, `video/webm`, 50 MB limit | Video upload silently fails or returns 413/415 |
| 🟡 Important | **§5** `existing_media_ids` reconciliation logic in `PUT /posts/{id}` | Media gallery never updates; deletions ignored |
| 🟡 Important | **§4** `/news/{id}` and `/posts/{id}` alias to same resource | Delete from list page hits wrong route |
| 🟡 Important | **§4** `PUT /news/{id}` accepts partial body | Featured toggle may 400 if backend requires full payload |
| 🟢 Low | **§7** `content` field not required | Draft saves with empty editor fail validation |
| 🟢 Low | **§10** CORS allows Next.js server origin | Only affects if origins differ in deployment |
| ℹ️ Info | **§8** Delimiter block has no text | Only relevant if backend parses blocks for indexing |
