import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { stockApi } from '../../services/api';
import { Stock, NewsParams } from '../../types';

interface StockState {
  stocks: Stock[];
  currentStock: Stock | null;
  loading: boolean;
  error: string | null;
}

const initialState: StockState = {
  stocks: [],
  currentStock: null,
  loading: false,
  error: null,
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

const stockSlice = createSlice({
  name: 'stocks',
  initialState,
  reducers: {},
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
      });
  },
});

export default stockSlice.reducer;
