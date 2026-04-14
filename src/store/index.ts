import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import newsReducer from './slices/newsSlice';
import stockReducer from './slices/stockSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    news: newsReducer,
    stocks: stockReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
