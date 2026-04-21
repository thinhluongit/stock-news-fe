# Admin Posts Workflow Report

**Source files**
- `src/app/admin/posts/page.tsx` — list
- `src/app/admin/posts/create/page.tsx` — create
- `src/app/admin/posts/[id]/page.tsx` — edit / detail

---

## 1. Post Status Model

Posts carry a `doc_status` field typed as `0 | 1 | 2`:

| Value | Label | Colour token |
|---|---|---|
| `0` | Draft | `bg-gray-700 text-gray-400` |
| `1` | Published | `bg-green-500/20 text-green-400` |
| `2` | Archived | `bg-yellow-500/20 text-yellow-400` |

Status controls what editing operations are available and which API call is made (`postsApi.updateStatus`).

---

## 2. List Page — `/admin/posts`

**Data source:** Redux `newsSlice` via `fetchNews` thunk (`GET /news`).

### Filters
- **Search** — free-text input; debounced 400 ms before dispatching. Resets `page` to 1 on change.
- **Status filter** — dropdown bound to `doc_status` query param (`''` = all, `'0'` = Draft, `'1'` = Published, `'2'` = Archived). Resets `page` to 1 on change.

### Table columns
Title, Author (hidden `md-`), Status (hidden `sm-`), Featured (hidden `lg-`), Views (hidden `xl-`), Date (hidden `xl-`), Actions.

### Inline actions (without navigating away)
- **Status dropdown** — calls `postsApi.updateStatus(id, newStatus)` then reloads the list.
- **Featured star toggle** — calls `newsApi.update(id, { is_featured: !current })` then reloads. Note: this uses `newsApi`, not `postsApi`.
- **Delete button** — opens a `ConfirmDialog` modal; on confirm calls `newsApi.remove(id)` then reloads. Note: also uses `newsApi`.

### Navigation actions
- **"New Post" button** → `/admin/posts/create`
- **Edit (pencil) button** → `/admin/posts/[id]`

### Pagination
Rendered when `pagination.pages > 1`. Previous/Next buttons; page counter shown as "N posts · page X of Y".

---

## 3. Create Page — `/admin/posts/create`

### Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| Title | `<input text>` | Yes | Validated client-side before submit |
| Summary | `<textarea>` | No | |
| Content | EditorJS (rich text) | No (sent as `""` if empty) | Loaded via `dynamic()`, `ssr: false` |
| Thumbnail | File upload **or** URL | No | Mutually exclusive; file takes priority |
| Media Gallery | Multi-file upload | No | Appended as multiple `media` entries |
| Category | `<select>` from Redux `categories` | No | `fetchCategories` dispatched on mount |
| Is Featured | Toggle button | No | Defaults to `false` |

### Submission flow (`handleCreate`)

```
1. Validate: title must be non-empty → setError if not
2. Call editorRef.current.save()
   → awaits isReady internally (fixed bug)
   → returns OutputData or null if ref not ready
3. Build FormData:
   form.append("title", title)
   form.append("summary", summary)            // if non-empty
   form.append("content", JSON.stringify(…))  // or "" if null
   form.append("category_id", categoryId)     // if selected
   form.append("is_featured", "true"|"false")
   form.append("thumbnail", file)             // if file chosen
   form.append("thumbnail_url", url)          // else if URL entered
   form.append("media", file)                 // repeated for each file
4. postsApi.create(form)  →  POST /posts  (multipart)
5. On success: navigate to /admin/posts/{created.id}
6. On error:  setError(t('admin.error_load'))
```

### Thumbnail logic

Two sources are mutually exclusive:
- **File upload** — sets `thumbnailFile`, clears `thumbnail` string. Preview via `URL.createObjectURL`; revoked on cleanup.
- **URL input** — sets `thumbnail`, clears `thumbnailFile`. Preview reflects the string directly.

A clear (`X`) button resets both. The URL input is disabled while a file is loaded.

### Content saving (EditorJS)

`EditorBlock` is lazy-loaded via `next/dynamic` with `ssr: false`. The parent holds a `useRef<EditorBlockRef>` and calls `.save()` on submit. The `EditorBlock` internally exposes `save()` via `useImperativeHandle` which:
1. Guards `editorRef.current` (throws if not initialised)
2. Awaits `editorRef.current.isReady`
3. Returns `editorRef.current.save()`

---

## 4. Edit Page — `/admin/posts/[id]`

### Data loading

On mount, two fetches happen in parallel:
- `fetchCategories()` → Redux
- `postsApi.getById(id)` → local `article` state

