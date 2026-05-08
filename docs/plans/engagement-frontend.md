# Engagement Features — Frontend Plan

> Written: 2026-05-08  
> Scope: views, likes, comments, social shares — plus additional ideas  
> Paired with: `docs/plans/engagement-backend.md`

---

## 1. New TypeScript Types (`src/types/index.ts`)

Add the following interfaces alongside the existing ones:

```ts
// ── Engagement counts returned with every article ──────────────────────────
export interface EngagementCounts {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

// ── Like state for the current user ────────────────────────────────────────
export interface ArticleLike {
  article_id: string;
  liked: boolean;        // whether the current user has liked this article
  total_likes: number;
}

// ── Bookmark state for the current user ────────────────────────────────────
export interface ArticleBookmark {
  article_id: string;
  bookmarked: boolean;
}

// ── Comment ────────────────────────────────────────────────────────────────
export interface Comment {
  id: string;
  article_id: string;
  author: Pick<User, 'id' | 'full_name' | 'avatar_url'>;
  body: string;                       // plain text, max 2000 chars
  parent_id: string | null;           // null = top-level, string = reply
  replies?: Comment[];                // populated client-side after fetch
  like_count: number;
  is_liked_by_me: boolean;            // only present when user is logged in
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommentPage {
  data: Comment[];
  pagination: Pagination;
}

// ── Reading progress ────────────────────────────────────────────────────────
export interface ReadingProgress {
  article_id: string;
  percent: number;                    // 0–100, tracked locally
}
```

Extend `Article` with optional engagement fields so the article detail page
can render them without a separate fetch:

```ts
// Add to existing Article interface:
like_count?: number;
comment_count?: number;
share_count?: number;
is_liked_by_me?: boolean;
is_bookmarked_by_me?: boolean;
```

---

## 2. New API Functions (`src/services/api.ts`)

```ts
// ── Engagement (views are tracked server-side on GET /news/:slug) ──────────
export const engagementApi = {
  // Likes
  toggleLike:       (articleId: string) => api.post(`/news/${articleId}/like`),
  getLike:          (articleId: string) => api.get(`/news/${articleId}/like`),

  // Bookmarks
  toggleBookmark:   (articleId: string) => api.post(`/news/${articleId}/bookmark`),
  getBookmarks:     (params?: Record<string, unknown>) => api.get('/me/bookmarks', { params }),

  // Comments
  getComments:      (articleId: string, params?: Record<string, unknown>) =>
    api.get(`/news/${articleId}/comments`, { params }),
  createComment:    (articleId: string, body: string, parent_id?: string) =>
    api.post(`/news/${articleId}/comments`, { body, parent_id }),
  updateComment:    (commentId: string, body: string) =>
    api.patch(`/comments/${commentId}`, { body }),
  deleteComment:    (commentId: string) =>
    api.delete(`/comments/${commentId}`),
  toggleCommentLike: (commentId: string) =>
    api.post(`/comments/${commentId}/like`),

  // Share tracking (fire-and-forget — no UI awaits the result)
  trackShare:       (articleId: string, platform: string) =>
    api.post(`/news/${articleId}/share`, { platform }),
};
```

---

## 3. New Redux Slice — `engagementSlice`

**File:** `src/store/slices/engagementSlice.ts`

```ts
interface EngagementState {
  // Per-article like/bookmark status (keyed by article id)
  likes:      Record<string, { liked: boolean; count: number }>;
  bookmarks:  Record<string, boolean>;

  // Comments for the currently viewed article
  comments:   Comment[];
  commentPagination: Pagination | null;
  commentLoading: boolean;
  commentError: string | null;

  // Submission state
  submitting: boolean;
  submitError: string | null;
}
```

**Async thunks:**

