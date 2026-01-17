import { useQuery } from '@tanstack/react-query';

export interface UserSettings {
    notifications: {
        emailTaskAssigned: boolean;
        emailDeadlineReminder: boolean;
        pushEnabled: boolean;
        emailComments: boolean;
    };
    dashboard: {
        defaultPage: string;
        itemsPerPage: number;
    };
}

export const defaultSettings: UserSettings = {
    notifications: {
        emailTaskAssigned: true,
        emailDeadlineReminder: true,
        pushEnabled: false,
        emailComments: true,
    },
    dashboard: {
        defaultPage: '/dashboard',
        itemsPerPage: 10,
    },
};

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
