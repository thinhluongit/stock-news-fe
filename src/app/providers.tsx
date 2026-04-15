'use client';

import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { useAppDispatch } from '../store/hooks';
import { fetchCurrentUser } from '../store/slices/authSlice';
import { Toaster } from 'react-hot-toast';
import { LocaleProvider } from '../i18n/LocaleContext';

function AuthBootstrap() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    // Always attempt to restore auth from token on app startup.
    // If token is valid  → fetchCurrentUser.fulfilled sets user + initialized=true
    // If token is missing/invalid → fetchCurrentUser.rejected clears token + initialized=true
    dispatch(fetchCurrentUser());
  }, [dispatch]);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <Provider store={store}>
        <AuthBootstrap />
        {children}
        <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#1f2937', color: '#f9fafb', borderRadius: '8px' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
        />
      </Provider>
    </LocaleProvider>
  );
}