| Thunk | Payload | Action |
|---|---|---|
| `fetchLikeStatus(articleId)` | `ArticleLike` | Populate `likes[id]` |
| `toggleLike(articleId)` | `ArticleLike` | Optimistic toggle, rollback on failure |
| `fetchBookmarkStatus(articleId)` | `ArticleBookmark` | Populate `bookmarks[id]` |
| `toggleBookmark(articleId)` | `ArticleBookmark` | Optimistic toggle |
| `fetchComments({ articleId, page })` | `CommentPage` | Append or replace |
| `createComment({ articleId, body, parent_id? })` | `Comment` | Prepend to list |
| `updateComment({ commentId, body })` | `Comment` | Replace in list |
| `deleteComment(commentId)` | `string` | Filter from list |
| `toggleCommentLike(commentId)` | `{ commentId, liked, count }` | Update in list |

**Optimistic like pattern** (avoids latency jitter on button press):
```ts
toggleLike: createAsyncThunk('engagement/toggleLike', async (id, { dispatch, getState }) => {
  const prev = selectLike(getState(), id);
  dispatch(setLikeOptimistic({ id, liked: !prev.liked, count: prev.count + (prev.liked ? -1 : 1) }));
  try {
    const res = await engagementApi.toggleLike(id);
    return res.data.data as ArticleLike;
  } catch {
    dispatch(setLikeOptimistic(prev));   // rollback
    throw new Error('Failed');
  }
});
```

---

## 4. New Components

### 4.1 `<EngagementBar>` — primary bar below article header

**File:** `src/components/engagement/EngagementBar.tsx`

```
┌──────────────────────────────────────────────────────────────┐
│  👁 12.4K views  ·  ❤ 384 likes  ·  💬 27 comments          │
│                                    [Share ▾]  [🔖 Save]      │
└──────────────────────────────────────────────────────────────┘
```

Props:
```ts
interface EngagementBarProps {
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  initialCounts: EngagementCounts;
}
```

Behaviour:
- Reads like/bookmark state from `engagementSlice`
- Like button: filled heart when `liked`, outlined when not; count updates optimistically
- Bookmark button: filled when `bookmarked`; tooltip "Save article"
- Share button: opens `<ShareMenu>` popover (see §4.2)
- Numbers formatted with `formatNumber()` (already in `src/lib/utils.ts`)
- Unauthenticated users clicking Like/Bookmark see a toast: "Log in to like articles"

---

### 4.2 `<ShareMenu>` — social share popover

**File:** `src/components/engagement/ShareMenu.tsx`

```
┌─────────────────────────────┐
│  Share this article         │
│  ─────────────────────────  │
│  [f] Facebook               │
│  [z] Zalo                   │
│  [𝕏] X (Twitter)            │
│  [in] LinkedIn              │
│  [🔗] Copy link  ✓ Copied!  │
└─────────────────────────────┘
```

Share URLs:

| Platform | URL pattern |
|---|---|
| Facebook | `https://www.facebook.com/sharer/sharer.php?u={url}` |
| Zalo | `https://zalo.me/share/sharer.php?u={url}&t={title}` |
| X (Twitter) | `https://twitter.com/intent/tweet?url={url}&text={title}` |
| LinkedIn | `https://www.linkedin.com/shareArticle?mini=true&url={url}&title={title}` |
| Copy link | `navigator.clipboard.writeText(url)` |

Each click:
1. Opens platform URL in a new tab (800×600 popup via `window.open`)
2. Fires `engagementApi.trackShare(articleId, platform)` — fire-and-forget

---

### 4.3 `<CommentsSection>` — full comment thread

**File:** `src/components/engagement/CommentsSection.tsx`

Layout:
```
Comments (27)
──────────────────────────────────────────────────────────────
[Avatar] Write a comment...                          [Post]
──────────────────────────────────────────────────────────────
  [Avatar] Alice Nguyen  · 2 hours ago
  Great analysis on the Fed's move!
  ♥ 12  [Reply]  [·]                    (· = kebab: edit/delete)

    [Avatar] Bob Tran  · 1 hour ago    ← reply indented 24px
    Totally agree, especially the part about yields.
    ♥ 3   [Reply]

  [Load 3 more replies ↓]

  [Avatar] Carol Le  · 3 hours ago
  …

[Load more comments]
──────────────────────────────────────────────────────────────
```

