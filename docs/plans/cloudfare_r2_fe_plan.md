# Frontend Integration Plan — Cloudflare R2 Media Uploads

This document describes the API contract the frontend must implement to support media uploads when creating or updating posts.

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/posts` | Create a new post (always draft) |
| `PUT` | `/api/posts/:id` | Update a post's content and media |

Both endpoints require:
- `Authorization: Bearer <token>` (editor or admin role)
- `Content-Type: multipart/form-data` when uploading files, **or** `application/json` for text-only requests (backward-compatible)

---

## Request — Create Post (`POST /api/posts`)

### Text fields (strings in multipart form)

| Field | Required | Notes |
|---|---|---|
| `title` | Yes | |
| `content` | Yes | Full HTML/markdown |
| `summary` | No | Short description |
| `category_id` | No | UUID |
| `is_featured` | No | `'true'` or `'false'`, default `'false'` |
| `stock_ids` | No | JSON-stringified UUID array, e.g. `'["uuid1","uuid2"]'` |
| `thumbnail_url` | No | Existing URL — used only when no `thumbnail` file is sent |

### File fields

| Field | Accept | Max count | Max size each |
|---|---|---|---|
| `thumbnail` | image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm | 1 | 50 MB |
| `media` | same as above | 20 | 50 MB |

- If both `thumbnail` file and `thumbnail_url` string are sent, the **file takes precedence**.
- `media` files form the post's media gallery (images/videos shown in or attached to the post body).

### Example (fetch)

```js
const form = new FormData();
form.append('title', 'My Post');
form.append('content', '<p>Hello world</p>');
form.append('category_id', 'uuid-here');
form.append('is_featured', 'false');
form.append('stock_ids', JSON.stringify(['uuid1']));
form.append('thumbnail', thumbnailFile);   // File object
form.append('media', imageFile);           // repeat for each file
form.append('media', videoFile);

const res = await fetch('/api/posts', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
```

---

## Request — Update Post (`PUT /api/posts/:id`)

All create fields apply, plus:

| Field | Notes |
|---|---|
| `existing_media_ids` | JSON-stringified UUID array of media items to **keep**. Items not listed are deleted. Omit entirely to keep all existing media unchanged. |
| `media` | New files to add to the gallery |

### Frontend media update workflow

1. On page load, fetch the post — the response includes `media: MediaItem[]` with `{ id, url, media_type, display_order }`.
2. Show existing media. User can:
   - **Remove** an item → remove from local state.
   - **Add** new files → append to local file list.
3. On submit, build the form:
   ```js
   // IDs of items the user chose to keep
   form.append('existing_media_ids', JSON.stringify(keptItems.map(m => m.id)));

   // New files added by the user
   for (const file of newFiles) form.append('media', file);
   ```
4. If the user did **not touch** the media section, **omit both fields** — the backend leaves media unchanged.

---

## Response Shape

Both endpoints return `201` (create) or `200` (update) with:

```jsonc
{
  "data": {
    "id": "uuid",
    "title": "My Post",
    "slug": "my-post",
    "summary": "...",
    "content": "...",
    "thumbnail_url": "https://pub-xxx.r2.dev/uploads/uuid.jpg",
    "author": { "id": "uuid", "full_name": "Thanh Dang", "avatar_url": null },
    "category": { "id": "uuid", "name": "Finance", "slug": "finance", "color": "#10B981" },
    "stocks": [{ "id": "uuid", "symbol": "VNM", "company_name": "Vinamilk" }],
    "media": [
      { "id": "uuid", "url": "https://pub-xxx.r2.dev/uploads/abc.jpg", "media_type": "image", "display_order": 0 },
      { "id": "uuid", "url": "https://pub-xxx.r2.dev/uploads/def.mp4", "media_type": "video", "display_order": 1 }
    ],
    "doc_status": 0,
    "is_featured": false,
    "views": 0,
    "published_at": null,
    "created_at": "2026-04-20T00:00:00Z",
    "updated_at": "2026-04-20T00:00:00Z"
  }
}
```

---

## Error Responses

| Status | Cause |
|---|---|
| 400 | Missing required field; unsupported file type; file > 50 MB |
| 401 | Missing or invalid JWT |
| 403 | Insufficient role (must be editor or admin) |
| 422 | Editing a published post — archive it first |

---

## Separate Upload Endpoint (for rich-text editors)

`POST /api/upload` with field name `image` (accepts any supported type) returns:

```json
{ "success": 1, "file": { "url": "https://pub-xxx.r2.dev/uploads/uuid.jpg" } }
```

Use this for inline media inside content editors (e.g. EditorJS image tool). The returned URL can also be passed as `thumbnail_url` if the thumbnail was already uploaded separately.

---

## TypeScript Types

```ts
export interface MediaItem {
  id: string;
  url: string;
  media_type: 'image' | 'video';
  display_order: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  content?: string;
  thumbnail_url?: string;
  media?: MediaItem[];
  author?: { id: string; full_name: string; avatar_url?: string };
  category?: { id: string; name: string; slug: string; color: string };
  stocks?: { id: string; symbol: string; company_name: string }[];
  doc_status: 0 | 1 | 2;  // 0=draft, 1=published, 2=archived
  is_featured: boolean;
  views: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
}
```
