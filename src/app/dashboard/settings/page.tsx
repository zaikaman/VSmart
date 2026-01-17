'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
    Bell,
    Mail,
    MessageSquare,
    Smartphone,
    Sun,
    Moon,
    Monitor,
    LayoutDashboard,
    List,
    ClipboardList,
    Shield,
    LogOut,
    Download,
    Trash2,
    Loader2,
    Settings,
} from 'lucide-react';

interface UserSettings {
    notifications: {
        emailTaskAssigned: boolean;
        emailDeadlineReminder: boolean;
        pushEnabled: boolean;
        emailComments: boolean;
    };
    appearance: {
        theme: 'light' | 'dark' | 'system';
        language: string;
    };
    dashboard: {
        defaultPage: string;
        itemsPerPage: number;
    };
}

const defaultSettings: UserSettings = {
    notifications: {
        emailTaskAssigned: true,
        emailDeadlineReminder: true,
        pushEnabled: false,
        emailComments: true,
    },
    appearance: {
        theme: 'system',
        language: 'vi',
    },
    dashboard: {
        defaultPage: '/dashboard',
        itemsPerPage: 10,
    },
};

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const [pendingChanges, setPendingChanges] = useState<Partial<UserSettings>>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Fetch settings
    const { data: settingsResponse, isLoading } = useQuery<{ data: UserSettings }>({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const response = await fetch('/api/users/me/settings');
            if (!response.ok) throw new Error('Không thể lấy cài đặt');
            return response.json();
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
        refetchOnWindowFocus: false, // Don't refetch on tab focus
        initialData: { data: defaultSettings }, // Use defaults while loading
    });


    const settings = settingsResponse?.data || defaultSettings;

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async (newSettings: Partial<UserSettings>) => {
            const response = await fetch('/api/users/me/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Không thể cập nhật cài đặt');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            setPendingChanges({});
            setHasChanges(false);
            toast.success('Đã lưu cài đặt thành công');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Note: Theme switching is handled separately by the theme provider
    // This page only manages the settings state, not the actual theme application


    const handleNotificationChange = (key: keyof UserSettings['notifications'], value: boolean) => {
        setPendingChanges(prev => ({
            ...prev,
            notifications: {
                ...settings.notifications,
                ...(prev.notifications || {}),
                [key]: value,
            },
        }));
        setHasChanges(true);
    };

    const handleAppearanceChange = (key: keyof UserSettings['appearance'], value: string) => {
        setPendingChanges(prev => ({
            ...prev,
            appearance: {
                ...settings.appearance,
                ...(prev.appearance || {}),
                [key]: value,
            },
        }));
        setHasChanges(true);
    };

    const handleDashboardChange = (key: keyof UserSettings['dashboard'], value: string | number) => {
        setPendingChanges(prev => ({
            ...prev,
            dashboard: {
                ...settings.dashboard,
                ...(prev.dashboard || {}),
                [key]: value,
            },
        }));
        setHasChanges(true);
    };

    const handleSave = () => {
        updateMutation.mutate(pendingChanges);
    };

    const handleCancel = () => {
        setPendingChanges({});
        setHasChanges(false);
    };

    const currentSettings = {
        notifications: { ...settings.notifications, ...(pendingChanges.notifications || {}) },
        appearance: { ...settings.appearance, ...(pendingChanges.appearance || {}) },
        dashboard: { ...settings.dashboard, ...(pendingChanges.dashboard || {}) },
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <Skeleton className="h-10 w-48 mb-6" />
                <div className="space-y-6">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-48 mb-2" />
                                <Skeleton className="h-4 w-80" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-24 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Cài đặt</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Quản lý tùy chọn cá nhân và cấu hình hệ thống
                    </p>
                </div>
                {hasChanges && (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Button variant="outline" onClick={handleCancel} disabled={updateMutation.isPending}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                            className="bg-[#b9ff66] text-black hover:bg-[#b9ff66]/90"
                        >
                            {updateMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                'Lưu thay đổi'
                            )}
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid gap-6">
                {/* Notification Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Thông báo</CardTitle>
                        <CardDescription>
                            Tùy chọn cách bạn nhận thông báo từ hệ thống
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Email khi được phân công</Label>
                                <p className="text-sm text-muted-foreground">
                                    Nhận email khi có task mới được giao cho bạn
                                </p>
                            </div>
                            <Switch
                                checked={currentSettings.notifications.emailTaskAssigned}
                                onCheckedChange={(checked) => handleNotificationChange('emailTaskAssigned', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Email nhắc nhở deadline</Label>
                                <p className="text-sm text-muted-foreground">
                                    Nhận email thông báo khi task sắp đến hạn
                                </p>
                            </div>
                            <Switch
                                checked={currentSettings.notifications.emailDeadlineReminder}
                                onCheckedChange={(checked) => handleNotificationChange('emailDeadlineReminder', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Thông báo trình duyệt</Label>
                                <p className="text-sm text-muted-foreground">
                                    Hiển thị thông báo push trên trình duyệt của bạn
                                </p>
                            </div>
                            <Switch
                                checked={currentSettings.notifications.pushEnabled}
                                onCheckedChange={(checked) => handleNotificationChange('pushEnabled', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Email bình luận mới</Label>
                                <p className="text-sm text-muted-foreground">
                                    Nhận email khi có thảo luận trong task của bạn
                                </p>
                            </div>
                            <Switch
                                checked={currentSettings.notifications.emailComments}
                                onCheckedChange={(checked) => handleNotificationChange('emailComments', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Appearance Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Giao diện</CardTitle>
                        <CardDescription>
                            Tùy chỉnh trải nghiệm hiển thị của ứng dụng
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Chế độ hiển thị</Label>
                                <p className="text-sm text-muted-foreground">
                                    Chọn giao diện sáng, tối hoặc theo hệ thống
                                </p>
                            </div>
                            <Select
                                value={currentSettings.appearance.theme}
                                onValueChange={(value) => handleAppearanceChange('theme', value)}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="light">
                                        <div className="flex items-center gap-2">
                                            <Sun className="h-4 w-4" />
                                            <span>Sáng</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="dark">
                                        <div className="flex items-center gap-2">
                                            <Moon className="h-4 w-4" />
                                            <span>Tối</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="system">
                                        <div className="flex items-center gap-2">
                                            <Monitor className="h-4 w-4" />
                                            <span>Hệ thống</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Ngôn ngữ</Label>
                                <p className="text-sm text-muted-foreground">
                                    Ngôn ngữ hiển thị của ứng dụng
                                </p>
                            </div>
                            <Select
                                value={currentSettings.appearance.language}
                                onValueChange={(value) => handleAppearanceChange('language', value)}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                                    <SelectItem value="en" disabled>English (Sắp có)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Dashboard Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Dashboard</CardTitle>
                        <CardDescription>
                            Cấu hình trang chủ và hiển thị dữ liệu
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Trang mặc định</Label>
                                <p className="text-sm text-muted-foreground">
                                    Trang sẽ mở đầu tiên khi bạn đăng nhập
                                </p>
                            </div>
                            <Select
                                value={currentSettings.dashboard.defaultPage}
                                onValueChange={(value) => handleDashboardChange('defaultPage', value)}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="/dashboard">Tổng quan</SelectItem>
                                    <SelectItem value="/dashboard/projects">Dự án</SelectItem>
                                    <SelectItem value="/dashboard/kanban">Bảng Kanban</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Số lượng hiển thị</Label>
                                <p className="text-sm text-muted-foreground">
                                    Số dòng hiển thị mặc định trên mỗi trang danh sách
                                </p>
                            </div>
                            <Select
                                value={String(currentSettings.dashboard.itemsPerPage)}
                                onValueChange={(value) => handleDashboardChange('itemsPerPage', parseInt(value))}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10 dòng</SelectItem>
                                    <SelectItem value="25">25 dòng</SelectItem>
                                    <SelectItem value="50">50 dòng</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Security & Data */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bảo mật & Dữ liệu</CardTitle>
                        <CardDescription>
                            Quản lý tài khoản và quyền riêng tư của bạn
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Phiên đăng nhập</Label>
                                <p className="text-sm text-muted-foreground">
                                    Đăng xuất khỏi tất cả các thiết bị khác ngoại trừ thiết bị này
                                </p>
                            </div>
                            <Button variant="outline" size="sm">
                                Đăng xuất thiết bị khác
                            </Button>
                        </div>

                        <div className="pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base text-destructive">Vùng nguy hiểm</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Xóa vĩnh viễn tài khoản và tất cả dữ liệu liên quan
                                    </p>
                                </div>
                                <Button variant="destructive" size="sm">
                                    Xóa tài khoản
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
