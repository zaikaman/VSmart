'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
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
import { APP_ROLE_LABELS, canManageOrganizationSettings } from '@/lib/auth/permissions';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useOrganization, useUpdateOrganization } from '@/lib/hooks/use-organizations';
import { defaultSettings, useUpdateUserSettings, useUserSettings } from '@/lib/hooks/use-settings';

type SettingsScope = 'personal' | 'organization' | 'members';

const notificationItems = [
  {
    key: 'emailTaskAssigned',
    title: 'Email khi cÃ³ viá»‡c má»›i',
    description: 'Nháº­n thÆ° khi má»™t task Ä‘Æ°á»£c giao trá»±c tiáº¿p cho báº¡n.',
  },
  {
    key: 'emailDeadlineReminder',
    title: 'Email nháº¯c deadline',
    description: 'BÃ¡o trÆ°á»›c khi cÃ´ng viá»‡c sáº¯p Ä‘áº¿n háº¡n hoáº·c Ä‘Ã£ sÃ¡t má»‘c.',
  },
  {
    key: 'emailComments',
    title: 'Email khi cÃ³ trao Ä‘á»•i má»›i',
    description: 'Giá»¯ luá»“ng trao Ä‘á»•i khÃ´ng bá»‹ bá» sÃ³t trÃªn task liÃªn quan.',
  },
  {
    key: 'emailTeamDigest',
    title: 'Email tá»•ng há»£p',
    description: 'Nháº­n báº£n tÃ³m táº¯t ngáº¯n theo ngÃ y hoáº·c tuáº§n.',
  },
  {
    key: 'emailReviewRequests',
    title: 'Email chá» duyá»‡t',
    description: 'BÃ¡o khi cÃ³ viá»‡c má»›i Ä‘Æ°á»£c gá»­i sang hÃ ng chá» duyá»‡t.',
  },
  {
    key: 'emailApprovalResults',
    title: 'Email káº¿t quáº£ duyá»‡t',
    description: 'BÃ¡o khi viá»‡c Ä‘Æ°á»£c duyá»‡t hoáº·c cáº§n chá»‰nh sá»­a thÃªm.',
  },
  {
    key: 'pushEnabled',
    title: 'ThÃ´ng bÃ¡o trÃªn trÃ¬nh duyá»‡t',
    description: 'Hiá»ƒn thá»‹ nháº¯c viá»‡c ngay khi báº¡n Ä‘ang má»Ÿ há»‡ thá»‘ng.',
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
            ChÆ°a sáºµn sÃ ng
          </div>
          <p className="mt-4 text-lg font-semibold text-[#223021]">
            Khu nÃ y chá»‰ má»Ÿ Ä‘áº§y Ä‘á»§ khi báº¡n Ä‘Ã£ cÃ³ khÃ´ng gian lÃ m viá»‡c chung.
          </p>
          <p className="mt-2 text-sm leading-7 text-[#61705e]">
            Táº¡o tá»• chá»©c má»›i hoáº·c tham gia workspace sáºµn cÃ³ trÆ°á»›c, rá»“i quay láº¡i Ä‘á»ƒ quáº£n lÃ½ chÃ­nh sÃ¡ch, phÃ²ng ban vÃ  thÃ nh viÃªn.
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

  const { data: currentUser } = useCurrentUser();

  const canEditOrganization = currentUser?.vai_tro
    ? canManageOrganizationSettings(currentUser.vai_tro)
    : false;

  const logoutOthersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/users/me/logout-others', { method: 'POST' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'KhÃ´ng thá»ƒ Ä‘Äƒng xuáº¥t cÃ¡c thiáº¿t bá»‹ khÃ¡c');
      }
      return response.json();
    },
    onSuccess: () => toast.success('ÄÃ£ Ä‘Äƒng xuáº¥t cÃ¡c thiáº¿t bá»‹ khÃ¡c'),
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/users/me/delete-account', { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'KhÃ´ng thá»ƒ xÃ³a tÃ i khoáº£n');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('TÃ i khoáº£n Ä‘Ã£ Ä‘Æ°á»£c xÃ³a');
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
          Chia theo khu
        </>
      }
      title="CÃ i Ä‘áº·t"
      description="Má»i thá»© Ä‘Æ°á»£c gom theo Ä‘Ãºng chá»—: pháº§n cá»§a báº¡n, pháº§n cá»§a tá»• chá»©c vÃ  pháº§n cá»§a team."
    >
      <DashboardSection>
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d7e3ca] bg-[#f7faf2] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#62705b]">
              <Wrench className="h-3.5 w-3.5" />
              Chá»n Ä‘Ãºng khu
            </div>
            <h2 className="mt-4 text-[clamp(1.65rem,2.5vw,2.2rem)] font-semibold text-[#1f2b1f]">
              Má»i thá»© Ä‘Ã£ Ä‘Æ°á»£c chia sáºµn theo tá»«ng khu.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#61705f]">
              Pháº§n cÃ¡ nhÃ¢n dÃ nh cho thÃ´ng bÃ¡o vÃ  giao diá»‡n. Pháº§n tá»• chá»©c vÃ  thÃ nh viÃªn dÃ nh cho cÃ¡c thiáº¿t láº­p dÃ¹ng chung cá»§a workspace.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <ScopeCard
              active={selectedScope === 'personal'}
              title="CÃ¡ nhÃ¢n"
              description="ThÃ´ng bÃ¡o, giao diá»‡n, trang máº·c Ä‘á»‹nh vÃ  báº£o máº­t tÃ i khoáº£n."
              meta="Cá»§a báº¡n"
              icon={<BellRing className="h-5 w-5" />}
              onClick={() => setSelectedScope('personal')}
            />
            <ScopeCard
              active={selectedScope === 'organization'}
              title="Tá»• chá»©c"
              description="ThÃ´ng tin workspace, quy táº¯c cá»™ng tÃ¡c vÃ  danh sÃ¡ch phÃ²ng ban."
              meta={organization ? 'Workspace' : 'ChÆ°a cÃ³'}
              icon={<Building2 className="h-5 w-5" />}
              onClick={() => setSelectedScope('organization')}
            />
            <ScopeCard
              active={selectedScope === 'members'}
              title="ThÃ nh viÃªn"
              description="Vai trÃ², lá»i má»i tham gia vÃ  cÃ¡c yÃªu cáº§u cáº§n duyá»‡t."
              meta={organization ? 'Team' : 'Chá» workspace'}
              icon={<Users2 className="h-5 w-5" />}
              onClick={() => setSelectedScope('members')}
            />
          </div>
        </div>
      </DashboardSection>

      {selectedScope === 'personal' ? (
        <>
          <DashboardSection
            title="Nháº­n thÃ´ng bÃ¡o"
            description="Báº­t nhá»¯ng thÃ´ng bÃ¡o báº¡n thá»±c sá»± cáº§n Ä‘á»ƒ há»™p thÆ° vÃ  trÃ¬nh duyá»‡t Ä‘á»¡ bá»‹ quÃ¡ táº£i."
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
              title="Luá»“ng lÃ m viá»‡c máº·c Ä‘á»‹nh"
              description="Nhá»¯ng lá»±a chá»n nÃ y áº£nh hÆ°á»Ÿng tá»›i cÃ¡ch báº¡n má»Ÿ sáº£n pháº©m vÃ  xem dá»¯ liá»‡u má»—i ngÃ y."
            >
              <div className="space-y-5">
                <div className="rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
                  <Label className="text-base text-[#223021]">Trang má»Ÿ Ä‘áº§u</Label>
                  <p className="mt-1 text-sm text-[#67745f]">
                    Chá»n nÆ¡i báº¡n muá»‘n vÃ o tháº³ng sau khi Ä‘Äƒng nháº­p.
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
                      <SelectItem value="/dashboard">Tá»•ng quan</SelectItem>
                      <SelectItem value="/dashboard/projects">Dá»± Ã¡n</SelectItem>
                      <SelectItem value="/dashboard/kanban">Báº£ng Kanban</SelectItem>
                      <SelectItem value="/dashboard/planning">Planning</SelectItem>
                      <SelectItem value="/dashboard/reviews">HÃ ng chá» duyá»‡t</SelectItem>
                      <SelectItem value="/dashboard/analytics">Analytics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
                  <Label className="text-base text-[#223021]">Sá»‘ dÃ²ng máº·c Ä‘á»‹nh</Label>
                  <p className="mt-1 text-sm text-[#67745f]">
                    Giá»¯ máº­t Ä‘á»™ hiá»ƒn thá»‹ á»•n Ä‘á»‹nh trÃªn cÃ¡c mÃ n danh sÃ¡ch.
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
                      <SelectItem value="10">10 dÃ²ng</SelectItem>
                      <SelectItem value="25">25 dÃ²ng</SelectItem>
                      <SelectItem value="50">50 dÃ²ng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DashboardSection>

            <DashboardSection
              title="Tráº£i nghiá»‡m hiá»ƒn thá»‹"
              description="Chá»‰ áº£nh hÆ°á»Ÿng tá»›i cÃ¡ch báº¡n nhÃ¬n tháº¥y há»‡ thá»‘ng, khÃ´ng tÃ¡c Ä‘á»™ng tá»›i ngÆ°á»i khÃ¡c."
            >
              <div className="space-y-5">
                <div className="rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
                  <Label className="text-base text-[#223021]">Cháº¿ Ä‘á»™ hiá»ƒn thá»‹</Label>
                  <p className="mt-1 text-sm text-[#67745f]">
                    Chá»n giao diá»‡n máº·c Ä‘á»‹nh khi má»Ÿ láº¡i há»‡ thá»‘ng.
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
                      <SelectItem value="system">Theo há»‡ thá»‘ng</SelectItem>
                      <SelectItem value="light">LuÃ´n sÃ¡ng</SelectItem>
                      <SelectItem value="dark">LuÃ´n tá»‘i</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
                  <Label className="text-base text-[#223021]">NgÃ´n ngá»¯</Label>
                  <p className="mt-1 text-sm text-[#67745f]">
                    Chá»n ngÃ´n ngá»¯ Æ°u tiÃªn cho tÃ i khoáº£n cá»§a báº¡n.
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
                      <SelectItem value="vi">Tiáº¿ng Viá»‡t</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DashboardSection>
          </div>

          <DashboardSection
            title="TÃ i khoáº£n vÃ  báº£o máº­t"
            description="Nhá»¯ng thay Ä‘á»•i á»Ÿ Ä‘Ã¢y chá»‰ liÃªn quan tá»›i phiÃªn Ä‘Äƒng nháº­p vÃ  dá»¯ liá»‡u cÃ¡ nhÃ¢n cá»§a báº¡n."
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
                <div>
                  <Label className="text-base text-[#223021]">PhiÃªn Ä‘Äƒng nháº­p</Label>
                  <p className="mt-1 text-sm text-[#67745f]">
                    ÄÄƒng xuáº¥t khá»i cÃ¡c thiáº¿t bá»‹ khÃ¡c nhÆ°ng giá»¯ nguyÃªn thiáº¿t bá»‹ hiá»‡n táº¡i.
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
                      Äang xá»­ lÃ½...
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-4 w-4" />
                      ÄÄƒng xuáº¥t thiáº¿t bá»‹ khÃ¡c
                    </>
                  )}
                </Button>
              </div>

              <div className="rounded-[24px] border border-[#f0ddd1] bg-[#fff7f2] p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-[#b16442]" />
                  <div className="flex-1">
                    <Label className="text-base text-[#8e5037]">XÃ³a tÃ i khoáº£n</Label>
                    <p className="mt-1 text-sm text-[#9d694d]">
                      XÃ³a vÄ©nh viá»…n tÃ i khoáº£n vÃ  dá»¯ liá»‡u liÃªn quan. HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c.
                    </p>
                  </div>
                  {!showDeleteConfirm ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      XÃ³a tÃ i khoáº£n
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
                        Há»§y
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
                            Äang xÃ³a...
                          </>
                        ) : (
                          'XÃ¡c nháº­n xÃ³a'
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
              title="KhÃ´ng gian lÃ m viá»‡c"
              description="CÃ¡c lá»±a chá»n á»Ÿ Ä‘Ã¢y Ã¡p dá»¥ng cho cáº£ workspace, khÃ´ng chá»‰ riÃªng tÃ i khoáº£n cá»§a báº¡n."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[26px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Label className="text-base text-[#223021]">
                        Má»i ngÆ°á»i ngoÃ i tá»• chá»©c
                      </Label>
                      <p className="mt-2 text-sm leading-6 text-[#65735f]">
                        Báº­t náº¿u dá»± Ã¡n cá»§a báº¡n thÆ°á»ng cáº§n cá»™ng tÃ¡c vá»›i email ngoÃ i workspace.
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
                      ? 'Luá»“ng má»i liÃªn tá»• chá»©c Ä‘ang má»Ÿ.'
                      : 'Má»i lá»i má»i dá»± Ã¡n má»›i Ä‘ang Ä‘Æ°á»£c giá»›i háº¡n trong ná»™i bá»™ tá»• chá»©c.'}
                  </p>
                </div>

                <div className="rounded-[26px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Label className="text-base text-[#223021]">
                        Nháº­n yÃªu cáº§u gia nháº­p
                      </Label>
                      <p className="mt-2 text-sm leading-6 text-[#65735f]">
                        Báº­t náº¿u báº¡n muá»‘n ngÆ°á»i ngoÃ i cÃ³ thá»ƒ tÃ¬m tháº¥y workspace vÃ  gá»­i yÃªu cáº§u.
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
                      ? 'Workspace Ä‘ang nháº­n yÃªu cáº§u gia nháº­p má»›i.'
                      : 'Chá»‰ lá»i má»i trá»±c tiáº¿p má»›i cÃ³ thá»ƒ Ä‘Æ°a ngÆ°á»i dÃ¹ng vÃ o tá»• chá»©c.'}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] border border-[#e4ebdd] bg-[#fbfcf8] px-4 py-3 text-sm text-[#52614f]">
                {currentUser?.vai_tro
                  ? `Vai trÃ² hiá»‡n táº¡i cá»§a báº¡n: ${APP_ROLE_LABELS[currentUser.vai_tro]}.`
                  : 'Äang xÃ¡c nháº­n quyá»n hiá»‡n táº¡i cá»§a báº¡n.'}
                {!canEditOrganization
                  ? ' Chá»‰ owner hoáº·c admin má»›i cÃ³ thá»ƒ Ä‘á»•i cÃ¡c thiáº¿t láº­p chung.'
                  : ' Báº¡n cÃ³ thá»ƒ cáº­p nháº­t ngay cÃ¡c quy táº¯c chung cá»§a workspace.'}
              </div>
            </DashboardSection>

            <DashboardSection
              title="PhÃ²ng ban"
              description="Danh sÃ¡ch nÃ y dÃ¹ng chung cho thÃ nh viÃªn vÃ  lÃºc chia pháº§n dá»± Ã¡n."
            >
              <OrganizationDepartmentsPanel canManage={canEditOrganization} />
            </DashboardSection>
          </>
        ) : (
          <>
            <DashboardSection
              title="KhÃ´ng gian lÃ m viá»‡c"
              description="Táº¡o workspace má»›i hoáº·c tham gia workspace Ä‘ang cÃ³ Ä‘á»ƒ báº¯t Ä‘áº§u dÃ¹ng pháº§n quáº£n trá»‹."
            >
              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[28px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] p-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#d7e3ca] bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#62705b]">
                    <Building2 className="h-3.5 w-3.5" />
                    Báº¯t Ä‘áº§u tá»« Ä‘Ã¢y
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-[#223021]">
                    Táº¡o má»™t khÃ´ng gian lÃ m viá»‡c riÃªng cho team cá»§a báº¡n.
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#5d6b58]">
                    Sau khi cÃ³ workspace, báº¡n má»›i cÃ³ thá»ƒ Ä‘áº·t chÃ­nh sÃ¡ch chung, táº¡o phÃ²ng ban vÃ  váº­n hÃ nh thÃ nh viÃªn theo vai trÃ².
                  </p>
                  <div className="mt-5">
                    <Button
                      className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
                      onClick={() => setCreateOrganizationOpen(true)}
                    >
                      Táº¡o tá»• chá»©c
                    </Button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#e6ebde] bg-[#fbfcf8] p-5">
                  <p className="text-base font-semibold text-[#223021]">
                    Hoáº·c tham gia workspace Ä‘Ã£ cÃ³ sáºµn
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#65725f]">
                    Náº¿u team cá»§a báº¡n Ä‘Ã£ dÃ¹ng há»‡ thá»‘ng, gá»­i yÃªu cáº§u gia nháº­p Ä‘á»ƒ vÃ o Ä‘Ãºng workspace thay vÃ¬ táº¡o má»›i.
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
              title="ThÃ nh viÃªn vÃ  vai trÃ²"
              description="Quáº£n lÃ½ ngÆ°á»i, vai trÃ² vÃ  phÃ²ng ban á»Ÿ má»™t chá»— riÃªng cho gá»n."
            >
              <OrganizationMembersPanel />
            </DashboardSection>

            <DashboardSection
              title="Lá»i má»i Ä‘ang má»Ÿ"
              description="Theo dÃµi nhá»¯ng ngÆ°á»i Ä‘Ã£ Ä‘Æ°á»£c má»i nhÆ°ng chÆ°a vÃ o workspace."
            >
              <OrganizationInvitationsPanel />
            </DashboardSection>

            <DashboardSection
              title="YÃªu cáº§u cáº§n duyá»‡t"
              description="CÃ¡c yÃªu cáº§u xin tham gia workspace sáº½ náº±m á»Ÿ Ä‘Ã¢y."
            >
              <OrganizationJoinRequestsPanel />
            </DashboardSection>
          </>
        ) : (
          <EmptyWorkspaceState
            title="Quáº£n lÃ½ thÃ nh viÃªn"
            description="Khi Ä‘Ã£ cÃ³ workspace, báº¡n má»›i cÃ³ thá»ƒ má»i ngÆ°á»i, gÃ¡n vai trÃ² vÃ  duyá»‡t yÃªu cáº§u tham gia."
            actionLabel="Sang khu tá»• chá»©c"
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



