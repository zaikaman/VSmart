'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BellRing, Building2, Loader2, LogOut, Palette, ShieldAlert, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardPageShell, DashboardSection } from '@/components/dashboard/page-shell';
import { CreateOrganizationModal } from '@/components/organizations/create-organization-modal';
import { OrganizationMembersPanel } from '@/components/settings/organization-members-panel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { APP_ROLE_LABELS, canManageOrganizationSettings, type AppRole } from '@/lib/auth/permissions';
import { useOrganization, useUpdateOrganization } from '@/lib/hooks/use-organizations';
import { defaultSettings, useUpdateUserSettings, useUserSettings } from '@/lib/hooks/use-settings';

export default function SettingsPage() {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [createOrganizationOpen, setCreateOrganizationOpen] = useState(false);
  const { data: settingsResponse, isLoading } = useUserSettings();
  const { data: organization, isLoading: isOrganizationLoading } = useOrganization();
  const updateSettings = useUpdateUserSettings();
  const updateOrganization = useUpdateOrganization();
  const settings = settingsResponse?.data || defaultSettings;
  const { data: currentUser } = useQuery({
    queryKey: ['settings-current-user'],
    queryFn: async () => {
      const response = await fetch('/api/users/me');
      if (!response.ok) {
        throw new Error('Không thể tải thông tin người dùng');
      }

      return response.json() as Promise<{ vai_tro?: AppRole; ten?: string }>;
    },
  });
  const canEditOrganization = currentUser?.vai_tro ? canManageOrganizationSettings(currentUser.vai_tro) : false;

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

  const handleNotificationChange = (key: keyof typeof settings.notifications, value: boolean) => {
    updateSettings.mutate({
      notifications: {
        [key]: value,
      },
    });
  };

  const handleDashboardChange = (key: keyof typeof settings.dashboard, value: string | number) => {
    updateSettings.mutate({
      dashboard: {
        [key]: value,
      },
    });
  };

  const handleAppearanceChange = (key: keyof typeof settings.appearance, value: string) => {
    updateSettings.mutate({
      appearance: {
        [key]: value,
      },
    });
  };

  const handleOrganizationSettingChange = (value: boolean) => {
    updateOrganization.mutate({
      settings: {
        allow_external_project_invites: value,
      },
    });
  };

  if (isLoading || isOrganizationLoading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Skeleton className="h-[220px] rounded-[38px]" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-[220px] rounded-[30px]" />
          <Skeleton className="h-[220px] rounded-[30px]" />
          <Skeleton className="h-[220px] rounded-[30px]" />
          <Skeleton className="h-[220px] rounded-[30px]" />
          <Skeleton className="h-[220px] rounded-[30px]" />
        </div>
      </div>
    );
  }

  return (
    <DashboardPageShell
      badge={
        <>
          <Sparkles className="h-3.5 w-3.5 text-[#87ac63]" />
          Cài đặt
        </>
      }
      title="Cài đặt"
      description="Quản lý thông báo, giao diện mặc định, phạm vi cộng tác và bảo mật tài khoản."
      metrics={[
        {
          label: 'Thông báo chủ động',
          value: Object.values(settings.notifications).filter(Boolean).length.toString(),
          note: 'Số tín hiệu đang bật',
          icon: <BellRing className="h-4 w-4 text-[#2f6052]" />,
          surfaceClassName: 'bg-[#eef6f0] border-[#d9eadf]',
          valueClassName: 'text-[#2f6052]',
        },
        {
          label: 'Trang mặc định',
          value: settings.dashboard.defaultPage.replace('/dashboard/', '') || 'dashboard',
          note: 'Điểm bắt đầu sau đăng nhập',
          icon: <Palette className="h-4 w-4 text-[#39638d]" />,
          surfaceClassName: 'bg-[#edf5ff] border-[#d8e6f7]',
          valueClassName: 'text-xl text-[#39638d]',
        },
      ]}
    >
      <DashboardSection title="Thông báo" description="Chọn loại nhắc việc bạn muốn nhận.">
        <div className="space-y-6">
          {[
            ['emailTaskAssigned', 'Email khi được phân công', 'Nhận email khi có task mới được giao cho bạn'],
            ['emailDeadlineReminder', 'Email nhắc deadline', 'Nhận email khi task sắp đến hạn hoặc đã sát mốc'],
            ['emailComments', 'Email bình luận mới', 'Nhận email khi task của bạn có trao đổi mới'],
            ['emailTeamDigest', 'Email digest đội', 'Nhận bản tóm tắt ngày hoặc tuần từ AI summary'],
            ['emailReviewRequests', 'Email yêu cầu duyệt', 'Nhận email khi có task mới được gửi sang hàng chờ duyệt'],
            ['emailApprovalResults', 'Email kết quả duyệt', 'Nhận email khi task được duyệt hoặc bị trả lại chỉnh sửa'],
            ['pushEnabled', 'Thông báo trình duyệt', 'Hiển thị nhắc việc ngay trên trình duyệt của bạn'],
          ].map(([key, title, description]) => (
            <div key={key} className="flex items-center justify-between gap-4 rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
              <div className="space-y-1">
                <Label className="text-base text-[#223021]">{title}</Label>
                <p className="text-sm text-[#67745f]">{description}</p>
              </div>
              <Switch
                checked={settings.notifications[key as keyof typeof settings.notifications]}
                onCheckedChange={(checked) => handleNotificationChange(key as keyof typeof settings.notifications, checked)}
              />
            </div>
          ))}
        </div>
      </DashboardSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardSection title="Mặc định" description="Chỉnh trang mở đầu và số lượng hiển thị.">
          <div className="space-y-5">
            <div className="rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
              <Label className="text-base text-[#223021]">Trang mặc định</Label>
              <p className="mt-1 text-sm text-[#67745f]">Trang được mở đầu tiên sau khi đăng nhập.</p>
              <Select value={settings.dashboard.defaultPage} onValueChange={(value) => handleDashboardChange('defaultPage', value)}>
                <SelectTrigger className="mt-3 border-[#dfe5d6] bg-white">
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

            <div className="rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
              <Label className="text-base text-[#223021]">Số lượng hiển thị</Label>
              <p className="mt-1 text-sm text-[#67745f]">Số dòng mặc định trên mỗi màn danh sách.</p>
              <Select value={String(settings.dashboard.itemsPerPage)} onValueChange={(value) => handleDashboardChange('itemsPerPage', parseInt(value, 10))}>
                <SelectTrigger className="mt-3 border-[#dfe5d6] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 dòng</SelectItem>
                  <SelectItem value="25">25 dòng</SelectItem>
                  <SelectItem value="50">50 dòng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DashboardSection>

        <DashboardSection title="Giao diện" description="Chọn chế độ hiển thị và ngôn ngữ bạn muốn dùng.">
          <div className="space-y-5">
            <div className="rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
              <Label className="text-base text-[#223021]">Chế độ hiển thị</Label>
              <p className="mt-1 text-sm text-[#67745f]">Thiết lập mặc định cho giao diện khi đăng nhập.</p>
              <Select value={settings.appearance.theme} onValueChange={(value) => handleAppearanceChange('theme', value)}>
                <SelectTrigger className="mt-3 border-[#dfe5d6] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">Theo hệ thống</SelectItem>
                  <SelectItem value="light">Luôn sáng</SelectItem>
                  <SelectItem value="dark">Luôn tối</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
              <Label className="text-base text-[#223021]">Ngôn ngữ</Label>
              <p className="mt-1 text-sm text-[#67745f]">Ngôn ngữ ưu tiên cho sản phẩm.</p>
              <Select value={settings.appearance.language} onValueChange={(value) => handleAppearanceChange('language', value)}>
                <SelectTrigger className="mt-3 border-[#dfe5d6] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vi">Tiếng Việt</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DashboardSection>
      </div>

      {organization ? (
        <DashboardSection title="Tổ chức" description="Kiểm soát phạm vi cộng tác mặc định và giữ ranh giới quyền rõ ràng cho team.">
          <div className="rounded-[28px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-base text-[#223021]">Cho phép mời người ngoài tổ chức</Label>
                <p className="text-sm text-[#67745f]">
                  Khi tắt, chỉ email thuộc cùng tổ chức mới có thể được mời vào dự án. Thiết lập này mặc định ưu tiên phạm vi nội bộ.
                </p>
              </div>
              <Switch
                checked={organization.settings.allow_external_project_invites}
                onCheckedChange={handleOrganizationSettingChange}
                disabled={!canEditOrganization || updateOrganization.isPending}
              />
            </div>
            <div className="mt-4 rounded-[20px] border border-[#e4ebdd] bg-white/80 px-4 py-3 text-sm text-[#52614f]">
              {organization.settings.allow_external_project_invites
                ? 'Cộng tác liên tổ chức đang bật. Quản trị dự án có thể mời cả email ngoài tổ chức.'
                : 'Cộng tác liên tổ chức đang tắt. Mọi lời mời mới sẽ bị giới hạn trong cùng tổ chức.'}
            </div>
            <div className="mt-4 rounded-[20px] border border-[#dce5d2] bg-white/75 px-4 py-3 text-sm text-[#52614f]">
              {currentUser?.vai_tro
                ? `Vai trò hiện tại của bạn trong tổ chức: ${APP_ROLE_LABELS[currentUser.vai_tro]}.`
                : 'Đang xác nhận quyền hiện tại của bạn.'}
              {!canEditOrganization ? ' Cài đặt tổ chức chỉ cho phép owner hoặc admin thay đổi.' : ''}
            </div>
          </div>
        </DashboardSection>
      ) : (
        <DashboardSection title="Tạo tổ chức khi bạn sẵn sàng làm việc cùng team" description="Bạn có thể tạo không gian làm việc chung ngay từ đây, không cần quay lại onboarding.">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[28px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] p-5">
              <div className="inline-flex rounded-full border border-[#d6e3c9] bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#62705b]">
                Bắt đầu khi cần
              </div>
              <h3 className="mt-4 text-xl font-semibold text-[#223021]">Tạo tổ chức để bắt đầu dự án, mời thành viên và quản lý chung ở một nơi.</h3>
              <p className="mt-3 text-sm leading-7 text-[#5d6b58]">
                Hồ sơ cá nhân của bạn vẫn giữ nguyên. Khi tạo tổ chức, bạn sẽ là người quản lý đầu tiên của không gian làm việc đó.
              </p>
              <div className="mt-5">
                <Button className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]" onClick={() => setCreateOrganizationOpen(true)}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Tạo tổ chức
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {[
                ['Tên tổ chức', 'Sẽ hiển thị chung cho cả team thay vì nằm trong hồ sơ cá nhân của từng người.'],
                ['Thành viên', 'Bạn có thể thêm người vào và sắp xếp quyền phù hợp sau khi tạo xong.'],
                ['Dự án', 'Mọi dự án mới sẽ được mở trong cùng không gian làm việc này.'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
                  <p className="font-medium text-[#223021]">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#65725f]">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </DashboardSection>
      )}

      {organization ? (
        <DashboardSection title="Thành viên và role" description="Quản lý role tổ chức ở đúng nơi, tách biệt khỏi role dự án để tránh nhầm quyền.">
          <OrganizationMembersPanel />
        </DashboardSection>
      ) : null}

      <DashboardSection title="Bảo mật và dữ liệu" description="Các thao tác liên quan tới phiên đăng nhập và tài khoản.">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
            <div>
              <Label className="text-base text-[#223021]">Phiên đăng nhập</Label>
              <p className="mt-1 text-sm text-[#67745f]">Đăng xuất khỏi tất cả thiết bị khác ngoài thiết bị hiện tại.</p>
            </div>
            <Button
              variant="outline"
              className="border-[#e0e6d7] bg-white text-[#5d6958] hover:bg-[#f6f8f1]"
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

          <div className="rounded-[24px] border border-[#f0ddd1] bg-[#fff7f2] p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-[#b16442]" />
              <div className="flex-1">
                <Label className="text-base text-[#8e5037]">Vùng nguy hiểm</Label>
                <p className="mt-1 text-sm text-[#9d694d]">Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu liên quan. Hành động này không thể hoàn tác.</p>
              </div>
              {!showDeleteConfirm ? (
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa tài khoản
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#e6cdbf] bg-white text-[#8f5a3e] hover:bg-[#fff2ea]"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteAccountMutation.isPending}
                  >
                    Hủy
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteAccountMutation.mutate()} disabled={deleteAccountMutation.isPending}>
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
        </div>
      </DashboardSection>

      <CreateOrganizationModal open={createOrganizationOpen} onOpenChange={setCreateOrganizationOpen} />
    </DashboardPageShell>
  );
}
