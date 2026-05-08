# ThanhDangBullish — Maintenance, Improvement & Product Roadmap

> Written: 2026-05-08

---

## 1. Current Platform Summary

A **stock market news & analysis platform** with:
- Public news feed (search, filter by category, pagination)
- Live stock price tracker (3-second polling)
- Role-based auth (user / editor / admin)
- Editor dashboard (WYSIWYG post creation via Editor.js)
- Full admin panel (users, posts, categories, stocks)
- Dark mode + 6-language i18n

---

## 2. Maintenance — What Needs Fixing Now

### 2.1 Security
| Issue | Fix |
|---|---|
| Auth enforced client-side only (no `middleware.ts`) | Add Next.js middleware for server-side route protection |
| Token stored in `localStorage` (XSS risk) | Migrate to HTTP-only cookies + refresh token rotation |
| No CSRF protection | Add CSRF token header on state-mutating requests |
| Admin redirect via `useEffect` (flash before redirect) | Move role check to middleware, return 403/redirect at server |

### 2.2 Performance
| Issue | Fix |
|---|---|
| All news pages are CSR (client-side rendered) | Apply ISR (`revalidate: 60`) to `/news` and `/news/[id]` |
| No metadata on article pages | Add `generateMetadata()` to `news/[id]/page.tsx` for SEO |
| No sitemap or robots.txt | Generate `/sitemap.xml` via `src/app/sitemap.ts` |
| Live stock polling is always active | Pause polling when tab is hidden (`visibilitychange` event) |
| Admin bundle loaded eagerly | Lazy-load heavy admin pages with `dynamic()` |

### 2.3 Code Quality
| Issue | Fix |
|---|---|
| No test suite | Add Vitest + Testing Library for unit tests |
| No error boundaries | Wrap route segments in `<ErrorBoundary>` |
| No loading skeletons on news pages | Add skeleton placeholders to avoid layout shift |
| `postsSlice` and `newsSlice` overlap in concern | Consider merging or clearly separating public vs. editor data |
| 6 locale files must be kept in sync manually | Add a lint step that validates all locale keys match `en.json` |

---

## 3. Improvements — What to Build Next

### 3.1 Content & Engagement
- **Article detail page** — Currently `/news/[id]` exists but no `/posts/[id]` for editor-published posts; unify routing
- **Comments system** — Threaded comments per article (own API or Disqus embed)
- **Reactions / Likes** — Bullish 📈 / Bearish 📉 reactions on articles and stock cards
- **Saved / Watchlist** — Logged-in users save articles and bookmark stocks
- **Trending section** — Surface top-viewed articles and most-searched tickers in the sidebar
- **Tags** — Keyword tags on posts for finer-grained filtering beyond categories

### 3.2 Stock Tracker
- **WebSocket** — Replace 3-second HTTP polling with WebSocket for true real-time prices
- **Mini chart** — Sparkline chart per stock row (7-day history)
- **Stock detail page** — `/stocks/[symbol]` with full chart, news feed for that ticker, key stats
- **Portfolio tracker** — User can add holdings and see aggregate P&L (no trade execution needed)
- **Price alerts** — "Notify me when AAPL drops below $180" via in-app + email notification

### 3.3 User Experience
- **Search** — Full-text search across articles AND tickers in one unified search bar
- **User profile page** — `/profile` — avatar, bio, saved articles, comment history
- **Notification center** — In-app bell icon with unread count
- **PWA** — Add `manifest.json` + service worker so the app installs on mobile

---

## 4. Product Idea — Premium Membership for Market Intelligence

The platform's brand ("Bullish") and existing content/stock infrastructure make a **premium subscription** the most natural revenue model. No physical inventory, no shipping, no third-party marketplace.

### Product: **Bullish Premium**

Three tiers:

| Tier | Price (USD) | What they get |
|---|---|---|
| **Free** | $0/mo | All public news, delayed stock prices (15 min), 1 watchlist |
| **Pro** | $9.99/mo | Real-time prices, unlimited watchlists, price alerts (email + in-app), ad-free |
| **Elite** | $29.99/mo | Everything in Pro + weekly analyst reports (PDF), exclusive "Big Move" signal emails, early access to new features |

### Why this fits
- Zero marginal cost — content and data are already there
- Leverages the existing role system — add a `subscription` field to the user model
- Analyst reports are PDF files stored in Cloudflare R2 (already integrated)
- Signal emails use the existing user email infrastructure

---

## 5. Sales & Payment Integration Plan

### 5.1 Payment Provider
**Stripe** is recommended:
- SDKs available for both Next.js and Node.js backends
- Handles subscriptions, invoices, upgrades/downgrades, and refunds
- Webhooks for subscription lifecycle events
- Strong PCI compliance; no card data touches your servers