Sub-components:
- `<CommentInput>` — textarea with 2000-char counter, submit button (disabled when empty/loading)
- `<CommentItem>` — single comment with like, reply, edit, delete
- `<ReplyInput>` — inline textarea opened by clicking [Reply], auto-focused

Rules:
- Top-level comments sorted newest-first by default (toggle: oldest-first)
- Replies sorted oldest-first (chronological thread)
- Max depth = 1 (replies to replies are flat under the same parent)
- Edit: only shows for own comments; replaces text with inline textarea; appends "(edited)"
- Delete: confirmation toast ("Are you sure?") before calling API; shows "Comment deleted" placeholder in thread
- Unauthenticated: input replaced with "Log in to join the discussion" link

---

### 4.4 `<ReadingProgressBar>`

**File:** `src/components/engagement/ReadingProgressBar.tsx`

Thin green bar (2px) fixed to the top of the viewport. Tracks `window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100`. No Redux — local state only.

---

### 4.5 `<ReadingTime>`

**File:** `src/components/engagement/ReadingTime.tsx`

Inline badge in the article header: "5 min read"  
Formula: `Math.ceil(wordCount / 200)` minutes (200 wpm average).  
Receives `content: string` and counts words via a simple `.split(/\s+/).length`.

---

### 4.6 `<BookmarksPage>` — user saved articles

**File:** `src/app/profile/bookmarks/page.tsx`

Shows a paginated grid of bookmarked articles using the existing `<NewsCard>` component. Fetches via `GET /me/bookmarks`. Each card has a filled bookmark icon; clicking it toggles `toggleBookmark`.

---

## 5. Article Detail Page Changes (`src/app/news/[id]/page.tsx`)

Insert engagement components into the existing layout:

```
<article>
  ① <ReadingProgressBar />                   ← fixed, outside article tag
  
  … [category badge, date, views] …          ← existing header
  ② Add: <ReadingTime content={article.content} />  next to Eye icon
  
  … [title, summary, author block] …         ← existing
  
  ③ <EngagementBar                           ← NEW, below author block, above thumbnail
      articleId={article.id}
      articleTitle={article.title}
      articleUrl={canonicalUrl}
      initialCounts={{ views: article.views, likes: article.like_count, ... }}
    />
  
  … [thumbnail, stock tags, content] …       ← existing
  
  ④ <EngagementBar … />                      ← repeat at the BOTTOM of the article too
  
  ⑤ <CommentsSection articleId={article.id} />
</article>
```

On mount, dispatch:
```ts
useEffect(() => {
  if (article?.id) {
    dispatch(fetchLikeStatus(article.id));
    dispatch(fetchBookmarkStatus(article.id));
  }
}, [article?.id]);
```

---

## 6. Header / Navigation Changes

