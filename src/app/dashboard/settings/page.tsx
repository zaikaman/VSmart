'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  BellRing,
  Building2,
  Loader2,
  LogOut,
  Palette,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Users2,
  Workflow,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardPageShell, DashboardSection } from '@/components/dashboard/page-shell';
import { CreateOrganizationModal } from '@/components/organizations/create-organization-modal';
import { OrganizationJoinDiscoveryPanel } from '@/components/organizations/organization-join-discovery-panel';
import { OrganizationDepartmentsPanel } from '@/components/settings/organization-departments-panel';
import { OrganizationInvitationsPanel } from '@/components/settings/organization-invitations-panel';
import { OrganizationJoinRequestsPanel } from '@/components/settings/organization-join-requests-panel';
import { OrganizationMembersPanel } from '@/components/settings/organization-members-panel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { APP_ROLE_LABELS, canManageOrganizationSettings, type AppRole } from '@/lib/auth/permissions';
import { useOrganization, useUpdateOrganization } from '@/lib/hooks/use-organizations';
import { defaultSettings, useUpdateUserSettings, useUserSettings } from '@/lib/hooks/use-settings';

type SettingsScope = 'personal' | 'organization' | 'members';

const notificationItems = [
  {
    key: 'emailTaskAssigned',
    title: 'Email khi có việc mới',
    description: 'Nhận thư khi một task được giao trực tiếp cho bạn.',
  },
  {
    key: 'emailDeadlineReminder',
    title: 'Email nhắc deadline',
    description: 'Báo trước khi công việc sắp đến hạn hoặc đã sát mốc.',
  },
  {
    key: 'emailComments',
    title: 'Email khi có trao đổi mới',
    description: 'Giữ luồng trao đổi không bị bỏ sót trên task liên quan.',
  },
  {
    key: 'emailTeamDigest',
    title: 'Email tổng hợp',
    description: 'Nhận bản tóm tắt ngắn theo ngày hoặc tuần.',
  },
  {
    key: 'emailReviewRequests',
    title: 'Email chờ duyệt',
    description: 'Báo khi có việc mới được gửi sang hàng chờ duyệt.',
  },
  {
    key: 'emailApprovalResults',
    title: 'Email kết quả duyệt',
    description: 'Báo khi việc được duyệt hoặc cần chỉnh sửa thêm.',
  },
  {
    key: 'pushEnabled',
    title: 'Thông báo trên trình duyệt',
    description: 'Hiển thị nhắc việc ngay khi bạn đang mở hệ thống.',
  },
] as const;

