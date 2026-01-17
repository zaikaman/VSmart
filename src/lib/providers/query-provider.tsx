'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Caching strategies optimized
            staleTime: 5 * 60 * 1000, // 5 phút - data được coi là fresh trong 5 phút
            gcTime: 10 * 60 * 1000, // 10 phút - cache sẽ được giữ trong 10 phút (cacheTime trong v4)
            
            // Performance optimizations
            refetchOnWindowFocus: false, // Không refetch khi focus window
            refetchOnReconnect: true, // Refetch khi reconnect internet
            refetchOnMount: false, // Không tự động refetch khi mount nếu data còn fresh
            
            // Retry strategies
            retry: 1, // Chỉ retry 1 lần thay vì 3 lần mặc định
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            
            // Network mode
            networkMode: 'online', // Chỉ fetch khi online
          },
          mutations: {
            // Mutation settings
            retry: 0, // Không retry mutations
            networkMode: 'online',
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