- Add bookmark icon (🔖) in the user dropdown menu linking to `/profile/bookmarks`
- Show unread notification dot on the bell icon (future — wire to comment replies on the user's own posts)

---

## 7. i18n Keys to Add

Add to all 6 locale files (`en.json`, `vi.json`, `fr.json`, `zh.json`, `ko.json`, `ja.json`):

```json
"engagement": {
  "views": "views",
  "likes": "likes",
  "comments": "comments",
  "shares": "shares",
  "like": "Like",
  "liked": "Liked",
  "bookmark": "Save",
  "bookmarked": "Saved",
  "share": "Share",
  "copy_link": "Copy link",
  "copied": "Copied!",
  "reading_time": "{{n}} min read",
  "write_comment": "Write a comment…",
  "post_comment": "Post",
  "reply": "Reply",
  "edit": "Edit",
  "delete": "Delete",
  "load_more_comments": "Load more comments",
  "load_more_replies": "Load {{n}} more replies",
  "login_to_like": "Log in to like articles",
  "login_to_comment": "Log in to join the discussion",
  "comment_deleted": "Comment deleted",
  "comment_edited": "(edited)",
  "confirm_delete": "Delete this comment?",
  "sort_newest": "Newest first",
  "sort_oldest": "Oldest first"
}
```

---

## 8. Store Registration

`src/store/index.ts` — add `engagementSlice` to the root reducer:

```ts
import engagementReducer from './slices/engagementSlice';

export const store = configureStore({
  reducer: {
    auth:       authReducer,
    news:       newsReducer,
    stocks:     stockReducer,
    admin:      adminReducer,
    posts:      postsReducer,
    engagement: engagementReducer,   // ← add this
  },
});
```

---

## 9. Additional Feature Ideas

### 9.1 Author Follow System
- Follow/unfollow button on author block in article detail
- `/profile/following` — feed of articles from followed authors
- Notification when a followed author publishes

### 9.2 Reading History
- Auto-log every fully-read article (>80% scroll) to `localStorage`
- `/profile/history` page with a timeline view
- "Continue reading" widget on the home page

### 9.3 Trending / Hot Indicator
- Articles with the most engagement in the last 24h get a 🔥 badge on `<NewsCard>`
- Sidebar section: "Trending Now" — top 5 articles ranked by `(views × 0.3 + likes × 1 + comments × 2)` in 24h window

### 9.4 Article Reactions (Alternative to Binary Like)
Emoji reaction picker with 5 options:
```
📈 Bullish  |  📉 Bearish  |  😮 Wow  |  🤔 Unsure  |  👏 Great
```
Show mini reaction summary under article (most-used reactions + total count).

### 9.5 Article Rating (1-5 stars)
- Logged-in users rate articles (one rating per user)
- Average rating shown as stars next to view count
- Used for "Editor's Pick" algorithm

### 9.6 Comment Mentions & Notifications
- `@username` autocomplete in comment textarea
- Mentioned users receive in-app notification

### 9.7 Highlight & Quote
- Select text in an article → "Share this quote" tooltip appears
- Clicking it pre-fills the X/Twitter share with the selected excerpt

### 9.8 Share Count Display
- Show total share count next to the share button (e.g., "Shared 142 times")
- Milestone toast: "🎉 This article has been shared 1,000 times!"

### 9.9 Newsletter CTA
- Below `<CommentsSection>`, show a subscribe banner:
  "Get the best market analysis in your inbox. Subscribe →"
- Ties into Phase 3 (premium subscription) email list

### 9.10 Related Articles
- Below the article content, show 3 related articles (same category or overlapping stocks)
- Algorithm: most-viewed articles in the same category in the past 30 days

---

## 10. Implementation Order

| Step | Component / File | Depends on |
|---|---|---|
| 1 | Extend `Article` type + add `EngagementCounts` | — |
| 2 | Add `engagementApi` functions to `api.ts` | — |
| 3 | Create `engagementSlice.ts` | Step 2 |
| 4 | Register slice in `store/index.ts` | Step 3 |
| 5 | `<ReadingProgressBar>` (no Redux, trivial) | — |
| 6 | `<ReadingTime>` (pure calc, no state) | — |
| 7 | `<ShareMenu>` (no Redux needed) | — |
| 8 | `<EngagementBar>` | Steps 3, 7 |
| 9 | Integrate EngagementBar into article page | Step 8 |
| 10 | `<CommentInput>` + `<CommentItem>` | Step 3 |
| 11 | `<CommentsSection>` (composes 10) | Step 10 |
| 12 | Integrate CommentsSection into article page | Step 11 |
| 13 | `<BookmarksPage>` | Step 3 |
| 14 | Add i18n keys to all 6 locale files | — |
