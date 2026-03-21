'use client';

import { useMemo } from 'react';
import { useUpdateUserSettings, useUserSettings, type PersistedSavedView, type UserSettings } from '@/lib/hooks/use-settings';

export interface SavedView<T> {
  id: string;
  name: string;
  value: T;
  createdAt: string;
}

type SavedViewBucket = keyof UserSettings['savedViews'];

export function useSavedViews<T extends Record<string, unknown>>(bucket: SavedViewBucket) {
  const { data: settingsResponse } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const rawViews = (settingsResponse?.data.savedViews?.[bucket] || []) as PersistedSavedView[];
  const views = rawViews as Array<SavedView<T>>;

  const actions = useMemo(
    () => ({
      saveView(name: string, value: T) {
        const trimmedName = name.trim();
        if (!trimmedName) {
          return;
        }

        const nextViews: PersistedSavedView[] = [
          {
            id: `${Date.now()}`,
            name: trimmedName,
            value,
            createdAt: new Date().toISOString(),
          },
          ...rawViews.filter((item) => item.name.toLowerCase() !== trimmedName.toLowerCase()),
        ].slice(0, 8);

        updateSettings.mutate({
          savedViews: {
            [bucket]: nextViews,
          } as Partial<UserSettings['savedViews']>,
        });
      },
      removeView(id: string) {
        updateSettings.mutate({
          savedViews: {
            [bucket]: rawViews.filter((item) => item.id !== id),
          } as Partial<UserSettings['savedViews']>,
        });
      },
      clearViews() {
        updateSettings.mutate({
          savedViews: {
            [bucket]: [],
          } as Partial<UserSettings['savedViews']>,
        });
      },
    }),
    [bucket, rawViews, updateSettings]
  );

  return {
    views,
    isReady: !!settingsResponse,
    isSaving: updateSettings.isPending,
    ...actions,
  };
}
