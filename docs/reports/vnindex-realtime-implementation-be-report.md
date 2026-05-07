# VNIndex Real-Time Price Display — Implementation Report

## Overview

Implemented a public `GET /api/stocks/market-data` endpoint that proxies TCBS's price-board API with server-side caching. The frontend can poll this endpoint to display near-real-time VNIndex stock price fluctuations without calling TCBS directly.

---

## Files Changed

### 1. `src/services/tcbsService.ts` (created)

New service responsible for all TCBS communication.

- Defines `TcbsPriceItem` (raw TCBS shape) and `MarketDataItem` (normalized response shape) interfaces.
- Exports `getPriceBoard(tickers: string[]): Promise<MarketDataItem[]>`.
- **Caching:** Uses a `Map` keyed by sorted ticker CSV. Cache TTL is 5 seconds — aligned with TCBS's own update frequency. A cache hit skips the outbound HTTP call entirely.
- **HTTP:** Uses native Node.js `fetch` (no new dependency). Sets `User-Agent: Mozilla/5.0` to avoid TCBS blocking the default UA, and a 4-second timeout via `AbortSignal.timeout`.
- **Normalization:** Maps TCBS field names to cleaner keys (`lastPrice` → `price`, etc.) and converts `priceChangeRatio` from decimal to percentage (×100, 3 decimal places).

### 2. `src/controllers/stockController.ts` (modified)

Added `getMarketData` export.

- Validates that `tickers` is present and matches `/^[A-Z,]+$/i` (letters and commas only — rejects injection attempts like `VCB;DROP`).
- Splits, trims, and uppercases the ticker list; rejects requests with more than 50 tickers.
- Calls `getPriceBoard` and returns the array directly as JSON.
- On any error from the service, logs to stderr and returns `HTTP 503` with `{ "error": "Market data temporarily unavailable" }` — TCBS failures never crash the server.

### 3. `src/routes/stocks.ts` (modified)

- Added `router.get('/market-data', getMarketData)` **before** the `/:symbol` parameterized route. Placement is critical — Express matches routes in order, so `/market-data` must be registered first or it would be captured as a symbol lookup.
- No `authenticate` middleware is attached, making the route fully public.

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Native `fetch` instead of `axios` | Avoids adding a dependency; Node 18+ ships `fetch` natively |
| Service layer for TCBS logic | Keeps controller thin and consistent with the existing 4-layer architecture |
| No controller `next(err)` for TCBS errors | TCBS failures are expected/external; a 503 response is the correct contract, not an unhandled exception |
| Sorted cache key | Ensures `VCB,VNM` and `VNM,VCB` hit the same cache entry |
| Input regex before split | Validates the raw query string in one pass before any further processing |

---

## Verification Steps

```bash
# 1. Basic fetch
curl "http://localhost:5000/api/stocks/market-data?tickers=VCB,VNM"
# Expected: JSON array with price fields

# 2. Cache hit (call twice within 5s — no second outbound request in logs)
curl "http://localhost:5000/api/stocks/market-data?tickers=VCB,VNM"

# 3. Invalid format — should return 400
curl "http://localhost:5000/api/stocks/market-data?tickers=VCB;DROP"

# 4. Missing param — should return 400
curl "http://localhost:5000/api/stocks/market-data"

# 5. No auth token — should succeed (public route)
curl -H "" "http://localhost:5000/api/stocks/market-data?tickers=VCB"
```

---

## Follow-Up Tasks (from plan)

- **VNIndex index value:** TCBS exposes the composite index at a different endpoint (`/index/chart`). A follow-up can add a `GET /api/stocks/market-index` endpoint returning the VNIndex value and day change.
- **Rate limiting:** If a global rate limiter is added later, `/api/stocks/market-data` should be excluded or given a higher limit (clients poll every ~3 seconds per open tab).
