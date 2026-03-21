'use client';

import { useEffect, useMemo, useState } from 'react';

export interface SavedView<T> {
  id: string;
  name: string;
  value: T;
  createdAt: string;
}

export function useSavedViews<T>(storageKey: string) {
  const [views, setViews] = useState<Array<SavedView<T>>>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      setViews(raw ? (JSON.parse(raw) as Array<SavedView<T>>) : []);
    } catch {
      setViews([]);
    } finally {
      setIsReady(true);
    }
  }, [storageKey]);

  const persist = (nextViews: Array<SavedView<T>>) => {
    setViews(nextViews);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, JSON.stringify(nextViews));
    }
  };

  const actions = useMemo(
    () => ({
      saveView(name: string, value: T) {
        const trimmedName = name.trim();
        if (!trimmedName) {
          return;
        }

        const nextViews = [
          {
            id: `${Date.now()}`,
            name: trimmedName,
            value,
            createdAt: new Date().toISOString(),
          },
          ...views.filter((item) => item.name.toLowerCase() !== trimmedName.toLowerCase()),
        ].slice(0, 8);

        persist(nextViews);
      },
      removeView(id: string) {
        persist(views.filter((item) => item.id !== id));
      },
      clearViews() {
        persist([]);
      },
    }),
    [views]
  );

  return {
    views,
    isReady,
    ...actions,
  };
}
