import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 15 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: false,
        retry: 1,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        networkMode: 'online',
      },
      mutations: {
        retry: 0,
        networkMode: 'online',
      },
    },
  });

  client.setQueryDefaults(['projects'], {
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  client.setQueryDefaults(['project-parts'], {
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  client.setQueryDefaults(['tasks'], {
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  client.setQueryDefaults(['notifications'], {
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  client.setQueryDefaults(['stats'], {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  client.setQueryDefaults(['user-settings'], {
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  return client;
}