### 5.2 New Pages

| Route | Purpose |
|---|---|
| `/pricing` | Public pricing page with tier comparison table |
| `/checkout` | Stripe Checkout redirect (or embedded Stripe Elements form) |
| `/billing` | User billing portal (manage plan, download invoices, cancel) |
| `/admin/subscriptions` | Admin view of all subscribers, MRR stats |

### 5.3 New Redux Slices

```
subscriptionSlice
  state: { plan, status, nextBillingDate, invoices, loading, error }
  actions: fetchSubscription, createCheckoutSession, cancelSubscription
```

### 5.4 Backend Changes Needed (coordinate with API team)

| Endpoint | Method | Description |
|---|---|---|
| `/subscriptions/checkout` | POST | Create Stripe Checkout session, return URL |
| `/subscriptions/portal` | POST | Create Stripe Customer Portal session, return URL |
| `/subscriptions/webhook` | POST | Handle Stripe webhook events (payment succeeded, cancelled, etc.) |
| `/subscriptions/me` | GET | Return current user's subscription status |
| `/reports` | GET | List premium PDF reports (gated to Pro/Elite) |
| `/reports/:id/download` | GET | Signed R2 URL for report download (gated) |
| `/alerts` | GET/POST/DELETE | Price alert CRUD (gated to Pro/Elite) |

### 5.5 Subscription-Gating Pattern

Create a reusable component `<PremiumGate requiredPlan="pro">` that:
1. Checks `subscriptionSlice.plan` against `requiredPlan`
2. If insufficient: renders a blurred preview + upgrade CTA
3. If sufficient: renders `children`

Use this gate on:
- Price alert UI
- Report download buttons
- Real-time price cells (show "Live" badge vs. "15-min delay" badge)

### 5.6 Stripe Webhook Flow

```
User clicks "Upgrade to Pro"
  → POST /subscriptions/checkout
  → Backend creates Stripe Checkout Session
  → Frontend redirects to Stripe-hosted page
  → User pays → Stripe fires webhook to /subscriptions/webhook
  → Backend sets user.subscriptionPlan = "pro"
  → User redirected back to /billing with success message
```

---

## 6. Implementation Phases

### Phase 1 — Security & SEO (2 weeks)
- [ ] Add Next.js `middleware.ts` for route protection
- [ ] Migrate auth to HTTP-only cookies
- [ ] ISR on `/news` and `/news/[id]`
- [ ] `generateMetadata()` on article pages
- [ ] Sitemap + robots.txt

### Phase 2 — Engagement Features (3 weeks)
- [ ] Stock detail page `/stocks/[symbol]`
- [ ] Save/watchlist feature
- [ ] Trending sidebar section
- [ ] Tags on posts

### Phase 3 — Pricing & Billing Infrastructure (4 weeks)
- [ ] Stripe account setup + product/price configuration
- [ ] `/pricing` page with tier comparison
- [ ] `subscriptionSlice` + billing API integration
- [ ] `/checkout` and `/billing` pages
- [ ] Webhook handler on backend
- [ ] `<PremiumGate>` component
- [ ] Gate real-time prices behind Pro tier

### Phase 4 — Premium Content (3 weeks)
- [ ] Analyst report upload UI in admin
- [ ] `/reports` listing page (Elite gated)
- [ ] Price alerts UI + email notification system
- [ ] `/admin/subscriptions` stats page

### Phase 5 — Growth (ongoing)
- [ ] Comments system
- [ ] Portfolio tracker
- [ ] PWA support
- [ ] WebSocket for live prices

---

## 7. Tech Stack Additions

| Addition | Purpose |
|---|---|
| `@stripe/stripe-js` + `@stripe/react-stripe-js` | Client-side Stripe Elements |
| `stripe` (server/backend) | Stripe Node SDK for checkout sessions and webhooks |
| `recharts` or `lightweight-charts` | Stock sparklines and detail charts |
| `@tanstack/react-query` (optional) | Replace some Redux thunks for server-state (billing, reports) |
| Vitest + Testing Library | Unit and component tests |
| Playwright | E2E tests for critical purchase flows |

---

## 8. Revenue Estimation (Conservative)

| Metric | Value |
|---|---|
| Monthly active readers (target Y1) | 10,000 |
| Free → Pro conversion (2%) | 200 subscribers |
| Free → Elite conversion (0.5%) | 50 subscribers |
| **Monthly Recurring Revenue** | **$200 × $9.99 + 50 × $29.99 ≈ $3,498/mo** |
| Annual (no churn) | ~$42,000/yr |

This is achievable with quality market content and a focused audience in the finance/investing niche.