After the post loads, all form fields are seeded from the response:
- `content` is JSON-parsed into `editorData` (`OutputData | undefined`). Parse errors fall back to `undefined`.
- `editorReady` is set to `true` after parsing, which gates the `EditorBlock` render to prevent it mounting before data is ready.

### Published-post lock

When `docStatus === 1` (Published), an `AlertTriangle` warning banner is shown and all editing inputs are `disabled`. The Save button is also disabled. The Featured toggle's `onClick` is a no-op when `isPublished`. The only available action is to change status (Archive).

### Status action bar

Renders different buttons depending on current status:

| Current status | Available transitions |
|---|---|
| Draft (`0`) | **Publish** → status `1` |
| Published (`1`) | **Archive** → status `2` |
| Archived (`2`) | **Revert to Draft** → `0` · **Republish** → `1` |

Each button calls `postsApi.updateStatus(id, newStatus)` and syncs `docStatus` from the response.

### Save flow (`handleSave`)

```
1. editorRef.current.save() → OutputData or null
2. Build FormData (same structure as create, minus doc_status)
3. Media diff logic:
   if (mediaWasTouched):
     form.append("existing_media_ids", JSON.stringify(keptMedia.map(m => m.id)))
     form.append("media", file)  // for each new file
   else: media fields omitted entirely (backend keeps existing)
4. postsApi.update(id, form)  →  PUT /posts/{id}  (multipart)
5. On success: sync article, thumbnail, keptMedia, clear newMediaFiles, setSaved(true)
6. On error: setError(…)
```

### Media gallery management

The edit page distinguishes between two sets of media:

| Set | State | Description |
|---|---|---|
| `keptMedia` | `MediaItem[]` | Existing server-side media to keep. Removing an item dequeues it locally and sets `mediaWasTouched = true`. |
| `newMediaFiles` | `File[]` | Newly picked files pending upload. Can be removed individually before save. |

`mediaWasTouched` acts as a dirty flag. If false, the `existing_media_ids` and `media` fields are omitted from the FormData, so the backend leaves the media unchanged. This avoids accidentally wiping media when saving an unrelated field.

### Delete

A `ConfirmDialog` modal gates deletion. On confirm, `postsApi.remove(id)` is called and the router navigates to `/admin/posts`. No soft-delete — this is permanent.

---

## 5. API Calls Summary

| Action | API call | Endpoint |
|---|---|---|
| List posts | `newsApi.getAll(params)` | `GET /news` |
| Get single post | `postsApi.getById(id)` | `GET /posts/{id}` |
| Create post | `postsApi.create(FormData)` | `POST /posts` |
| Update post | `postsApi.update(id, FormData)` | `PUT /posts/{id}` |
| Change status (list) | `postsApi.updateStatus(id, status)` | `PATCH /posts/{id}/status` |
| Change status (edit) | `postsApi.updateStatus(id, status)` | `PATCH /posts/{id}/status` |
| Toggle featured | `newsApi.update(id, { is_featured })` | `PUT /news/{id}` |
| Delete (list) | `newsApi.remove(id)` | `DELETE /news/{id}` |
| Delete (edit) | `postsApi.remove(id)` | `DELETE /posts/{id}` |

**Inconsistency noted:** The list page uses `newsApi.update` for the featured toggle and `newsApi.remove` for deletion, while the edit page uses `postsApi.remove`. These hit different endpoint paths (`/news/{id}` vs `/posts/{id}`). If the backend treats these as the same resource this is harmless, but it is worth confirming and standardising to one API service.

---

## 6. Known Issues / Gaps

1. **No client-side content validation on create** — the Content field is not validated. A post can be submitted with empty EditorJS output (`{"blocks":[]}`). Consider checking `outputData.blocks.length > 0` before submission.

2. **Error message is generic** — both save and load failures surface the same `admin.error_load` translation key. Network errors, validation errors from the API, and auth errors are all collapsed into the same message, making debugging difficult.

3. **`newsApi` vs `postsApi` split on list page** — featured toggle and delete on the list page use `newsApi` (`/news` endpoints) rather than `postsApi` (`/posts` endpoints). The edit page uses `postsApi.remove`. This should be made consistent.

4. **No unsaved-changes guard** — navigating away from the edit page with unsaved changes shows no warning. The `Cancel` button routes to `/admin/posts` without prompting.

5. **`editorData` is only set once** — `EditorBlock` receives `data={editorData}` but the `useEffect` dependency array in `EditorBlock` is `[]`, so data changes after mount are ignored. This is intentional (avoid re-initialising the editor) but means any server-side content update after the initial load would not be reflected without a full page reload.
