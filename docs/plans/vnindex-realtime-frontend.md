# VNIndex Real-Time Price Display — Frontend Plan

## Context

The existing `/stocks` page loads stock records from the app's own database via `stockApi.getAll()`. These records hold metadata (symbol, company, sector) and a static `current_price` field that only updates when an admin manually edits it. There is no live market data.

This feature adds near-real-time (3-second polling) price display for VNIndex-listed stocks by calling a new backend proxy endpoint that fetches from the TCBS unofficial API. The display is numerical only (price, change, change%) — no charts.

---

## Architecture Decision

The backend acts as a proxy — the frontend never calls TCBS directly. This avoids CORS issues and keeps the TCBS dependency server-side where it can be cached and rate-limited.

```
Browser (3s poll) → /api/stocks/market-data → Backend cache (5s TTL) → TCBS API
```

---

## What Changes

### 1. API Layer — `src/services/api.ts`

Add one new method to `stockApi`:

```ts
marketData: (tickers: string) =>
  api.get<MarketDataItem[]>('/stocks/market-data', { params: { tickers } }),
```

### 2. Types — `src/types/index.ts`

Add the shape returned by the backend proxy:

```ts
export interface MarketDataItem {
  ticker: string;
  price: number;
  change: number;       // absolute change from previous close
  changePct: number;    // percentage change
  volume: number;
  high: number;
  low: number;
  updatedAt: string;    // ISO timestamp
}
```

### 3. Redux — `src/store/slices/stockSlice.ts`

Add to the existing slice (no new file needed):

```ts
// New state fields
marketData: Record<string, MarketDataItem>;  // keyed by ticker
marketDataLoading: boolean;
marketDataError: string | null;
lastFetched: number | null;                 // ms timestamp, for staleness check

// New thunk
fetchMarketData(tickers: string[]) // calls stockApi.marketData()
```

Add `setMarketData` reducer for direct updates (avoids double-render from thunk lifecycle).

### 4. Custom Hook — `src/hooks/useMarketData.ts` (new file)

Encapsulates the polling logic so the page component stays clean:

```ts
function useMarketData(tickers: string[], intervalMs = 3000) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!tickers.length) return;
    dispatch(fetchMarketData(tickers));                  // immediate first fetch
    const id = setInterval(() => dispatch(fetchMarketData(tickers)), intervalMs);
    return () => clearInterval(id);                      // cleanup on unmount
  }, [tickers.join(',')]);                               // stable dep

  return useAppSelector(s => s.stocks.marketData);
}
```

### 5. Price Cell Component — `src/components/stocks/PriceCell.tsx` (new file)

Reusable component that renders price + change with color and direction arrow. Plays a brief flash animation when the value changes (CSS transition, no library needed).

Props:
```ts
{ price: number; change: number; changePct: number; size?: 'sm' | 'md' }
```

Renders:
- Price in white
- `▲ +0.5 (+1.2%)` in green-400 / `▼ -0.5 (-1.2%)` in red-400
- Unchanged: gray-400, no arrow
- Brief background flash (green/red) when `price` prop changes (via `useRef` comparison)

### 6. Stocks Page — `src/app/stocks/page.tsx`

Wire up `useMarketData` and replace static price cells with `<PriceCell>`:

```
1. After fetching stocks from Redux (existing), extract tickers array
2. Call useMarketData(tickers)
3. In the table row, if marketData[stock.symbol] exists → render <PriceCell>
   else → render static price from stock.current_price (fallback)
4. Add a "Live" badge / last-updated timestamp in the page header
5. Show a "Market data unavailable" banner if marketDataError is set
```

No changes to the admin stocks page — admin manages the database record, not live prices.

### 7. i18n — `src/i18n/locales/en.json` + `vi.json`

Add under `stocks`:
```json
"live_badge": "Live",
"market_unavailable": "Market data temporarily unavailable",
"last_updated": "Updated",
"no_change": "Unchanged"
```

---

## File Change Summary

| File | Action |
|------|--------|
| `src/services/api.ts` | Add `marketData` method to `stockApi` |
| `src/types/index.ts` | Add `MarketDataItem` interface |
| `src/store/slices/stockSlice.ts` | Add `marketData` state + `fetchMarketData` thunk |
| `src/hooks/useMarketData.ts` | New — polling hook |
| `src/components/stocks/PriceCell.tsx` | New — price display component |
| `src/app/stocks/page.tsx` | Wire in live data, replace price cells |
| `src/i18n/locales/en.json` | New i18n keys |
| `src/i18n/locales/vi.json` | New i18n keys |

---

## Verification

1. `npm run dev` — navigate to `/stocks`
2. Open DevTools Network tab — confirm `GET /api/stocks/market-data` fires every ~3 seconds
3. Prices update visually; green/red colors and arrows match direction
4. Disconnect backend → "Market data unavailable" banner appears; page still renders with static prices
5. Navigate away and back — polling stops while unmounted (no memory leak)
6. `npm run build` — no TypeScript errors
