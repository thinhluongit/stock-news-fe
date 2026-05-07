'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchMarketData } from '../store/slices/stockSlice';

export function useMarketData(tickers: string[], intervalMs = 3000) {
  const dispatch = useAppDispatch();
  // Backend regex accepts letters and commas only — drop tickers like BRK.B that contain other characters
  const tickerKey = tickers.filter(t => /^[A-Z]+$/i.test(t)).join(',');

  useEffect(() => {
    if (!tickerKey) return;
    const list = tickerKey.split(',');
    dispatch(fetchMarketData(list));
    const id = setInterval(() => dispatch(fetchMarketData(list)), intervalMs);
    return () => clearInterval(id);
  }, [tickerKey, intervalMs, dispatch]);

  return useAppSelector((s) => s.stocks.marketData);
}
