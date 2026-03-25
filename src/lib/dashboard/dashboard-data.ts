import type { MyOrganizationInvitation } from '@/app/api/organization-members/invitations/route';
import type { Organization } from '@/app/api/organizations/route';
import type { Project } from '@/lib/hooks/use-projects';
import type { DashboardStats } from '@/lib/hooks/use-stats';
import type { CurrentUser } from '@/lib/hooks/use-current-user';
import {
  getCalendarPlanningData,
  getProjectHealthSummaries,
  getWorkloadPlanningData,
} from '@/lib/planning/planning-service';
import { supabaseAdmin } from '@/lib/supabase/client';

const defaultOrganizationSettings: Organization['settings'] = {
  allow_external_project_invites: false,
  allow_join_requests: false,
};

function extractSingleRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function normalizeOrganization(
  organization: (Partial<Organization> & { settings?: Partial<Organization['settings']> | null }) | null
): Organization | null {
  if (!organization) {
    return null;
  }

  return {
    ...(organization as Organization),
    settings: {
      ...defaultOrganizationSettings,
      ...(organization.settings || {}),
    },
  };
}

export async function getDashboardCurrentUser(email: string): Promise<CurrentUser | null> {
  const { data, error } = await supabaseAdmin
    .from('nguoi_dung')
    .select(
      `
        *,
        to_chuc:to_chuc_id (
          id,
          ten,
          mo_ta,
          logo_url
        )
      `
    )
    .eq('email', email)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CurrentUser;
}

export async function getDashboardOrganization(organizationId?: string | null): Promise<Organization | null> {
  if (!organizationId) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('to_chuc')
    .select('*')
    .eq('id', organizationId)
    .single();

  if (error || !data) {
    return null;
  }

  return normalizeOrganization(data);
}

export async function getDashboardOrganizationInvitations(email: string): Promise<MyOrganizationInvitation[]> {
  const { data, error } = await supabaseAdmin
    .from('loi_moi_to_chuc')
    .select(
      `
        id,
        email,
        vai_tro,
        trang_thai,
        ngay_moi,
        to_chuc:to_chuc_id (
          id,
          ten,
          mo_ta
        ),
        nguoi_moi:nguoi_moi_id (
          id,
          ten,
          email,
          avatar_url
        )
      `
    )
    .eq('email', email.toLowerCase())
    .eq('trang_thai', 'pending')
    .order('ngay_moi', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((item) => ({
    ...item,
    to_chuc: extractSingleRelation(item.to_chuc)!,
    nguoi_moi: extractSingleRelation(item.nguoi_moi)!,
  })) as MyOrganizationInvitation[];
}

export async function getRecentProjects(email: string, limit = 6): Promise<Project[]> {
  const { data, error } = await supabaseAdmin
    .from('du_an')
    .select(
      `
        *,
        thanh_vien_du_an!inner(email, trang_thai, vai_tro)
      `
    )
    .eq('thanh_vien_du_an.email', email)
    .eq('thanh_vien_du_an.trang_thai', 'active')
    .is('deleted_at', null)
    .order('ngay_tao', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((project) => {
    const membership = Array.isArray(project.thanh_vien_du_an)
      ? project.thanh_vien_du_an[0]
      : project.thanh_vien_du_an;
    const normalizedProject = { ...project } as Project & {
      thanh_vien_du_an?: Array<{ vai_tro?: Project['current_membership_role'] }> | { vai_tro?: Project['current_membership_role'] };
    };
    delete normalizedProject.thanh_vien_du_an;

    return {
      ...normalizedProject,
      current_membership_role: membership?.vai_tro || null,
    };
  });
}

export async function getDashboardStats(email: string): Promise<DashboardStats> {
  const { data: userData, error: userError } = await supabaseAdmin
    .from('nguoi_dung')
    .select('id, to_chuc_id')
    .eq('email', email)
    .single();

  if (userError || !userData) {
    throw new Error('Không tìm thấy thông tin người dùng');
  }

  const [membershipsResult, userCountResult] = await Promise.all([
    supabaseAdmin
      .from('thanh_vien_du_an')
      .select('du_an_id')
      .eq('email', email)
      .eq('trang_thai', 'active'),
    supabaseAdmin
      .from('nguoi_dung')
      .select('id', { count: 'exact', head: true })
      .eq('to_chuc_id', userData.to_chuc_id),
  ]);

  const projectIds = Array.from(new Set(membershipsResult.data?.map((membership) => membership.du_an_id) || []));

  let inProgressTasks = 0;
  if (projectIds.length > 0) {
    const { data: parts, error: partsError } = await supabaseAdmin
      .from('phan_du_an')
      .select('id')
      .in('du_an_id', projectIds)
      .is('deleted_at', null);

    if (!partsError && parts && parts.length > 0) {
      const partIds = parts.map((part) => part.id);
      const { count } = await supabaseAdmin
        .from('task')
        .select('id', { count: 'exact', head: true })
        .in('phan_du_an_id', partIds)
        .eq('trang_thai', 'in-progress')
        .is('deleted_at', null);

      inProgressTasks = count || 0;
    }
  }

  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setDate(rangeStart.getDate() - 7);
  const rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + 14);

  const [planningCalendar, workload, riskyProjects] = await Promise.all([
    getCalendarPlanningData({
      email,
      dateFrom: rangeStart.toISOString(),
      dateTo: rangeEnd.toISOString(),
    }),
    getWorkloadPlanningData({
      email,
    }),
    getProjectHealthSummaries(projectIds.slice(0, 6)),
  ]);

  const riskTrends = planningCalendar.items.reduce(
    (acc, task) => {
      if (task.trang_thai === 'done') {
        return acc;
      }

      if (task.risk_score >= 70) {
        acc.high += 1;
      } else if (task.risk_score >= 40) {
        acc.medium += 1;
      } else {
        acc.low += 1;
      }

      return acc;
    },
    { low: 0, medium: 0, high: 0 }
  );

  const overloadedMembers = workload.members
    .filter((member) => member.loadStatus === 'overloaded' || member.loadStatus === 'stretched')
    .slice(0, 4)
    .map((member) => ({
      userId: member.userId,
      ten: member.ten,
      loadStatus: member.loadStatus,
      loadRatio: member.loadRatio,
      activeTasks: member.activeTasks,
    }));

  const normalizedRiskyProjects = riskyProjects
    .slice(0, 3)
    .map((project) => ({
      id: project.id,
      ten: project.ten,
      forecastStatus: project.forecastStatus,
      slipProbability: project.slipProbability,
    }));

  const upcomingDeadlines = planningCalendar.items
    .filter((task) => task.trang_thai !== 'done')
    .slice(0, 5)
    .map((task) => ({
      id: task.id,
      ten: task.ten,
      deadline: task.deadline,
      projectName: task.project?.ten || 'Chưa rõ dự án',
      assigneeName: task.assignee?.ten || 'Chưa phân công',
    }));

  return {
    totalProjects: projectIds.length,
    inProgressTasks,
    totalUsers: userCountResult.count || 0,
    overdueTasks: planningCalendar.summary.overdueTasks,
    upcomingDeadlines,
    workloadSummary: workload.summary,
    riskTrends,
    overloadedMembers,
    riskyProjects: normalizedRiskyProjects,
  };
}
