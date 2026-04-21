# Image Rules

Rules for every `next/image` (`<Image>`) usage in this project.

## Required props on every `<Image>`

### `fill` images must include `sizes`

Any `<Image fill ...>` must have a `sizes` prop. Without it, the browser defaults to
`sizes="100vw"` and downloads a full-viewport-width image regardless of the actual
rendered element size — wasting bandwidth on every page load.

Use the breakpoint values that match the layout the image is placed in:

| Context | `sizes` value |
|---|---|
| Full-width (single column) | `100vw` |
| 3/5-column hero (lg grid) | `(max-width: 1024px) 100vw, 60vw` |
| 3/4-column article body | `(max-width: 1024px) 100vw, 75vw` |
| 3-column card grid | `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw` |
| Fixed-size container | exact pixel value, e.g. `96px` |

If none of the presets match, calculate the real rendered width at each Tailwind
breakpoint and write a matching `sizes` string.

### Fixed-dimension images must include `width` + `height`

`<Image width={n} height={n} ...>` (non-fill) does not need `sizes`, but must always
have explicit `width` and `height` to avoid layout shift.

---

## LCP image must use `priority` AND be server-rendered

The above-the-fold image that is (or is likely to be) the **Largest Contentful Paint**
must have the `priority` prop, not just `loading="eager"`.

`priority` does two things `loading="eager"` does not:
- Disables lazy loading.
- Injects `<link rel="preload">` into `<head>` so the browser fetches it before
  parsing the component tree.

**Critical constraint:** `priority` can only inject `<link rel="preload">` when the
image URL is present in the server-rendered HTML. If the image URL is only known after
a client-side `useEffect` / API call, the browser never sees the preload hint and the
LCP warning persists regardless of props.

**Rule:** The data for any LCP image must be fetched server-side and passed as props
to the client component. Do **not** rely on `useEffect` or Redux thunks to load LCP
image data.

**Pattern used in this project:**
- `page.tsx` (Server Component) fetches `featuredNews` with `fetch()` + `revalidate`
- Passes it as `initialData` to `<FeaturedNews initialData={featuredNews} />`
- `FeaturedNews` renders immediately with server data; skips the `useEffect` fetch
- Hero image appears in the initial HTML → `priority` preloads it correctly

**Rule:** Apply `priority` to exactly one image per route — the main hero or the first
large above-the-fold image. Do **not** add `priority` to every image; doing so defeats
the preload mechanism.

Current LCP images:
- `FeaturedNews.tsx` — the `main` hero (`lg:col-span-3`, h-80), data fed from `page.tsx` server fetch

---

## Never omit `alt`

All images need a descriptive `alt`. Empty string (`alt=""`) is allowed only for
purely decorative images with no informational value.

---

## Quick checklist for new `<Image>` usage

```
[ ] fill → sizes prop present and matches the layout breakpoints
[ ] fixed size → explicit width + height
[ ] above-the-fold hero → priority prop (one per page)
[ ] alt text present
```
