'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, LogOut, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserSettings, defaultSettings, useUserSettings } from '@/lib/hooks/use-settings';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { data: settingsResponse, isLoading } = useUserSettings();

  const logoutOthersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/users/me/logout-others', { method: 'POST' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể đăng xuất các thiết bị khác');
      }
      return response.json();
    },
    onSuccess: () => toast.success('Đã đăng xuất tất cả các thiết bị khác'),
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/users/me/delete-account', { method: 'DELETE' });
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
    onError: (error: Error) => toast.error(error.message),
  });

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
      <div className="container mx-auto max-w-4xl p-6">
        <Skeleton className="mb-6 h-10 w-48" />
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="mb-2 h-6 w-48" />
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
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Cài đặt</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quản lý tùy chọn cá nhân, thông báo và cách bạn muốn nhận tín hiệu từ hệ thống.</p>
        </div>
        {updateMutation.isPending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Đang lưu...</span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Thông báo</CardTitle>
            <CardDescription>Chọn loại email hoặc tín hiệu mà bạn muốn nhận trong quá trình điều phối công việc.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              ['emailTaskAssigned', 'Email khi được phân công', 'Nhận email khi có task mới được giao cho bạn'],
              ['emailDeadlineReminder', 'Email nhắc deadline', 'Nhận email khi task sắp đến hạn hoặc đã sát mốc'],
              ['emailComments', 'Email bình luận mới', 'Nhận email khi task của bạn có trao đổi mới'],
              ['emailTeamDigest', 'Email digest đội', 'Nhận bản tóm tắt ngày hoặc tuần từ AI summary'],
              ['emailReviewRequests', 'Email yêu cầu duyệt', 'Nhận email khi có task mới được gửi sang hàng chờ duyệt'],
              ['emailApprovalResults', 'Email kết quả duyệt', 'Nhận email khi task được duyệt hoặc bị trả lại chỉnh sửa'],
              ['pushEnabled', 'Thông báo trình duyệt', 'Hiển thị nhắc việc ngay trên trình duyệt của bạn'],
            ].map(([key, title, description]) => (
              <div key={key} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">{title}</Label>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <Switch
                  checked={settings.notifications[key as keyof UserSettings['notifications']]}
                  onCheckedChange={(checked) => handleNotificationChange(key as keyof UserSettings['notifications'], checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>Tùy chỉnh nơi bạn muốn bắt đầu và mật độ thông tin trên các màn danh sách.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Trang mặc định</Label>
                <p className="text-sm text-muted-foreground">Trang mở đầu tiên sau khi đăng nhập.</p>
              </div>
              <Select value={settings.dashboard.defaultPage} onValueChange={(value) => handleDashboardChange('defaultPage', value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="/dashboard">Tổng quan</SelectItem>
                  <SelectItem value="/dashboard/projects">Dự án</SelectItem>
                  <SelectItem value="/dashboard/kanban">Bảng Kanban</SelectItem>
                  <SelectItem value="/dashboard/planning">Planning</SelectItem>
                  <SelectItem value="/dashboard/reviews">Hàng chờ duyệt</SelectItem>
                  <SelectItem value="/dashboard/analytics">Analytics</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Số lượng hiển thị</Label>
                <p className="text-sm text-muted-foreground">Số dòng mặc định trên mỗi màn danh sách.</p>
              </div>
              <Select value={String(settings.dashboard.itemsPerPage)} onValueChange={(value) => handleDashboardChange('itemsPerPage', parseInt(value, 10))}>
                <SelectTrigger className="w-[200px]">
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

        <Card>
          <CardHeader>
            <CardTitle>Bảo mật và dữ liệu</CardTitle>
            <CardDescription>Quản lý phiên đăng nhập và dữ liệu tài khoản của bạn.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Phiên đăng nhập</Label>
                <p className="text-sm text-muted-foreground">Đăng xuất khỏi tất cả thiết bị khác ngoài thiết bị hiện tại.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => logoutOthersMutation.mutate()} disabled={logoutOthersMutation.isPending}>
                {logoutOthersMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...</> : <><LogOut className="mr-2 h-4 w-4" /> Đăng xuất thiết bị khác</>}
              </Button>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base text-destructive">Vùng nguy hiểm</Label>
                  <p className="text-sm text-muted-foreground">Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu liên quan.</p>
                </div>
                {!showDeleteConfirm ? (
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Xóa tài khoản
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={deleteAccountMutation.isPending}>Hủy</Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteAccountMutation.mutate()} disabled={deleteAccountMutation.isPending}>
                      {deleteAccountMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xóa...</> : 'Xác nhận xóa'}
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
