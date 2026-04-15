'use client';

import { Provider } from 'react-redux';
import { store } from '../store';
import { Toaster } from 'react-hot-toast';
import { LocaleProvider } from '../i18n/LocaleContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <Provider store={store}>
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
