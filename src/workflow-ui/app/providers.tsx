'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import { useState, useEffect } from 'react';
import { TourProvider } from '@/components/tours/tour-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [mswReady, setMswReady] = useState(false);

  useEffect(() => {
    async function initMocks() {
      // Check if MSW is enabled via environment variable
      const enableMSW = process.env.NEXT_PUBLIC_ENABLE_MSW === 'true';

      if (!enableMSW) {
        // MSW disabled - skip initialization and proceed immediately
        setMswReady(true);
        return;
      }

      // MSW enabled - initialize the service worker
      if (typeof window !== 'undefined') {
        const { worker } = await import('@/lib/mocks/browser');
        await worker.start({
          onUnhandledRequest: 'bypass',
        });
        setMswReady(true);
      }
    }

    initMocks();
  }, []);

  if (!mswReady) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TourProvider>
          {children}
        </TourProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
