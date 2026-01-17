'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { UserSettings, defaultSettings, useUserSettings } from '@/lib/hooks/use-settings';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
    Loader2,
    LogOut,
    Trash2,
} from 'lucide-react';

export default function SettingsPage() {
    const queryClient = useQueryClient();

    const router = useRouter();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Fetch settings
    const { data: settingsResponse, isLoading } = useUserSettings();

    // Note: Theme switching is handled separately by the theme provider
    // This page only manages the settings state, not the actual theme application

    // Logout other devices mutation
    const logoutOthersMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/users/me/logout-others', {
                method: 'POST',
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Không thể đăng xuất các thiết bị khác');
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success('Đã đăng xuất tất cả các thiết bị khác');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Delete account mutation
    const deleteAccountMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/users/me/delete-account', {
                method: 'DELETE',
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Không thể xóa tài khoản');
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success('Tài khoản đã được xóa');
            router.push('/');
        },
        onError: (error: Error) => {
            toast.error(error.message);
            setShowDeleteConfirm(false);
        },
    });

    const settings = settingsResponse?.data || defaultSettings;

    // Update mutation với auto-save
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
            toast.success('Đã lưu', { duration: 1500 });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Auto-save handlers
    const handleNotificationChange = (key: keyof UserSettings['notifications'], value: boolean) => {
        updateMutation.mutate({
            notifications: {
                ...settings.notifications,
                [key]: value,
            },
        });
    };

    const handleDashboardChange = (key: keyof UserSettings['dashboard'], value: string | number) => {
        updateMutation.mutate({
            dashboard: {
                ...settings.dashboard,
                [key]: value,
            },
        });
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
                {updateMutation.isPending && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Đang lưu...</span>
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
                                checked={settings.notifications.emailTaskAssigned}
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
                                checked={settings.notifications.emailDeadlineReminder}
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
                                checked={settings.notifications.pushEnabled}
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
                                checked={settings.notifications.emailComments}
                                onCheckedChange={(checked) => handleNotificationChange('emailComments', checked)}
                            />
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
                                value={settings.dashboard.defaultPage}
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
                                value={String(settings.dashboard.itemsPerPage)}
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
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => logoutOthersMutation.mutate()}
                                disabled={logoutOthersMutation.isPending}
                            >
                                {logoutOthersMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Đăng xuất thiết bị khác
                                    </>
                                )}
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
                                {!showDeleteConfirm ? (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setShowDeleteConfirm(true)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Xóa tài khoản
                                    </Button>
                                ) : (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            disabled={deleteAccountMutation.isPending}
                                        >
                                            Hủy
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => deleteAccountMutation.mutate()}
                                            disabled={deleteAccountMutation.isPending}
                                        >
                                            {deleteAccountMutation.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Đang xóa...
                                                </>
                                            ) : (
                                                'Xác nhận xóa'
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
