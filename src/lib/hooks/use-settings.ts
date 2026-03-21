import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface PersistedSavedView {
  id: string;
  name: string;
  value: Record<string, unknown>;
  createdAt: string;
}

export interface UserSettings {
  notifications: {
    emailTaskAssigned: boolean;
    emailDeadlineReminder: boolean;
    pushEnabled: boolean;
    emailComments: boolean;
    emailTeamDigest: boolean;
    emailReviewRequests: boolean;
    emailApprovalResults: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    language: 'vi' | 'en';
  };
  dashboard: {
    defaultPage: string;
    itemsPerPage: number;
  };
  savedViews: {
    kanban: PersistedSavedView[];
    planning: PersistedSavedView[];
    analytics: PersistedSavedView[];
  };
}

export interface UserSettingsPatch {
  notifications?: Partial<UserSettings['notifications']>;
  appearance?: Partial<UserSettings['appearance']>;
  dashboard?: Partial<UserSettings['dashboard']>;
  savedViews?: Partial<UserSettings['savedViews']>;
}

export const defaultSettings: UserSettings = {
  notifications: {
    emailTaskAssigned: true,
    emailDeadlineReminder: true,
    pushEnabled: false,
    emailComments: true,
    emailTeamDigest: true,
    emailReviewRequests: true,
    emailApprovalResults: true,
  },
  appearance: {
    theme: 'system',
    language: 'vi',
  },
  dashboard: {
    defaultPage: '/dashboard',
    itemsPerPage: 10,
  },
  savedViews: {
    kanban: [],
    planning: [],
    analytics: [],
  },
};

export function mergeUserSettings(target: UserSettings, source: UserSettingsPatch): UserSettings {
  return {
    notifications: {
      ...target.notifications,
      ...(source.notifications || {}),
    },
    appearance: {
      ...target.appearance,
      ...(source.appearance || {}),
    },
    dashboard: {
      ...target.dashboard,
      ...(source.dashboard || {}),
    },
    savedViews: {
      ...target.savedViews,
        ...(source.savedViews || {}),
    },
  };
}

export function useUserSettings() {
  return useQuery<{ data: UserSettings }>({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const response = await fetch('/api/users/me/settings');
      if (!response.ok) throw new Error('Không thể lấy cài đặt');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialData: { data: defaultSettings },
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nextSettings: UserSettingsPatch) => {
      const response = await fetch('/api/users/me/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextSettings),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Không thể cập nhật cài đặt');
      }

      return response.json() as Promise<{ data: UserSettings }>;
    },
    onMutate: async (nextSettings) => {
      await queryClient.cancelQueries({ queryKey: ['user-settings'] });
      const previous = queryClient.getQueryData<{ data: UserSettings }>(['user-settings']);

      if (previous) {
        queryClient.setQueryData<{ data: UserSettings }>(['user-settings'], {
          data: mergeUserSettings(previous.data, nextSettings),
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['user-settings'], context.previous);
      }
    },
    onSuccess: (response) => {
      queryClient.setQueryData(['user-settings'], response);
    },
  });
}
