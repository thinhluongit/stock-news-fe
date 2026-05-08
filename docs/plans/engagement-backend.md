# Engagement Features — Backend Plan

> Written: 2026-05-08  
> Scope: views, likes, comments, social shares — database, API, business logic  
> Paired with: `docs/plans/engagement-frontend.md`

---

## 1. Database Schema

All tables assume PostgreSQL. Add these to the existing schema.

### 1.1 `article_views` — deduplicated view tracking

```sql
CREATE TABLE article_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,  -- null for guests
  fingerprint VARCHAR(64),    -- SHA-256(ip + user_agent) for guest dedup
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_article_views_article ON article_views(article_id);
CREATE INDEX idx_article_views_dedup   ON article_views(article_id, user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX idx_article_views_fp      ON article_views(article_id, fingerprint)
  WHERE fingerprint IS NOT NULL;
```

The `views` column on `articles` is a **materialized counter** — updated via trigger or
background job. Do NOT recalculate on every read.

```sql
-- Trigger: increment articles.views after each INSERT on article_views
CREATE OR REPLACE FUNCTION increment_article_views()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE articles SET views = views + 1 WHERE id = NEW.article_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_article_views_inc
AFTER INSERT ON article_views
FOR EACH ROW EXECUTE FUNCTION increment_article_views();
```

### 1.2 `article_likes` — one like per user per article

```sql
CREATE TABLE article_likes (
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (article_id, user_id)
);

CREATE INDEX idx_article_likes_article ON article_likes(article_id);
CREATE INDEX idx_article_likes_user    ON article_likes(user_id);
```

Counter column on `articles`:

```sql
ALTER TABLE articles ADD COLUMN like_count  INT NOT NULL DEFAULT 0;
ALTER TABLE articles ADD COLUMN share_count INT NOT NULL DEFAULT 0;
ALTER TABLE articles ADD COLUMN comment_count INT NOT NULL DEFAULT 0;

-- Trigger for like_count
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE articles SET like_count = like_count + 1 WHERE id = NEW.article_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE articles SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.article_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_like_count
AFTER INSERT OR DELETE ON article_likes
FOR EACH ROW EXECUTE FUNCTION update_like_count();
```

### 1.3 `article_bookmarks` — saved articles per user

```sql
CREATE TABLE article_bookmarks (
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (article_id, user_id)
);

CREATE INDEX idx_bookmarks_user ON article_bookmarks(user_id, created_at DESC);
```

### 1.4 `article_shares` — share tracking

```sql
CREATE TABLE article_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  platform    VARCHAR(32) NOT NULL,   -- 'facebook' | 'zalo' | 'twitter' | 'linkedin' | 'copy'
  shared_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shares_article  ON article_shares(article_id);
CREATE INDEX idx_shares_platform ON article_shares(article_id, platform);

-- Counter trigger
CREATE OR REPLACE FUNCTION increment_share_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE articles SET share_count = share_count + 1 WHERE id = NEW.article_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_share_count
AFTER INSERT ON article_shares
FOR EACH ROW EXECUTE FUNCTION increment_share_count();
```

### 1.5 `comments` — threaded comments (max depth 1)

```sql
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE,  -- null = top-level
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  like_count  INT NOT NULL DEFAULT 0,
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,  -- soft delete
  is_edited   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT max_depth CHECK (parent_id IS NULL OR
    (SELECT parent_id FROM comments c WHERE c.id = parent_id) IS NULL)
);

CREATE INDEX idx_comments_article ON comments(article_id, created_at DESC)
  WHERE is_deleted = FALSE;
CREATE INDEX idx_comments_parent  ON comments(parent_id)
  WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_user    ON comments(user_id);

-- Trigger: maintain comment_count on articles
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_deleted = FALSE THEN
    UPDATE articles SET comment_count = comment_count + 1 WHERE id = NEW.article_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE THEN
    UPDATE articles SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = NEW.article_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_comment_count
AFTER INSERT OR UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION update_comment_count();
```

### 1.6 `comment_likes`

```sql
CREATE TABLE comment_likes (
  comment_id  UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

-- Counter trigger similar to article_likes
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_comment_like_count
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();
```

---

## 2. API Endpoints

All authenticated endpoints require `Authorization: Bearer <token>`.  
Unauthenticated requests to protected endpoints return `401`.

### 2.1 Views — automatic on article fetch

No separate endpoint. The existing `GET /news/:slug` handler increments views:

```
GET /news/:slug
```

Logic added to the existing handler:

```js
// After fetching the article:
const userId    = req.user?.id ?? null;
const ipAgent   = req.ip + req.headers['user-agent'];
const fingerprint = sha256(ipAgent).slice(0, 64);

// Deduplicate: one view per user OR fingerprint per 4 hours
const alreadyViewed = await db.query(`
  SELECT 1 FROM article_views
  WHERE article_id = $1
    AND (
      (user_id = $2 AND $2 IS NOT NULL) OR
      (fingerprint = $3 AND user_id IS NULL)
    )
    AND viewed_at > NOW() - INTERVAL '4 hours'
  LIMIT 1
`, [article.id, userId, fingerprint]);

if (!alreadyViewed.rows.length) {
  await db.query(`
    INSERT INTO article_views (article_id, user_id, fingerprint)
    VALUES ($1, $2, $3)
  `, [article.id, userId, fingerprint]);
}
```

The trigger on `article_views` handles the counter update.

---

### 2.2 Likes

```
POST   /news/:articleId/like    → toggle like (auth required)
GET    /news/:articleId/like    → get like status for current user (auth required)
```

**POST /news/:articleId/like — toggle:**

```js
// UPSERT approach: INSERT or DELETE
const existing = await db.query(
  'SELECT 1 FROM article_likes WHERE article_id=$1 AND user_id=$2',
  [articleId, userId]
);

if (existing.rows.length) {
  await db.query('DELETE FROM article_likes WHERE article_id=$1 AND user_id=$2', [articleId, userId]);
  liked = false;
} else {
  await db.query('INSERT INTO article_likes (article_id, user_id) VALUES ($1, $2)', [articleId, userId]);
  liked = true;
}

const { like_count } = await db.query('SELECT like_count FROM articles WHERE id=$1', [articleId]);

return res.json({ data: { article_id: articleId, liked, total_likes: like_count } });
```

**GET /news/:articleId/like:**

```json
{ "data": { "article_id": "...", "liked": true, "total_likes": 384 } }
```

---

### 2.3 Bookmarks

```
POST   /news/:articleId/bookmark    → toggle bookmark (auth required)
GET    /news/:articleId/bookmark    → bookmark status (auth required)
GET    /me/bookmarks                → paginated list (auth required)
       ?page=1&limit=12
```

**GET /me/bookmarks response:**

```json
{
  "data": [ { ...article fields... } ],
  "pagination": { "total": 45, "page": 1, "limit": 12, "pages": 4 }
}
```

---

### 2.4 Shares

```
POST /news/:articleId/share
Body: { "platform": "facebook" | "zalo" | "twitter" | "linkedin" | "copy" }
```

Fire-and-forget — always returns `204 No Content`. No auth required (anonymous shares tracked without user_id).

---

### 2.5 Comments

```
GET    /news/:articleId/comments
       ?page=1&limit=20&sort=newest|oldest

POST   /news/:articleId/comments             (auth required)
Body:  { "body": "string", "parent_id": "uuid|null" }

PATCH  /comments/:commentId                  (auth required, own comment or admin)
Body:  { "body": "string" }

DELETE /comments/:commentId                  (auth required, own comment or admin)

POST   /comments/:commentId/like             (auth required) → toggle
```

**GET /news/:articleId/comments response:**

```json
{
  "data": [
    {
      "id": "...",
      "article_id": "...",
      "author": { "id": "...", "full_name": "Alice Nguyen", "avatar_url": null },
      "body": "Great analysis!",
      "parent_id": null,
      "like_count": 12,
      "is_liked_by_me": false,
      "is_edited": false,
      "reply_count": 3,
      "created_at": "2026-05-08T10:00:00Z",
      "updated_at": "2026-05-08T10:00:00Z"
    }
  ],
  "pagination": { "total": 27, "page": 1, "limit": 20, "pages": 2 }
}
```

Replies are fetched separately:

```
GET /comments/:commentId/replies   → paginated replies (parent_id = commentId)
```

**Business rules for comments:**
- Max body: 2000 characters
- Soft delete: `is_deleted = true`; API returns `{ "body": "[deleted]", "author": null }`
- Hard delete by admin: actual row deletion
- Edit: updates `body` + `is_edited = true` + `updated_at`; only within 15 minutes of creation for regular users (admin can edit anytime)
- Cannot reply to a reply (max depth = 1)
- Comment moderation: `is_flagged` column (future); auto-flag if body contains prohibited keywords

---

## 3. Middleware & Rate Limiting

Add rate limiting to prevent abuse:

```
POST /news/:id/like       → 30 req / min per IP
POST /news/:id/bookmark   → 30 req / min per IP
POST /news/:id/comments   → 5 req / min per IP (anti-spam)
POST /news/:id/share      → 60 req / min per IP (lenient — fire-and-forget)
GET  /news/:id/comments   → 120 req / min per IP
```

