'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  LayoutDashboard,
  Plus,
  Settings2,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ExecutiveSummaryWidget } from '@/components/ai/executive-summary-widget';
import { DashboardPageShell, DashboardSection } from '@/components/dashboard/page-shell';
import { CreateOrganizationModal } from '@/components/organizations/create-organization-modal';
import { OrganizationInvitationsList } from '@/components/organizations/organization-invitations-list';
import { OrganizationJoinDiscoveryPanel } from '@/components/organizations/organization-join-discovery-panel';
import { CreateProjectModal } from '@/components/projects/create-project-modal';
import { ProjectCard } from '@/components/projects/project-card';
import ProjectInvitations from '@/components/projects/project-invitations';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isLeadershipRole } from '@/lib/auth/permissions';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useMyOrganizationInvitations, useOrganization } from '@/lib/hooks/use-organizations';
import { useProjects, type Project } from '@/lib/hooks/use-projects';
import { useStats } from '@/lib/hooks/use-stats';
import { usePresence } from '@/lib/providers/presence-provider';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const digestReference = searchParams.get('digest');
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createOrganizationOpen, setCreateOrganizationOpen] = useState(false);
  const { data: organization, isLoading: organizationLoading } = useOrganization();
  const { data: organizationInvitations, isLoading: invitationsLoading } = useMyOrganizationInvitations();
  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const { data: stats, isLoading: statsLoading } = useStats({ enabled: Boolean(organization) });
  const { onlineCount, ready: presenceReady } = usePresence();
  const { data: currentUser } = useCurrentUser();

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: true }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'KhÃ´ng thá»ƒ cáº­p nháº­t tráº¡ng thÃ¡i báº¯t Ä‘áº§u nhanh');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast.success('ÄÃ£ áº©n pháº§n báº¯t Ä‘áº§u nhanh');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const isLoading = projectsLoading || organizationLoading || invitationsLoading || (Boolean(organization) && statsLoading);
  const shouldShowExecutiveSummary = Boolean(organization) && isLeadershipRole(currentUser?.vai_tro);
  const projects = projectsData?.data || [];
  const onboardingSteps = [
    {
      title: 'Táº¡o dá»± Ã¡n Ä‘áº§u tiÃªn',
      description: 'Dá»±ng khung cÃ´ng viá»‡c, deadline vÃ  thÃ nh viÃªn cá»‘t lÃµi Ä‘á»ƒ team báº¯t Ä‘áº§u cháº¡y tháº­t.',
      completed: projects.length > 0,
      href: null as string | null,
      cta: 'Táº¡o dá»± Ã¡n ngay',
    },
    {
      title: 'ÄÆ°a task vÃ o guá»“ng cháº¡y',
      description: 'ThÃªm task, checklist hoáº·c template Ä‘á»ƒ báº£ng Kanban cÃ³ dá»¯ liá»‡u tháº­t thay vÃ¬ chá»‰ lÃ  khung trá»‘ng.',
      completed: (stats?.inProgressTasks || 0) > 0,
      href: '/dashboard/kanban',
      cta: 'Má»Ÿ Kanban',
    },
    {
      title: 'Chá»‘t nhá»‹p review vÃ  thÃ´ng bÃ¡o',
      description: 'Thiáº¿t láº­p kÃªnh nháº¯c viá»‡c, digest vÃ  hÃ ng chá» duyá»‡t Ä‘á»ƒ ngÆ°á»i quáº£n lÃ½ bÃ¡m sÃ¡t tiáº¿n Ä‘á»™ má»—i ngÃ y.',
      completed: !!currentUser?.onboarding_completed,
      href: '/dashboard/settings',
      cta: 'Má»Ÿ cÃ i Ä‘áº·t',
    },
  ];
  const completedOnboardingSteps = onboardingSteps.filter((step) => step.completed).length;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Skeleton className="h-[220px] rounded-[38px]" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[140px] rounded-[28px]" />
          ))}
        </div>
      </div>
    );
  }

  const shellMetrics = organization
    ? [
        {
          label: 'Tá»•ng sá»‘ dá»± Ã¡n',
          value: stats?.totalProjects?.toString() || '0',
          note: 'ToÃ n bá»™ khÃ´ng gian lÃ m viá»‡c',
          icon: <LayoutDashboard className="h-4 w-4 text-[#2f6052]" />,
          surfaceClassName: 'bg-[#eef6f0] border-[#d9eadf]',
          valueClassName: 'text-[#2f6052]',
        },
        {
          label: 'Nhiá»‡m vá»¥ Ä‘ang cháº¡y',
          value: stats?.inProgressTasks?.toString() || '0',
          note: 'CÃ¡c task Ä‘ang triá»ƒn khai',
          icon: <TrendingUp className="h-4 w-4 text-[#b66944]" />,
          surfaceClassName: 'bg-[#fff1e8] border-[#f0ddd1]',
          valueClassName: 'text-[#b66944]',
        },
        {
          label: 'Äang online',
          value: presenceReady ? onlineCount.toString() : '...',
          note: 'NgÆ°á»i Ä‘ang má»Ÿ VSmart lÃºc nÃ y',
          icon: <Users className="h-4 w-4 text-[#39638d]" />,
          surfaceClassName: 'bg-[#edf5ff] border-[#d8e6f7]',
          valueClassName: 'text-[#39638d]',
        },
        {
          label: 'QuÃ¡ háº¡n má»Ÿ',
          value: stats?.overdueTasks?.toString() || '0',
          note: 'Äiá»ƒm cáº§n giá»¯ sÃ¡t hÃ´m nay',
          icon: <CheckCircle2 className="h-4 w-4 text-[#985c21]" />,
          surfaceClassName: 'bg-[#fff6df] border-[#eee1bb]',
          valueClassName: 'text-[#985c21]',
        },
      ]
    : [
        {
          label: 'Há»“ sÆ¡ cÃ¡ nhÃ¢n',
          value: currentUser?.ten ? 'Sáºµn sÃ ng' : 'Cáº§n bá»• sung',
          note: 'Báº¡n Ä‘ang á»Ÿ cháº¿ Ä‘á»™ lÃ m viá»‡c cÃ¡ nhÃ¢n',
          icon: <CheckCircle2 className="h-4 w-4 text-[#2f6052]" />,
          surfaceClassName: 'bg-[#eef6f0] border-[#d9eadf]',
          valueClassName: 'text-xl text-[#2f6052]',
        },
        {
          label: 'KhÃ´ng gian lÃ m viá»‡c',
          value: 'ChÆ°a táº¡o',
          note: 'Táº¡o khi cáº§n má»Ÿ dá»± Ã¡n vÃ  má»i team',
          icon: <Building2 className="h-4 w-4 text-[#39638d]" />,
          surfaceClassName: 'bg-[#edf5ff] border-[#d8e6f7]',
          valueClassName: 'text-xl text-[#39638d]',
        },
        {
          label: 'Dá»± Ã¡n hiá»‡n cÃ³',
          value: projects.length.toString(),
          note: 'Báº¡n chá»‰ cÃ³ thá»ƒ táº¡o dá»± Ã¡n má»›i sau khi cÃ³ tá»• chá»©c',
          icon: <LayoutDashboard className="h-4 w-4 text-[#985c21]" />,
          surfaceClassName: 'bg-[#fff6df] border-[#eee1bb]',
          valueClassName: 'text-[#985c21]',
        },
      ];

  return (
    <DashboardPageShell
      badge={
        <>
          <Sparkles className="h-3.5 w-3.5 text-[#87ac63]" />
          Tá»•ng quan
        </>
      }
      title={currentUser?.ten ? `ChÃ o ${currentUser.ten}` : 'Tá»•ng quan'}
      description={
        organization
          ? 'Theo dÃµi tiáº¿n Ä‘á»™ chung, deadline sáº¯p tá»›i vÃ  cÃ¡c Ä‘iá»ƒm cáº§n chÃº Ã½.'
          : 'Báº¡n Ä‘ang dÃ¹ng VSmart vá»›i há»“ sÆ¡ cÃ¡ nhÃ¢n. Khi cáº§n lÃ m viá»‡c cÃ¹ng team, hÃ£y táº¡o tá»• chá»©c Ä‘á»ƒ báº¯t Ä‘áº§u dá»± Ã¡n.'
      }
      actions={
        organization ? (
          <>
            <Button className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]" onClick={() => setCreateProjectOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Dá»± Ã¡n má»›i
            </Button>
            <Link href="/dashboard/projects">
              <Button variant="outline" className="border-[#e0e6d7] bg-white text-[#5d6958] hover:bg-[#f6f8f1]">
                Xem toÃ n bá»™ dá»± Ã¡n
              </Button>
            </Link>
          </>
        ) : (
          <>
            <Button className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]" onClick={() => setCreateOrganizationOpen(true)}>
              <Building2 className="mr-2 h-4 w-4" />
              Táº¡o tá»• chá»©c
            </Button>
            <Link href="/dashboard/settings">
              <Button variant="outline" className="border-[#e0e6d7] bg-white text-[#5d6958] hover:bg-[#f6f8f1]">
                Má»Ÿ cÃ i Ä‘áº·t
              </Button>
            </Link>
          </>
        )
      }
      metrics={shellMetrics}
    >
      {!organization ? (
        <DashboardSection
          title="Sáºµn sÃ ng lÃ m viá»‡c cÃ¹ng team"
          description="Báº¡n cÃ³ thá»ƒ báº¯t Ä‘áº§u tá»« há»“ sÆ¡ cÃ¡ nhÃ¢n trÆ°á»›c, rá»“i táº¡o tá»• chá»©c khi cáº§n má»Ÿ dá»± Ã¡n chung."
        >
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[28px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] p-5">
              <div className="inline-flex rounded-full border border-[#d6e3c9] bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#62705b]">
                Báº¯t Ä‘áº§u nháº¹ nhÃ ng
              </div>
              <h3 className="mt-4 text-xl font-semibold text-[#223021]">Khi cáº§n lÃ m viá»‡c cÃ¹ng team, hÃ£y táº¡o má»™t tá»• chá»©c riÃªng.</h3>
              <p className="mt-3 text-sm leading-7 text-[#5d6b58]">
                Sau Ä‘Ã³ báº¡n cÃ³ thá»ƒ má»Ÿ dá»± Ã¡n, má»i thÃ nh viÃªn vÃ  quáº£n lÃ½ má»i thá»© á»Ÿ cÃ¹ng má»™t nÆ¡i. NgÆ°á»i táº¡o Ä‘áº§u tiÃªn sáº½ lÃ  <strong>owner</strong>.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]" onClick={() => setCreateOrganizationOpen(true)}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Táº¡o tá»• chá»©c ngay
                </Button>
                <Link href="/dashboard/profile">
                  <Button variant="outline" className="border-[#e0e6d7] bg-white text-[#5d6958] hover:bg-[#f6f8f1]">
                    Cáº­p nháº­t há»“ sÆ¡
                  </Button>
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              {[
                ['1', 'Cáº­p nháº­t há»“ sÆ¡', 'ThÃªm há» tÃªn, phÃ²ng ban, avatar hoáº·c ká»¹ nÄƒng Ä‘á»ƒ thÃ´ng tin cá»§a báº¡n Ä‘áº§y Ä‘á»§ hÆ¡n.'],
                ['2', 'Táº¡o tá»• chá»©c', 'Thiáº¿t láº­p khÃ´ng gian lÃ m viá»‡c chung cho team khi báº¡n sáºµn sÃ ng.'],
                ['3', 'Báº¯t Ä‘áº§u dá»± Ã¡n', 'Táº¡o dá»± Ã¡n Ä‘áº§u tiÃªn vÃ  má»i má»i ngÆ°á»i vÃ o lÃ m viá»‡c cÃ¹ng nhau.'],
              ].map(([index, title, description]) => (
                <div key={index} className="rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d9e4cd] bg-[#f4faea] text-sm font-semibold text-[#587041]">
                      {index}
                    </div>
                    <div>
                      <p className="font-medium text-[#223021]">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#65725f]">{description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DashboardSection>
      ) : null}

      {!organization && (organizationInvitations?.length || 0) > 0 ? (
        <DashboardSection title="Lá»i má»i Ä‘ang chá»" description="Náº¿u cÃ³ ai Ä‘Ã³ Ä‘Ã£ má»i báº¡n vÃ o má»™t tá»• chá»©c, báº¡n cÃ³ thá»ƒ pháº£n há»“i ngay táº¡i Ä‘Ã¢y.">
          <OrganizationInvitationsList />
        </DashboardSection>
      ) : null}

      {!organization ? (
        <DashboardSection title="TÃ¬m tá»• chá»©c Ä‘á»ƒ tham gia" description="Náº¿u team cá»§a báº¡n Ä‘Ã£ cÃ³ workspace sáºµn, báº¡n cÃ³ thá»ƒ gá»­i yÃªu cáº§u gia nháº­p táº¡i Ä‘Ã¢y.">
          <OrganizationJoinDiscoveryPanel />
        </DashboardSection>
      ) : null}

      {organization && !currentUser?.onboarding_completed ? (
        <DashboardSection title="Báº¯t Ä‘áº§u nhanh" description="HoÃ n thÃ nh vÃ i bÆ°á»›c cÆ¡ báº£n Ä‘á»ƒ báº¯t Ä‘áº§u lÃ m viá»‡c thuáº­n hÆ¡n.">
          <div className="mb-4 inline-flex rounded-full border border-[#d7e1cb] bg-[#f7fbef] px-3 py-1 text-sm font-medium text-[#50614f]">
            {completedOnboardingSteps}/3 Ä‘Ã£ xong
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {onboardingSteps.map((step) => (
              <div key={step.title} className="rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#223021]">{step.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#65725f]">{step.description}</p>
                  </div>
                  <CheckCircle2 className={`h-5 w-5 shrink-0 ${step.completed ? 'text-emerald-600' : 'text-slate-300'}`} />
                </div>

                {step.href ? (
                  <Link href={step.href} className="mt-4 inline-flex text-sm font-medium text-[#4f614b] transition-colors hover:text-[#223021]">
                    {step.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCreateProjectOpen(true)}
                    className="mt-4 inline-flex text-sm font-medium text-[#4f614b] transition-colors hover:text-[#223021]"
                  >
                    {step.cta}
                  </button>
                )}

                {step.title === 'Chá»‘t nhá»‹p review vÃ  thÃ´ng bÃ¡o' ? (
                  <Link href="/dashboard/reviews" className="mt-2 flex items-center gap-2 text-sm text-[#6a7762] transition-colors hover:text-[#223021]">
                    <Settings2 className="h-4 w-4" />
                    Má»Ÿ hÃ ng chá» duyá»‡t
                  </Link>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]" onClick={() => setCreateProjectOpen(true)}>
              Táº¡o dá»± Ã¡n ngay
            </Button>
            <Link href="/dashboard/settings">
              <Button variant="outline" className="border-[#e0e6d7] bg-white text-[#5d6958] hover:bg-[#f6f8f1]">
                Má»Ÿ cÃ i Ä‘áº·t thÃ´ng bÃ¡o
              </Button>
            </Link>
            <Button variant="ghost" className="text-[#5f6b58] hover:bg-[#f6f8f1]" disabled={completeOnboardingMutation.isPending} onClick={() => completeOnboardingMutation.mutate()}>
              {completeOnboardingMutation.isPending ? 'Äang cáº­p nháº­t...' : 'ÄÃ¡nh dáº¥u Ä‘Ã£ sáºµn sÃ ng'}
            </Button>
          </div>
        </DashboardSection>
      ) : null}

      {shouldShowExecutiveSummary ? (
        <DashboardSection title="TÃ³m táº¯t hÃ´m nay" description="Nhá»¯ng Ä‘iá»ƒm chÃ­nh cáº§n xem trÆ°á»›c khi báº¯t Ä‘áº§u lÃ m viá»‡c.">
          <ExecutiveSummaryWidget />
          {digestReference ? <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#7c8776]">Äang má»Ÿ digest: {digestReference}</p> : null}
        </DashboardSection>
      ) : null}

      {organization ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <DashboardSection title="Deadline vÃ  táº£i tuáº§n nÃ y" description="CÃ¡c má»‘c gáº§n nháº¥t vÃ  nÆ¡i cÃ³ dáº¥u hiá»‡u dá»“n viá»‡c.">
            <div className="space-y-3">
              {(stats?.upcomingDeadlines || []).length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[#dce4d3] bg-[#f8faf4] py-8 text-center text-sm text-[#72806c]">
                  ChÆ°a cÃ³ deadline ná»•i báº­t trong 2 tuáº§n tá»›i.
                </div>
              ) : (
                (stats?.upcomingDeadlines || []).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-[22px] border border-[#e4e9de] bg-[#fbfcf8] p-4">
                    <div>
                      <p className="font-medium text-[#223021]">{item.ten}</p>
                      <p className="mt-1 text-sm text-[#65725f]">
                        {item.projectName} Â· {item.assigneeName}
                      </p>
                    </div>
                    <div className="rounded-full border border-[#e0e6d7] bg-white px-3 py-1 text-xs font-medium text-[#5f6b58]">
                      {new Date(item.deadline).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DashboardSection>

          <DashboardSection title="Dá»± Ã¡n vÃ  thÃ nh viÃªn cáº§n chÃº Ã½" description="Nhá»¯ng chá»— nÃªn xem láº¡i sá»›m Ä‘á»ƒ trÃ¡nh trá»… viá»‡c.">
            <div className="space-y-3">
              {(stats?.riskyProjects || []).slice(0, 2).map((project) => (
                <div key={project.id} className="rounded-[22px] border border-[#e4e9de] bg-[#fbfcf8] p-4">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="font-medium text-[#223021]">{project.ten}</p>
                    <span className="text-sm font-semibold text-[#b66944]">{project.slipProbability}%</span>
                  </div>
                  <p className="text-sm text-[#65725f]">{project.forecastStatus === 'slipping' ? 'Nguy cÆ¡ trá»… cao' : 'Cáº§n theo dÃµi sÃ¡t'}</p>
                </div>
              ))}

              {(stats?.overloadedMembers || []).slice(0, 3).map((member) => (
                <div key={member.userId} className="flex items-center justify-between rounded-[22px] border border-[#e4e9de] bg-[#fbfcf8] p-4">
                  <div>
                    <p className="font-medium text-[#223021]">{member.ten}</p>
                    <p className="mt-1 text-sm text-[#65725f]">{member.activeTasks} task Ä‘ang má»Ÿ</p>
                  </div>
                  <span className="text-sm font-semibold text-[#b16442]">{Math.round(member.loadRatio * 100)}%</span>
                </div>
              ))}
            </div>
          </DashboardSection>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <DashboardSection title="Khi cÃ³ tá»• chá»©c, má»i thá»© sáº½ gá»n hÆ¡n" description="Dá»± Ã¡n, thÃ nh viÃªn vÃ  cÃ i Ä‘áº·t chung cá»§a team sáº½ náº±m cÃ¹ng má»™t chá»—.">
            <div className="space-y-3">
              {[
                ['Má»i ngÆ°á»i vÃ o lÃ m viá»‡c', 'Báº¡n cÃ³ thá»ƒ thÃªm thÃ nh viÃªn vÃ  báº¯t Ä‘áº§u cá»™ng tÃ¡c ngay trong cÃ¹ng má»™t khÃ´ng gian.'],
                ['Má»Ÿ dá»± Ã¡n má»›i', 'Má»i dá»± Ã¡n má»›i sáº½ Ä‘Æ°á»£c táº¡o Ä‘Ãºng chá»— Ä‘á»ƒ cáº£ team cÃ¹ng theo dÃµi.'],
                ['Quáº£n lÃ½ cÃ i Ä‘áº·t chung', 'CÃ¡c thiáº¿t láº­p cho team sáº½ náº±m riÃªng, khÃ´ng láº«n vá»›i há»“ sÆ¡ cÃ¡ nhÃ¢n cá»§a báº¡n.'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-[22px] border border-[#e4e9de] bg-[#fbfcf8] p-4">
                  <p className="font-medium text-[#223021]">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#65725f]">{description}</p>
                </div>
              ))}
            </div>
          </DashboardSection>

          <DashboardSection title="Táº¡o tá»• chá»©c báº¥t cá»© lÃºc nÃ o" description="Ngay sau khi táº¡o xong, báº¡n cÃ³ thá»ƒ báº¯t Ä‘áº§u dá»± Ã¡n Ä‘áº§u tiÃªn cho team.">
            <div className="rounded-[24px] border border-[#e4ebdd] bg-[#fbfcf8] p-5">
              <p className="text-sm leading-7 text-[#5d6b58]">
                Báº¡n váº«n cÃ³ thá»ƒ dÃ¹ng VSmart vá»›i há»“ sÆ¡ cÃ¡ nhÃ¢n trÆ°á»›c. Khi cáº§n lÃ m viá»‡c cÃ¹ng team, chá»‰ cáº§n táº¡o tá»• chá»©c lÃ  Ä‘á»§ Ä‘á»ƒ báº¯t Ä‘áº§u.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]" onClick={() => setCreateOrganizationOpen(true)}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Táº¡o tá»• chá»©c
                </Button>
                <Link href="/dashboard/settings">
                  <Button variant="outline" className="border-[#e0e6d7] bg-white text-[#5d6958] hover:bg-[#f6f8f1]">
                    Xem cÃ i Ä‘áº·t
                  </Button>
                </Link>
              </div>
            </div>
          </DashboardSection>
        </div>
      )}

      {organization ? (
        <DashboardSection title="Lá»i má»i dá»± Ã¡n" description="CÃ¡c lá»i má»i Ä‘ang chá» báº¡n xÃ¡c nháº­n.">
          <ProjectInvitations />
        </DashboardSection>
      ) : null}

      <DashboardSection
        title={organization ? 'Dá»± Ã¡n gáº§n Ä‘Ã¢y' : 'Dá»± Ã¡n'}
        description={
          organization
            ? 'CÃ¡c dá»± Ã¡n báº¡n vá»«a lÃ m viá»‡c hoáº·c má»›i Ä‘Æ°á»£c cáº­p nháº­t.'
            : 'Dá»± Ã¡n chá»‰ Ä‘Æ°á»£c táº¡o sau khi báº¡n cÃ³ má»™t tá»• chá»©c Ä‘á»ƒ há»‡ thá»‘ng gáº¯n Ä‘Ãºng quyá»n vÃ  pháº¡m vi cá»™ng tÃ¡c.'
        }
        actions={
          organization ? (
            <Link href="/dashboard/projects">
              <Button variant="outline" className="border-[#e0e6d7] bg-white text-[#5d6958] hover:bg-[#f6f8f1]">
                Xem táº¥t cáº£
              </Button>
            </Link>
          ) : null
        }
      >
        {projects.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[#dce4d3] bg-[#f8faf4] py-12 text-center">
            <p className="mb-4 text-[#72806c]">
              {organization ? 'ChÆ°a cÃ³ dá»± Ã¡n nÃ o.' : 'Báº¡n chÆ°a cÃ³ workspace Ä‘á»ƒ má»Ÿ dá»± Ã¡n má»›i.'}
            </p>
            <Button
              className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
              onClick={() => (organization ? setCreateProjectOpen(true) : setCreateOrganizationOpen(true))}
            >
              {organization ? (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Táº¡o dá»± Ã¡n Ä‘áº§u tiÃªn
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Táº¡o tá»• chá»©c trÆ°á»›c
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.slice(0, 6).map((project: Project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </DashboardSection>

      <CreateProjectModal open={createProjectOpen} onOpenChange={setCreateProjectOpen} />
      <CreateOrganizationModal open={createOrganizationOpen} onOpenChange={setCreateOrganizationOpen} />
    </DashboardPageShell>
  );
}

