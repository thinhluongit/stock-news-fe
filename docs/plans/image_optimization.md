# Next.js Image Optimization — Missing `sizes` and LCP Fix

## Do These Warnings Have Real Impact?

Yes — both warnings directly hurt page load performance and SEO rankings.

---

## Warning 1: Missing `sizes` on `fill` Images

### What happens

When `fill` is used without a `sizes` prop, Next.js falls back to `sizes="100vw"`. The browser reads this as "this image always fills the full viewport width" and selects the largest available srcset candidate — regardless of the actual rendered size of the element.

### Real impact

| Image | Actual rendered size | What the browser downloads without `sizes` |
|---|---|---|
| FeaturedNews main hero | ~60% of max-7xl container on desktop | Full viewport width image |
| FeaturedNews side thumbnails | 96×96 px fixed | Full viewport width image |
| NewsCard thumbnails | ~h-40 / h-56, 1/3 grid column | Full viewport width image |
| Article detail hero | 75% of max-7xl on desktop | Full viewport width image |

A visitor on mobile loading the FeaturedNews thumbnails (96×96 px) will download an image several times larger than needed. Multiply this across every card on the homepage and the wasted bandwidth is significant.

---

## Warning 2: LCP Image Missing `loading="eager"` / `priority`

### What happens

Next.js images default to lazy loading (`loading="lazy"`). Lazy loading skips the image until it enters the viewport, which is correct for below-the-fold images. However, for the **Largest Contentful Paint (LCP) element** — the first large visual the user sees — lazy loading is actively harmful: it delays the most important image on the page.

The browser console identifies the main FeaturedNews hero as the LCP element.

### Real impact

- **Core Web Vitals LCP score degrades** — Google measures LCP as a ranking signal. A lazy-loaded LCP image always scores worse than an eagerly loaded one.
- **User-perceived load time is worse** — the hero image is blank for longer, even on fast connections.

---

## Solution

### Recommended: use `priority` instead of `loading="eager"`

The Next.js `priority` prop does two things that `loading="eager"` alone does not:
1. Sets `loading="eager"` (disables lazy loading)
2. Injects `<link rel="preload">` into `<head>` so the browser fetches the image before it even encounters the `<Image>` component

Apply `priority` **only to the LCP image** (the main featured hero). Do not add it to every image — it defeats the purpose of lazy loading for below-the-fold content.

---

## Files and Changes

### 1. `src/components/news/FeaturedNews.tsx`

**Main hero (LCP)** — line 39:
```tsx
// Before
<Image src={main.thumbnail_url} alt={main.title} fill
  className="object-cover group-hover:scale-105 transition-transform duration-300" />

// After
<Image
  src={main.thumbnail_url}
  alt={main.title}
  fill
  priority
  sizes="(max-width: 1024px) 100vw, 60vw"
  className="object-cover group-hover:scale-105 transition-transform duration-300"
/>
```

> `sizes` explanation: On screens < 1024px the image is full width. On lg+ it occupies the `lg:col-span-3` column (~60% of the `max-w-7xl` container).

**Side thumbnails** — line 71:
```tsx
// Before
<Image src={article.thumbnail_url} alt={article.title} fill className="object-cover" />

// After
<Image
  src={article.thumbnail_url}
  alt={article.title}
  fill
  sizes="96px"
  className="object-cover"
/>
```

> The container is `w-24 h-24` (96×96 px) — always fixed, so `sizes="96px"` is exact.

---

### 2. `src/components/news/NewsCard.tsx`

**Card thumbnail** — line 20:
```tsx
// Before
<Image src={article.thumbnail_url} alt={article.title} fill
  className="object-cover group-hover:scale-105 transition-transform duration-300" />

// After
<Image
  src={article.thumbnail_url}
  alt={article.title}
  fill
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  className="object-cover group-hover:scale-105 transition-transform duration-300"
/>
```

> Cards are used in grids: 1 column on mobile, 2 on sm/md, 3 on lg+. Adjust if the calling grid differs.

---

### 3. `src/app/news/[id]/page.tsx`

**Article detail hero** — line 87:
```tsx
// Before
<Image src={article.thumbnail_url} alt={article.title} fill className="object-cover" />

// After
<Image
  src={article.thumbnail_url}
  alt={article.title}
  fill
  sizes="(max-width: 1024px) 100vw, 75vw"
  className="object-cover"
/>
```

> The article column is `lg:col-span-3` in a 4-column grid inside `max-w-7xl`, so ~75vw on desktop.

---

## Priority: Which to fix first?

1. **FeaturedNews hero** — highest priority; it is the LCP element and is broken in two ways (no `sizes`, no `priority`). This directly hurts SEO and perceived performance.
2. **FeaturedNews side thumbnails** — tiny fixed containers downloading full-width images; easy win with `sizes="96px"`.
3. **NewsCard / article page** — lower traffic pages but still worth fixing to avoid wasted bandwidth as article volume grows.