Use `express-rate-limit` with `ioredis` store for distributed rate limiting.

---

## 4. Extending the `GET /news/:slug` Response

Include engagement counts + current-user status in the article response to avoid extra round-trips on page load:

```json
{
  "data": {
    "id": "...",
    "title": "...",
    "views": 12400,
    "like_count": 384,
    "comment_count": 27,
    "share_count": 142,
    "is_liked_by_me": false,      // only when authenticated
    "is_bookmarked_by_me": false, // only when authenticated
    ...
  }
}
```

SQL addition to the existing article query:

```sql
SELECT
  a.*,
  -- likes
  (SELECT COUNT(*) FROM article_likes al WHERE al.article_id = a.id) AS like_count,
  -- already in articles.like_count — just SELECT it directly

  -- current user status (only when user_id is supplied)
  EXISTS(
    SELECT 1 FROM article_likes WHERE article_id = a.id AND user_id = $userId
  ) AS is_liked_by_me,

  EXISTS(
    SELECT 1 FROM article_bookmarks WHERE article_id = a.id AND user_id = $userId
  ) AS is_bookmarked_by_me

FROM articles a
WHERE a.slug = $slug
```

---

## 5. Trending Articles Algorithm

New endpoint:

```
GET /news/trending?window=24h|7d|30d&limit=5
```

Score formula:
```sql
SELECT
  id, title, slug, thumbnail_url,
  (
    views         * 0.3
    + like_count  * 1.0
    + comment_count * 2.0
    + share_count * 1.5
  ) AS trending_score
FROM articles
WHERE
  doc_status = 1
  AND published_at > NOW() - INTERVAL '24 hours'  -- parameterise window
ORDER BY trending_score DESC
LIMIT $limit;
```

Cache this result in Redis for 5 minutes (not worth recalculating on every sidebar load).

---

## 6. Admin Endpoints for Comment Moderation

```
GET    /admin/comments?article_id=&user_id=&flagged=true&page=1
PATCH  /admin/comments/:id/flag       → flag for review
PATCH  /admin/comments/:id/unflag     → clear flag
DELETE /admin/comments/:id            → hard delete
```

---

## 7. Analytics Aggregation

New admin endpoint powering engagement stats in the dashboard:

```
GET /admin/stats/engagement
Response:
{
  "data": {
    "total_likes":    45830,
    "total_comments": 12340,
    "total_shares":   8920,
    "top_articles": [
      { "id": "...", "title": "...", "views": 45000, "likes": 1200 }
    ],
    "shares_by_platform": {
      "facebook": 4100,
      "zalo":     2800,
      "twitter":  1200,
      "linkedin":  620,
      "copy":      200
    }
  }
}
```

---

## 8. Notifications (Future — Phase 2)

Store in a `notifications` table:

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(32) NOT NULL,  -- 'comment_reply' | 'article_like' | 'comment_like' | 'mention'
  payload     JSONB NOT NULL,        -- { article_id, comment_id, actor: { id, full_name } }
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC)
  WHERE is_read = FALSE;
```

Triggered by:
- Reply to own comment → `comment_reply` notification for comment author
- Like on own article (every 10th like) → `article_like`
- `@mention` in a comment body → `mention`

Endpoints:

```
GET   /me/notifications?page=1&limit=20   → list (auth required)
PATCH /me/notifications/read-all          → mark all as read
PATCH /me/notifications/:id/read          → mark one as read
```

Unread count included in `GET /auth/me` response so the header badge populates on login.

---

## 9. Implementation Order

| Step | Task | Notes |
|---|---|---|
| 1 | Add `like_count`, `share_count`, `comment_count` columns to `articles` | Migration |
| 2 | Create `article_views` table + dedup logic | Extend existing GET /news/:slug |
| 3 | Create `article_likes` table + trigger + toggle endpoint | `POST/GET /news/:id/like` |
| 4 | Create `article_bookmarks` table + endpoints | `POST/GET /news/:id/bookmark`, `GET /me/bookmarks` |
| 5 | Create `article_shares` table + endpoint | `POST /news/:id/share` |
| 6 | Extend `GET /news/:slug` to include engagement counts + user status | Requires steps 1–5 |
| 7 | Create `comments` + `comment_likes` tables + triggers | |
| 8 | Implement all `/news/:id/comments` CRUD endpoints | |
| 9 | Add rate limiting middleware | |
| 10 | Trending articles endpoint + Redis cache | |
| 11 | Admin comment moderation endpoints | |
| 12 | Analytics aggregation endpoint | |
| 13 | Notifications table + endpoints (future) | Phase 2 |
