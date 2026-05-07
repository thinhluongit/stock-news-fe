import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { stockApi } from '../../services/api';
import { Stock, MarketDataItem, NewsParams } from '../../types';

interface StockState {
  stocks: Stock[];
  currentStock: Stock | null;
  loading: boolean;
  error: string | null;
  marketData: Record<string, MarketDataItem>;
  marketDataLoading: boolean;
  marketDataError: string | null;
  lastFetched: number | null;
}

const initialState: StockState = {
  stocks: [],
  currentStock: null,
  loading: false,
  error: null,
  marketData: {},
  marketDataLoading: false,
  marketDataError: null,
  lastFetched: null,
};

type ApiError = { response?: { data?: { error?: string } } };
const extractError = (err: unknown, fallback: string): string =>
  (err as ApiError).response?.data?.error ?? fallback;

export const fetchStocks = createAsyncThunk<Stock[], NewsParams | undefined, { rejectValue: string }>(
  'stocks/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await stockApi.getAll(params);
      return (res.data as { data: Stock[] }).data;
    } catch (err) {
      return rejectWithValue(extractError(err, 'Failed to fetch stocks'));
    }
  }
);

export const fetchStockDetail = createAsyncThunk<Stock, string, { rejectValue: string }>(
  'stocks/fetchOne',
  async (symbol, { rejectWithValue }) => {
    try {
      const res = await stockApi.getBySymbol(symbol);
      return (res.data as { data: Stock }).data;
    } catch (err) {
      return rejectWithValue(extractError(err, 'Stock not found'));
    }
  }
);

export const fetchMarketData = createAsyncThunk<MarketDataItem[], string[], { rejectValue: string }>(
  'stocks/fetchMarketData',
  async (tickers, { rejectWithValue }) => {
    try {
      const res = await stockApi.marketData(tickers.join(','));
      return res.data as MarketDataItem[];
    } catch (err) {
      return rejectWithValue(extractError(err, 'Failed to fetch market data'));
    }
  }
);

const stockSlice = createSlice({
  name: 'stocks',
  initialState,
  reducers: {
    setMarketData: (state, action: PayloadAction<MarketDataItem[]>) => {
      const record: Record<string, MarketDataItem> = {};
      action.payload.forEach((item) => { record[item.ticker] = item; });
      state.marketData = record;
      state.lastFetched = Date.now();
      state.marketDataError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStocks.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchStocks.fulfilled, (state, action) => { state.loading = false; state.stocks = action.payload; })
      .addCase(fetchStocks.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.loading = false; state.error = action.payload ?? 'Error';
      })
      .addCase(fetchStockDetail.pending, (state) => { state.loading = true; })
      .addCase(fetchStockDetail.fulfilled, (state, action) => { state.loading = false; state.currentStock = action.payload; })
      .addCase(fetchStockDetail.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.loading = false; state.error = action.payload ?? 'Error';
      })
      .addCase(fetchMarketData.pending, (state) => {
        state.marketDataLoading = true;
        state.marketDataError = null;
      })
      .addCase(fetchMarketData.fulfilled, (state, action) => {
        state.marketDataLoading = false;
        const record: Record<string, MarketDataItem> = {};
        action.payload.forEach((item) => { record[item.ticker] = item; });
        state.marketData = record;
        state.lastFetched = Date.now();
      })
      .addCase(fetchMarketData.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.marketDataLoading = false;
        state.marketDataError = action.payload ?? 'Error';
      });
  },
});

export const { setMarketData } = stockSlice.actions;
export default stockSlice.reducer;
