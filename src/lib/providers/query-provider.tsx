'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { RealtimeDataProvider } from '@/lib/providers/realtime-data-provider';
import { makeQueryClient } from '@/lib/query/make-query-client';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeDataProvider>{children}</RealtimeDataProvider>
    </QueryClientProvider>
  );
}
