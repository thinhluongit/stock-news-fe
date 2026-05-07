# VNIndex Real-Time Price Display — Backend Plan

## Context

The frontend polls the app's own backend for near-real-time stock prices rather than calling TCBS directly. This keeps CORS under control, enables server-side caching to avoid hammering TCBS, and gives a single choke point to swap data providers later.

The backend is an Express/Node.js API (running at `localhost:5000`). All existing stock routes live in the `stocks` router. This plan adds one new GET endpoint to that router.

---

## TCBS API Reference

**Price board endpoint** (no auth required):
```
GET https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/price-board
    ?ticker=VCB,VNM,VHM,HPG,...
```

**Sample response shape** (abbreviated):
```json
{
  "data": [
    {
      "ticker": "VCB",
      "lastPrice": 88500,
      "priceChange": 500,
      "priceChangeRatio": 0.00569,
      "totalVolume": 1234567,
      "highPrice": 89000,
      "lowPrice": 87500
    }
  ]
}
```

> Prices are in VND (whole numbers). `priceChangeRatio` is a decimal (multiply × 100 for percentage).

---

## New Endpoint

```
GET /api/stocks/market-data?tickers=VCB,VNM,HPG
```

**Auth:** None required (public read). Add to the list of unprotected routes.

**Response:**
```json
[
  {
    "ticker": "VCB",
    "price": 88500,
    "change": 500,
    "changePct": 0.569,
    "volume": 1234567,
    "high": 89000,
    "low": 87500,
    "updatedAt": "2026-05-04T09:30:00.000Z"
  }
]
```

**Error response (TCBS unreachable):**
```json
{ "error": "Market data temporarily unavailable" }   // HTTP 503
```

---

## Implementation Steps

### 1. In-Memory Cache — `src/services/tcbsService.js` (new file)

```js
const axios = require('axios');

const TCBS_BASE = 'https://apipubaws.tcbs.com.vn/stock-insight/v1/stock';
const CACHE_TTL_MS = 5000;   // 5-second cache; TCBS updates ~every 3–5s anyway

const cache = new Map();     // ticker_csv → { data, expiresAt }

async function getPriceBoard(tickers) {
  const key = tickers.sort().join(',');
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.data;

  const { data: resp } = await axios.get(`${TCBS_BASE}/price-board`, {
    params: { ticker: key },
    timeout: 4000,
    headers: { 'User-Agent': 'Mozilla/5.0' },   // TCBS blocks default axios UA
  });

  const normalized = (resp.data ?? []).map(item => ({
    ticker:     item.ticker,
    price:      item.lastPrice,
    change:     item.priceChange,
    changePct:  parseFloat((item.priceChangeRatio * 100).toFixed(3)),
    volume:     item.totalVolume,
    high:       item.highPrice,
    low:        item.lowPrice,
    updatedAt:  new Date().toISOString(),
  }));

  cache.set(key, { data: normalized, expiresAt: Date.now() + CACHE_TTL_MS });
  return normalized;
}

module.exports = { getPriceBoard };
```

### 2. Route Handler — `src/routes/stocks.js`

Add before the existing routes (order matters — specific before parameterized):

```js
const { getPriceBoard } = require('../services/tcbsService');

// GET /stocks/market-data?tickers=VCB,VNM
router.get('/market-data', async (req, res) => {
  const { tickers } = req.query;
  if (!tickers) return res.status(400).json({ error: 'tickers query param required' });

  const tickerList = tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
  if (tickerList.length > 50)
    return res.status(400).json({ error: 'Max 50 tickers per request' });

  try {
    const data = await getPriceBoard(tickerList);
    res.json(data);
  } catch (err) {
    console.error('[TCBS] fetch failed:', err.message);
    res.status(503).json({ error: 'Market data temporarily unavailable' });
  }
});
```

### 3. Auth Bypass

Add `/api/stocks/market-data` to the list of public (no-JWT) routes in the auth middleware. Exact location depends on the middleware setup — typically an `isPublic` array or a whitelist check before `verifyToken`.

### 4. Input Validation

- Tickers: only `A-Z` characters and commas. Reject anything else.
  ```js
  if (!/^[A-Z,]+$/.test(tickers.toUpperCase()))
    return res.status(400).json({ error: 'Invalid ticker format' });
  ```
- Max 50 tickers per request (see above).

---

## Error Handling Strategy

| Scenario | Behaviour |
|----------|-----------|
| TCBS timeout (>4s) | Return 503; cached data used if still valid |
| TCBS returns empty array | Return `[]`; frontend falls back to static price |
| Invalid tickers param | Return 400 immediately |
| Cache cold + TCBS down | Return 503 |

---

## Operational Notes

- **Cache size:** With ~100 unique stocks in the DB, the Map will hold at most a few entries (frontend sends all tickers as one request). No eviction strategy needed.
- **Rate limiting:** If a global rate limiter is applied, exclude `/stocks/market-data` or set a higher limit (clients poll every 3s per open tab).
- **TCBS reliability:** TCBS is an unofficial endpoint. Wrap the entire integration in try/catch and never let a TCBS failure crash the server process.
- **VNIndex index value:** TCBS also exposes the index itself at a different endpoint (`/index/chart`). Adding VNIndex summary (value, change from yesterday's close) can be a follow-up task.

---

## Verification

1. `curl "http://localhost:5000/api/stocks/market-data?tickers=VCB,VNM"` — should return JSON array with prices
2. Call twice within 5 seconds — second call should not produce a new outbound request to TCBS (check logs)
3. Test with invalid ticker param (`tickers=VCB;DROP`) — should return 400
4. Simulate TCBS down (disconnect internet / mock) — should return 503 without crashing the server
5. Test without auth token — should succeed (public route)