function ScopeCard({
  active,
  title,
  description,
  meta,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  meta: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[24px] border px-4 py-4 text-left transition ${
        active
          ? 'border-[#cfe0ba] bg-[#f2f8e8] shadow-[0_20px_45px_-34px_rgba(104,124,90,0.35)]'
          : 'border-[#e4eadc] bg-white/80 hover:border-[#d6e1ca] hover:bg-[#fafcf7]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-full border border-[#dbe6cf] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#627059]">
          {meta}
        </div>
        <div className="text-[#5f7356]">{icon}</div>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-[#223021]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#66735f]">{description}</p>
    </button>
  );
}

function EmptyWorkspaceState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <DashboardSection title={title} description={description}>
      <div className="rounded-[28px] border border-dashed border-[#d8e2cf] bg-[linear-gradient(135deg,#f9fbf5_0%,#f1f6ea_100%)] px-6 py-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e3cb] bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#62705b]">
            <Workflow className="h-3.5 w-3.5" />
            Chưa sẵn sàng
          </div>
          <p className="mt-4 text-lg font-semibold text-[#223021]">
            Khu này chỉ mở đầy đủ khi bạn đã có không gian làm việc chung.
          </p>
          <p className="mt-2 text-sm leading-7 text-[#61705e]">
            Tạo tổ chức mới hoặc tham gia workspace sẵn có trước, rồi quay lại để quản lý chính sách, phòng ban và thành viên.
          </p>
          <div className="mt-5">
            <Button
              onClick={onAction}
              className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
            >
              {actionLabel}
            </Button>
          </div>
        </div>
      </div>
    </DashboardSection>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [createOrganizationOpen, setCreateOrganizationOpen] = useState(false);
  const [selectedScope, setSelectedScope] = useState<SettingsScope>('personal');
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

  const canEditOrganization = currentUser?.vai_tro
    ? canManageOrganizationSettings(currentUser.vai_tro)
    : false;

  const logoutOthersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/users/me/logout-others', { method: 'POST' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể đăng xuất các thiết bị khác');
      }
      return response.json();
    },
    onSuccess: () => toast.success('Đã đăng xuất các thiết bị khác'),
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

  const handleNotificationChange = (
    key: keyof typeof settings.notifications,
    value: boolean
  ) => {
    updateSettings.mutate({
      notifications: {
        [key]: value,
      },
    });
  };

  const handleDashboardChange = (
    key: keyof typeof settings.dashboard,
    value: string | number
  ) => {
    updateSettings.mutate({
      dashboard: {
        [key]: value,
      },
    });
  };

  const handleAppearanceChange = (
    key: keyof typeof settings.appearance,
    value: string
  ) => {
    updateSettings.mutate({
      appearance: {
        [key]: value,
      },
    });
  };

  const handleOrganizationSettingChange = (
    key: 'allow_external_project_invites' | 'allow_join_requests',
    value: boolean
  ) => {
    updateOrganization.mutate({
      settings: {
        [key]: value,
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
        </div>
      </div>
    );
  }

  return (
    <DashboardPageShell
      badge={
        <>
          <Sparkles className="h-3.5 w-3.5 text-[#87ac63]" />
          Thiết lập theo phạm vi
        </>
      }
      title="Cài đặt"
      description="Màn này được tách theo đúng trách nhiệm: việc của bạn, cấu hình tổ chức và vận hành thành viên."
    >
      <DashboardSection>
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d7e3ca] bg-[#f7faf2] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#62705b]">
              <Wrench className="h-3.5 w-3.5" />
              Chọn khu bạn cần xử lý
            </div>
            <h2 className="mt-4 text-[clamp(1.65rem,2.5vw,2.2rem)] font-semibold text-[#1f2b1f]">
              Mỗi nhóm việc chỉ nên nằm đúng chỗ của nó.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#61705f]">
              Cài đặt cá nhân không nên lẫn với chính sách tổ chức, và quản lý thành viên cũng không nên trôi chung với phần giao diện hay thông báo.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <ScopeCard
              active={selectedScope === 'personal'}
              title="Cá nhân"
              description="Thông báo, giao diện, trang mặc định và bảo mật tài khoản."
              meta="Của bạn"
              icon={<BellRing className="h-5 w-5" />}
              onClick={() => setSelectedScope('personal')}
            />
            <ScopeCard
              active={selectedScope === 'organization'}
              title="Tổ chức"
              description="Không gian làm việc, quy tắc cộng tác và danh mục phòng ban."
              meta={organization ? 'Workspace' : 'Chưa có'}
              icon={<Building2 className="h-5 w-5" />}
              onClick={() => setSelectedScope('organization')}
            />
            <ScopeCard
              active={selectedScope === 'members'}
              title="Thành viên"
              description="Role, lời mời tham gia và các yêu cầu cần duyệt."
              meta={organization ? 'Vận hành team' : 'Chờ workspace'}
              icon={<Users2 className="h-5 w-5" />}
              onClick={() => setSelectedScope('members')}
            />
          </div>
        </div>
      </DashboardSection>

      {selectedScope === 'personal' ? (
        <>
          <DashboardSection
            title="Nhận thông báo"
            description="Chỉ giữ các tín hiệu thật sự cần thiết để hộp thư và trình duyệt không bị quá tải."
          >
            <div className="space-y-4">
              {notificationItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4"
                >
                  <div className="space-y-1">
                    <Label className="text-base text-[#223021]">{item.title}</Label>
                    <p className="text-sm text-[#67745f]">{item.description}</p>
                  </div>
                  <Switch
                    checked={settings.notifications[item.key]}
                    onCheckedChange={(checked) =>
                      handleNotificationChange(item.key, checked)
                    }
                  />
                </div>
              ))}
            </div>
          </DashboardSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardSection
              title="Luồng làm việc mặc định"
              description="Những lựa chọn ảnh hưởng tới cách bạn mở sản phẩm và đọc dữ liệu hằng ngày."
            >
              <div className="space-y-5">
                <div className="rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
                  <Label className="text-base text-[#223021]">Trang mở đầu</Label>
                  <p className="mt-1 text-sm text-[#67745f]">
                    Chọn nơi bạn muốn vào thẳng sau khi đăng nhập.
                  </p>
                  <Select
                    value={settings.dashboard.defaultPage}
                    onValueChange={(value) =>
                      handleDashboardChange('defaultPage', value)
                    }
                  >
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
                  <Label className="text-base text-[#223021]">Số dòng mặc định</Label>
                  <p className="mt-1 text-sm text-[#67745f]">
                    Giữ mật độ hiển thị ổn định trên các màn danh sách.
                  </p>
                  <Select
                    value={String(settings.dashboard.itemsPerPage)}
                    onValueChange={(value) =>
                      handleDashboardChange('itemsPerPage', parseInt(value, 10))
                    }
                  >
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

            <DashboardSection
              title="Trải nghiệm hiển thị"
              description="Phần này chỉ tác động tới cách bạn nhìn thấy sản phẩm, không ảnh hưởng tới người khác."
            >
              <div className="space-y-5">
                <div className="rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
                  <Label className="text-base text-[#223021]">Chế độ hiển thị</Label>
                  <p className="mt-1 text-sm text-[#67745f]">
                    Chọn giao diện mặc định khi mở lại hệ thống.
                  </p>
                  <Select
                    value={settings.appearance.theme}
                    onValueChange={(value) =>
                      handleAppearanceChange('theme', value)
                    }
                  >
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
                  <p className="mt-1 text-sm text-[#67745f]">
                    Chọn ngôn ngữ ưu tiên cho tài khoản của bạn.
                  </p>
                  <Select
                    value={settings.appearance.language}
                    onValueChange={(value) =>
                      handleAppearanceChange('language', value)
                    }
                  >
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

          <DashboardSection
            title="Tài khoản và bảo mật"
            description="Những thao tác chỉ ảnh hưởng tới phiên đăng nhập và dữ liệu cá nhân của bạn."
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
                <div>
                  <Label className="text-base text-[#223021]">Phiên đăng nhập</Label>
                  <p className="mt-1 text-sm text-[#67745f]">
                    Đăng xuất khỏi các thiết bị khác nhưng giữ nguyên thiết bị hiện tại.
                  </p>
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
                    <Label className="text-base text-[#8e5037]">Xóa tài khoản</Label>
                    <p className="mt-1 text-sm text-[#9d694d]">
                      Xóa vĩnh viễn tài khoản và dữ liệu liên quan. Hành động này không thể hoàn tác.
                    </p>
                  </div>
                  {!showDeleteConfirm ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
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
            </div>
          </DashboardSection>
        </>
      ) : null}

      {selectedScope === 'organization' ? (
        organization ? (
          <>
            <DashboardSection
              title="Không gian làm việc"
              description="Những lựa chọn ở đây áp dụng cho cả tổ chức, không chỉ riêng tài khoản của bạn."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[26px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Label className="text-base text-[#223021]">
                        Mời người ngoài tổ chức
                      </Label>
                      <p className="mt-2 text-sm leading-6 text-[#65735f]">
                        Bật nếu dự án của bạn thường cần cộng tác với email ngoài workspace.
                      </p>
                    </div>
                    <Switch
                      checked={organization.settings.allow_external_project_invites}
                      onCheckedChange={(value) =>
                        handleOrganizationSettingChange(
                          'allow_external_project_invites',
                          value
                        )
                      }
                      disabled={!canEditOrganization || updateOrganization.isPending}
                    />
                  </div>
                  <p className="mt-5 rounded-[20px] border border-[#deead2] bg-white/80 px-4 py-3 text-sm text-[#566452]">
                    {organization.settings.allow_external_project_invites
                      ? 'Luồng mời liên tổ chức đang mở.'
                      : 'Mọi lời mời dự án mới đang được giới hạn trong nội bộ tổ chức.'}
                  </p>
                </div>

                <div className="rounded-[26px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Label className="text-base text-[#223021]">
                        Nhận yêu cầu gia nhập
                      </Label>
                      <p className="mt-2 text-sm leading-6 text-[#65735f]">
                        Bật nếu bạn muốn người ngoài có thể tìm thấy workspace và gửi yêu cầu.
                      </p>
                    </div>
                    <Switch
                      checked={organization.settings.allow_join_requests}
                      onCheckedChange={(value) =>
                        handleOrganizationSettingChange('allow_join_requests', value)
                      }
                      disabled={!canEditOrganization || updateOrganization.isPending}
                    />
                  </div>
                  <p className="mt-5 rounded-[20px] border border-[#deead2] bg-white/80 px-4 py-3 text-sm text-[#566452]">
                    {organization.settings.allow_join_requests
                      ? 'Workspace đang nhận yêu cầu gia nhập mới.'
                      : 'Chỉ lời mời trực tiếp mới có thể đưa người dùng vào tổ chức.'}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] border border-[#e4ebdd] bg-[#fbfcf8] px-4 py-3 text-sm text-[#52614f]">
                {currentUser?.vai_tro
                  ? `Vai trò hiện tại của bạn: ${APP_ROLE_LABELS[currentUser.vai_tro]}.`
                  : 'Đang xác nhận quyền hiện tại của bạn.'}
                {!canEditOrganization
                  ? ' Chỉ owner hoặc admin mới có thể đổi các thiết lập chung.'
                  : ' Bạn có thể cập nhật ngay các quy tắc chung của workspace.'}
              </div>
            </DashboardSection>

            <DashboardSection
              title="Phòng ban dùng chung"
              description="Danh mục này là nguồn để chia phần dự án theo đúng đầu mối phụ trách."
            >
              <OrganizationDepartmentsPanel canManage={canEditOrganization} />
            </DashboardSection>
          </>
        ) : (
          <>
            <DashboardSection
              title="Không gian làm việc"
              description="Phần này dành cho lúc bạn muốn tạo workspace mới hoặc tham gia workspace đang có."
            >
              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[28px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] p-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#d7e3ca] bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#62705b]">
                    <Building2 className="h-3.5 w-3.5" />
                    Bắt đầu từ đây
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-[#223021]">
                    Tạo một không gian làm việc riêng cho team của bạn.
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#5d6b58]">
                    Sau khi có workspace, bạn mới có thể đặt chính sách chung, tạo phòng ban và vận hành thành viên theo vai trò.
                  </p>
                  <div className="mt-5">
                    <Button
                      className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
                      onClick={() => setCreateOrganizationOpen(true)}
                    >
                      Tạo tổ chức
                    </Button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#e6ebde] bg-[#fbfcf8] p-5">
                  <p className="text-base font-semibold text-[#223021]">
                    Hoặc tham gia workspace đã có sẵn
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#65725f]">
                    Nếu team của bạn đã dùng hệ thống, gửi yêu cầu gia nhập để vào đúng workspace thay vì tạo mới.
                  </p>
                  <div className="mt-5">
                    <OrganizationJoinDiscoveryPanel />
                  </div>
                </div>
              </div>
            </DashboardSection>
          </>
        )
      ) : null}

      {selectedScope === 'members' ? (
        organization ? (
          <>
            <DashboardSection
              title="Thành viên và vai trò"
              description="Quản lý con người ở một nơi riêng để tránh lẫn với phần cấu hình hệ thống."
            >
              <OrganizationMembersPanel />
            </DashboardSection>

            <DashboardSection
              title="Lời mời đang mở"
              description="Theo dõi những người đã được mời nhưng chưa vào workspace."
            >
              <OrganizationInvitationsPanel />
            </DashboardSection>

            <DashboardSection
              title="Yêu cầu cần duyệt"
              description="Những người muốn tham gia tổ chức sẽ chờ xử lý ở đây."
            >
              <OrganizationJoinRequestsPanel />
            </DashboardSection>
          </>
        ) : (
          <EmptyWorkspaceState
            title="Quản lý thành viên"
            description="Role, lời mời và yêu cầu gia nhập chỉ có ý nghĩa khi bạn đã có một workspace để quản trị."
            actionLabel="Chuyển sang khu tổ chức"
            onAction={() => setSelectedScope('organization')}
          />
        )
      ) : null}

      <CreateOrganizationModal
        open={createOrganizationOpen}
        onOpenChange={setCreateOrganizationOpen}
      />
    </DashboardPageShell>
  );
}
