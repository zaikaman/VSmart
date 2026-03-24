import { supabaseAdmin } from '@/lib/supabase/client';
import {
  DEFAULT_CAPACITY_POINTS,
  OVERLOAD_ACTIVE_TASK_THRESHOLD,
  summarizeWorkload,
  type WorkloadStatus,
} from '@/lib/utils/workload-utils';

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type TaskStatus = 'todo' | 'in-progress' | 'done';

interface PlanningTaskRow {
  id: string;
  ten: string;
  mo_ta: string | null;
  deadline: string;
  priority: TaskPriority;
  trang_thai: TaskStatus;
  progress: number;
  risk_score: number;
  assignee_id: string | null;
  phan_du_an_id: string;
  nguoi_dung?: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  } | {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  }[] | null;
  phan_du_an?: {
    id: string;
    ten: string;
    du_an_id: string;
    du_an?: { id: string; ten: string } | { id: string; ten: string }[] | null;
    phong_ban?: { id: string; ten: string } | { id: string; ten: string }[] | null;
  } | {
    id: string;
    ten: string;
    du_an_id: string;
    du_an?: { id: string; ten: string } | { id: string; ten: string }[] | null;
    phong_ban?: { id: string; ten: string } | { id: string; ten: string }[] | null;
  }[] | null;
}

interface MemberRow {
  du_an_id: string;
  nguoi_dung_id: string | null;
  email: string;
  vai_tro: string;
  nguoi_dung?: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
    phong_ban?: { ten: string } | { ten: string }[] | null;
  } | {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
    phong_ban?: { ten: string } | { ten: string }[] | null;
  }[] | null;
}

export interface PlanningTaskItem {
  id: string;
  ten: string;
  mo_ta: string | null;
  deadline: string;
  priority: TaskPriority;
  trang_thai: TaskStatus;
  progress: number;
  risk_score: number;
  assignee_id: string | null;
  assignee: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  } | null;
  project: {
    id: string;
    ten: string;
  } | null;
  part: {
    id: string;
    ten: string;
  } | null;
  department: {
    id: string;
    ten: string;
  } | null;
}

export interface WorkloadMemberSummary {
  userId: string;
  ten: string;
  email: string;
  avatarUrl: string | null;
  projectRole: string;
  departmentName: string | null;
  activeTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  highRiskTasks: number;
  loadPoints: number;
  capacityPoints: number;
  loadRatio: number;
  loadStatus: WorkloadStatus;
  tasks: PlanningTaskItem[];
}

export interface CalendarPlanningResult {
  range: {
    dateFrom: string;
    dateTo: string;
  };
  items: PlanningTaskItem[];
  summary: {
    totalTasks: number;
    overdueTasks: number;
    upcomingTasks: number;
    highRiskTasks: number;
  };
}

export interface WorkloadPlanningResult {
  summary: {
    totalMembers: number;
    overloadedMembers: number;
    stretchedMembers: number;
    availableMembers: number;
    totalActiveTasks: number;
    avgLoadRatio: number;
    overloadThreshold: number;
  };
  members: WorkloadMemberSummary[];
}

export interface ProjectForecastResult {
  project: {
    id: string;
    ten: string;
    deadline: string;
    trang_thai: string;
    phan_tram_hoan_thanh: number;
  };
  forecastStatus: 'on-track' | 'watch' | 'slipping';
  slipProbability: number;
  projectedDelayDays: number;
  confidence: number;
  summary: {
    totalTasks: number;
    openTasks: number;
    doneTasks: number;
    overdueTasks: number;
    highRiskTasks: number;
    unassignedTasks: number;
    dueThisWeek: number;
    overloadedMembers: number;
    completionRate: number;
  };
  reasons: string[];
  topRisks: PlanningTaskItem[];
  overloadedMembers: WorkloadMemberSummary[];
}

export interface ProjectHealthSummary {
  id: string;
  ten: string;
  forecastStatus: ProjectForecastResult['forecastStatus'];
  slipProbability: number;
  projectedDelayDays: number;
  completionRate: number;
  overdueTasks: number;
}

interface ProjectRow {
  id: string;
  ten: string;
  deadline: string;
  trang_thai: string;
  phan_tram_hoan_thanh: number | null;
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

async function getAccessibleProjectIds(email: string, projectId?: string | null) {
  let query = supabaseAdmin
    .from('thanh_vien_du_an')
    .select('du_an_id')
    .eq('email', email)
    .eq('trang_thai', 'active');

  if (projectId) {
    query = query.eq('du_an_id', projectId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return Array.from(new Set((data || []).map((item) => item.du_an_id)));
}

async function getPartIdsForProjects(projectIds: string[]) {
  if (projectIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('phan_du_an')
    .select('id')
    .in('du_an_id', projectIds)
    .is('deleted_at', null);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((item) => item.id);
}

function groupTasksByAssignee(tasks: PlanningTaskItem[]) {
  const tasksByAssignee = new Map<string, PlanningTaskItem[]>();

  for (const task of tasks) {
    if (!task.assignee_id) {
      continue;
    }

    const currentTasks = tasksByAssignee.get(task.assignee_id) || [];
    currentTasks.push(task);
    tasksByAssignee.set(task.assignee_id, currentTasks);
  }

  return tasksByAssignee;
}

function groupTasksByProject(tasks: PlanningTaskItem[]) {
  const tasksByProject = new Map<string, PlanningTaskItem[]>();

  for (const task of tasks) {
    if (!task.project?.id) {
      continue;
    }

    const currentTasks = tasksByProject.get(task.project.id) || [];
    currentTasks.push(task);
    tasksByProject.set(task.project.id, currentTasks);
  }

  return tasksByProject;
}

function summarizeMemberWorkload(memberRows: MemberRow[], activeTasks: PlanningTaskItem[]) {
  const tasksByAssignee = groupTasksByAssignee(activeTasks);
  const dedupedMembers = new Map<string, WorkloadMemberSummary>();

  for (const row of memberRows) {
    const user = pickOne(row.nguoi_dung);

    if (!user?.id || dedupedMembers.has(user.id)) {
      continue;
    }

    const userTasks = tasksByAssignee.get(user.id) || [];
    const summary = summarizeWorkload(
      userTasks.map((task) => ({
        id: task.id,
        priority: task.priority,
        trang_thai: task.trang_thai,
        deadline: task.deadline,
        risk_score: task.risk_score,
      })),
      DEFAULT_CAPACITY_POINTS
    );
    const department = pickOne(user.phong_ban);

    dedupedMembers.set(user.id, {
      userId: user.id,
      ten: user.ten,
      email: user.email,
      avatarUrl: user.avatar_url,
      projectRole: row.vai_tro,
      departmentName: department?.ten || null,
      activeTasks: summary.activeTasks,
      overdueTasks: summary.overdueTasks,
      dueSoonTasks: summary.dueSoonTasks,
      highRiskTasks: summary.highRiskTasks,
      loadPoints: summary.loadPoints,
      capacityPoints: summary.capacityPoints,
      loadRatio: summary.loadRatio,
      loadStatus: summary.loadStatus,
      tasks: userTasks,
    });
  }

  return Array.from(dedupedMembers.values()).sort((a, b) => b.loadRatio - a.loadRatio);
}

function summarizeWorkloadOverview(members: WorkloadMemberSummary[], totalActiveTasks: number) {
  const overloadedMembers = members.filter((member) => member.loadStatus === 'overloaded').length;
  const stretchedMembers = members.filter((member) => member.loadStatus === 'stretched').length;
  const availableMembers = members.filter((member) => member.loadStatus === 'available').length;
  const avgLoadRatio =
    members.length > 0
      ? Number((members.reduce((total, member) => total + member.loadRatio, 0) / members.length).toFixed(2))
      : 0;

  return {
    totalMembers: members.length,
    overloadedMembers,
    stretchedMembers,
    availableMembers,
    totalActiveTasks,
    avgLoadRatio,
    overloadThreshold: OVERLOAD_ACTIVE_TASK_THRESHOLD,
  };
}

function buildProjectForecast(project: ProjectRow, tasks: PlanningTaskItem[], members: WorkloadMemberSummary[]) {
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((task) => task.trang_thai === 'done').length;
  const openTasks = tasks.filter((task) => task.trang_thai !== 'done').length;
  const overdueTasks = tasks.filter(
    (task) => task.trang_thai !== 'done' && new Date(task.deadline).getTime() < now.getTime()
  );
  const highRiskTasks = tasks.filter((task) => task.trang_thai !== 'done' && task.risk_score >= 70);
  const unassignedTasks = tasks.filter((task) => task.trang_thai !== 'done' && !task.assignee_id);
  const dueThisWeek = tasks.filter((task) => {
    if (task.trang_thai === 'done') {
      return false;
    }

    const deadline = new Date(task.deadline);
    return deadline.getTime() >= now.getTime() && deadline.getTime() <= nextWeek.getTime();
  });

  const completionRate = totalTasks > 0 ? Number(((doneTasks / totalTasks) * 100).toFixed(1)) : 0;
  const overloadedMembers = members.filter(
    (member) => member.loadStatus === 'overloaded' || member.loadStatus === 'stretched'
  );
  const daysToDeadline = Math.ceil(
    (new Date(project.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  const overdueWeight = openTasks > 0 ? overdueTasks.length / openTasks : 0;
  const riskWeight = openTasks > 0 ? highRiskTasks.length / openTasks : 0;
  const staffingWeight = openTasks > 0 ? unassignedTasks.length / openTasks : 0;
  const deadlinePressure =
    daysToDeadline <= 0 ? 1 : Math.max(0, Number((1 - Math.min(daysToDeadline, 21) / 21).toFixed(2)));

  const rawSlipProbability =
    overdueWeight * 45 +
    riskWeight * 28 +
    staffingWeight * 18 +
    (overloadedMembers.length / Math.max(members.length || 1, 1)) * 20 +
    deadlinePressure * 14 -
    (completionRate / 100) * 12;

  const slipProbability = Math.max(8, Math.min(95, Math.round(rawSlipProbability)));
  const forecastStatus: ProjectForecastResult['forecastStatus'] =
    slipProbability >= 70 ? 'slipping' : slipProbability >= 45 ? 'watch' : 'on-track';

  const averageOverdueDays =
    overdueTasks.length > 0
      ? overdueTasks.reduce((total, task) => {
          const days = (now.getTime() - new Date(task.deadline).getTime()) / (1000 * 60 * 60 * 24);
          return total + Math.max(0, days);
        }, 0) / overdueTasks.length
      : 0;

  const projectedDelayDays =
    forecastStatus === 'on-track'
      ? 0
      : Math.max(
          1,
          Math.round(averageOverdueDays * 0.7 + overloadedMembers.length * 1.4 + highRiskTasks.length * 0.5)
        );

  const confidence = Math.max(52, Math.min(92, Math.round(60 + Math.min(totalTasks, 20) * 1.4 + Math.min(members.length, 8))));
  const reasons: string[] = [];

  if (overdueTasks.length > 0) {
    reasons.push(`${overdueTasks.length} task đã quá hạn nhưng chưa hoàn thành`);
  }

  if (highRiskTasks.length > 0) {
    reasons.push(`${highRiskTasks.length} task đang có rủi ro cao`);
  }

  if (unassignedTasks.length > 0) {
    reasons.push(`${unassignedTasks.length} task chưa có người phụ trách`);
  }

  if (overloadedMembers.length > 0) {
    reasons.push(`${overloadedMembers.length} thành viên đang ở trạng thái sát tải hoặc quá tải`);
  }

  if (dueThisWeek.length >= 4) {
    reasons.push('Khối lượng giao việc dồn vào 7 ngày tới khá dày');
  }

  if (reasons.length === 0) {
    reasons.push('Nhịp độ giao việc hiện vẫn trong ngưỡng kiểm soát');
  }

  return {
    project: {
      id: project.id,
      ten: project.ten,
      deadline: project.deadline,
      trang_thai: project.trang_thai,
      phan_tram_hoan_thanh: project.phan_tram_hoan_thanh || 0,
    },
    forecastStatus,
    slipProbability,
    projectedDelayDays,
    confidence,
    summary: {
      totalTasks,
      openTasks,
      doneTasks,
      overdueTasks: overdueTasks.length,
      highRiskTasks: highRiskTasks.length,
      unassignedTasks: unassignedTasks.length,
      dueThisWeek: dueThisWeek.length,
      overloadedMembers: overloadedMembers.length,
      completionRate,
    },
    reasons,
    topRisks: [...overdueTasks, ...highRiskTasks].slice(0, 5),
    overloadedMembers: overloadedMembers.slice(0, 5),
  } satisfies ProjectForecastResult;
}

function normalizePlanningTask(row: PlanningTaskRow): PlanningTaskItem {
  const assignee = pickOne(row.nguoi_dung);
  const part = pickOne(row.phan_du_an);
  const project = pickOne(part?.du_an);
  const department = pickOne(part?.phong_ban);

  return {
    id: row.id,
    ten: row.ten,
    mo_ta: row.mo_ta,
    deadline: row.deadline,
    priority: row.priority,
    trang_thai: row.trang_thai,
    progress: row.progress,
    risk_score: row.risk_score,
    assignee_id: row.assignee_id,
    assignee: assignee
      ? {
          id: assignee.id,
          ten: assignee.ten,
          email: assignee.email,
          avatar_url: assignee.avatar_url,
        }
      : null,
    project: project
      ? {
          id: project.id,
          ten: project.ten,
        }
      : null,
    part: part
      ? {
          id: part.id,
          ten: part.ten,
        }
      : null,
    department: department
      ? {
          id: department.id,
          ten: department.ten,
        }
      : null,
  };
}

async function getPlanningTasksForProjects({
  projectIds,
  assigneeId,
  dateFrom,
  dateTo,
}: {
  projectIds: string[];
  assigneeId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}) {
  const partIds = await getPartIdsForProjects(projectIds);

  if (partIds.length === 0) {
    return [] as PlanningTaskItem[];
  }

  let query = supabaseAdmin
    .from('task')
    .select(
      `
      id,
      ten,
      mo_ta,
      deadline,
      priority,
      trang_thai,
      progress,
      risk_score,
      assignee_id,
      phan_du_an_id,
      nguoi_dung:assignee_id (
        id,
        ten,
        email,
        avatar_url
      ),
      phan_du_an (
        id,
        ten,
        du_an_id,
        du_an:du_an_id (
          id,
          ten
        ),
        phong_ban:phong_ban_id (
          id,
          ten
        )
      )
    `
    )
    .in('phan_du_an_id', partIds)
    .is('deleted_at', null)
    .order('deadline', { ascending: true });

  if (assigneeId) {
    query = query.eq('assignee_id', assigneeId);
  }

  if (dateFrom) {
    query = query.gte('deadline', dateFrom);
  }

  if (dateTo) {
    query = query.lte('deadline', dateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => normalizePlanningTask(row as PlanningTaskRow));
}

export async function getCalendarPlanningData({
  email,
  projectId,
  assigneeId,
  dateFrom,
  dateTo,
}: {
  email: string;
  projectId?: string | null;
  assigneeId?: string | null;
  dateFrom: string;
  dateTo: string;
}): Promise<CalendarPlanningResult> {
  const projectIds = await getAccessibleProjectIds(email, projectId);

  if (projectIds.length === 0) {
    return {
      range: { dateFrom, dateTo },
      items: [],
      summary: {
        totalTasks: 0,
        overdueTasks: 0,
        upcomingTasks: 0,
        highRiskTasks: 0,
      },
    };
  }

  const items = await getPlanningTasksForProjects({
    projectIds,
    assigneeId,
    dateFrom,
    dateTo,
  });
  const now = new Date();
  const upcomingBoundary = new Date();
  upcomingBoundary.setDate(upcomingBoundary.getDate() + 7);

  return {
    range: { dateFrom, dateTo },
    items,
    summary: {
      totalTasks: items.length,
      overdueTasks: items.filter(
        (task) => task.trang_thai !== 'done' && new Date(task.deadline).getTime() < now.getTime()
      ).length,
      upcomingTasks: items.filter((task) => {
        if (task.trang_thai === 'done') {
          return false;
        }

        const deadline = new Date(task.deadline);
        return deadline.getTime() >= now.getTime() && deadline.getTime() <= upcomingBoundary.getTime();
      }).length,
      highRiskTasks: items.filter((task) => task.trang_thai !== 'done' && task.risk_score >= 70).length,
    },
  };
}

export async function getWorkloadPlanningData({
  email,
  projectId,
  assigneeId,
}: {
  email: string;
  projectId?: string | null;
  assigneeId?: string | null;
}): Promise<WorkloadPlanningResult> {
  const projectIds = await getAccessibleProjectIds(email, projectId);

  if (projectIds.length === 0) {
    return {
      summary: {
        totalMembers: 0,
        overloadedMembers: 0,
        stretchedMembers: 0,
        availableMembers: 0,
        totalActiveTasks: 0,
        avgLoadRatio: 0,
        overloadThreshold: OVERLOAD_ACTIVE_TASK_THRESHOLD,
      },
      members: [],
    };
  }

  const tasks = await getPlanningTasksForProjects({ projectIds });
  const activeTasks = tasks.filter((task) => task.trang_thai !== 'done');

  let membersQuery = supabaseAdmin
    .from('thanh_vien_du_an')
    .select(
      `
      du_an_id,
      nguoi_dung_id,
      email,
      vai_tro,
      nguoi_dung:nguoi_dung_id (
        id,
        ten,
        email,
        avatar_url,
        phong_ban:phong_ban_id (
          ten
        )
      )
    `
    )
    .in('du_an_id', projectIds)
    .eq('trang_thai', 'active')
    .not('nguoi_dung_id', 'is', null);

  if (assigneeId) {
    membersQuery = membersQuery.eq('nguoi_dung_id', assigneeId);
  }

  const { data: memberRows, error: memberError } = await membersQuery;

  if (memberError) {
    throw new Error(memberError.message);
  }

  const members = summarizeMemberWorkload((memberRows || []) as MemberRow[], activeTasks);

  return {
    summary: summarizeWorkloadOverview(members, activeTasks.length),
    members,
  };
}

export async function getProjectForecast({
  email,
  projectId,
}: {
  email: string;
  projectId: string;
}): Promise<ProjectForecastResult> {
  const projectIds = await getAccessibleProjectIds(email, projectId);

  if (projectIds.length === 0) {
    throw new Error('Bạn không có quyền truy cập dự án này');
  }

  const [projectResult, tasks, memberRowsResult] = await Promise.all([
    supabaseAdmin
      .from('du_an')
      .select('id, ten, deadline, trang_thai, phan_tram_hoan_thanh')
      .eq('id', projectId)
      .is('deleted_at', null)
      .single(),
    getPlanningTasksForProjects({ projectIds: [projectId] }),
    supabaseAdmin
      .from('thanh_vien_du_an')
      .select(
        `
        du_an_id,
        nguoi_dung_id,
        email,
        vai_tro,
        nguoi_dung:nguoi_dung_id (
          id,
          ten,
          email,
          avatar_url,
          phong_ban:phong_ban_id (
            ten
          )
        )
      `
      )
      .eq('du_an_id', projectId)
      .eq('trang_thai', 'active')
      .not('nguoi_dung_id', 'is', null),
  ]);

  if (projectResult.error || !projectResult.data) {
    throw new Error('Không tìm thấy dự án');
  }

  if (memberRowsResult.error) {
    throw new Error(memberRowsResult.error.message);
  }

  const activeTasks = tasks.filter((task) => task.trang_thai !== 'done');
  const members = summarizeMemberWorkload((memberRowsResult.data || []) as MemberRow[], activeTasks);

  return buildProjectForecast(projectResult.data as ProjectRow, tasks, members);
}

export async function getProjectHealthSummaries(projectIds: string[]): Promise<ProjectHealthSummary[]> {
  if (projectIds.length === 0) {
    return [];
  }

  const [projectsResult, tasks, memberRowsResult] = await Promise.all([
    supabaseAdmin
      .from('du_an')
      .select('id, ten, deadline, trang_thai, phan_tram_hoan_thanh')
      .in('id', projectIds)
      .is('deleted_at', null),
    getPlanningTasksForProjects({ projectIds }),
    supabaseAdmin
      .from('thanh_vien_du_an')
      .select(
        `
        du_an_id,
        nguoi_dung_id,
        email,
        vai_tro,
        nguoi_dung:nguoi_dung_id (
          id,
          ten,
          email,
          avatar_url,
          phong_ban:phong_ban_id (
            ten
          )
        )
      `
      )
      .in('du_an_id', projectIds)
      .eq('trang_thai', 'active')
      .not('nguoi_dung_id', 'is', null),
  ]);

  if (projectsResult.error) {
    throw new Error(projectsResult.error.message);
  }

  if (memberRowsResult.error) {
    throw new Error(memberRowsResult.error.message);
  }

  const tasksByProject = groupTasksByProject(tasks);
  const memberRowsByProject = new Map<string, MemberRow[]>();

  for (const row of (memberRowsResult.data || []) as MemberRow[]) {
    const currentRows = memberRowsByProject.get(row.du_an_id) || [];
    currentRows.push(row);
    memberRowsByProject.set(row.du_an_id, currentRows);
  }

  return ((projectsResult.data || []) as ProjectRow[])
    .map((project) => {
      const projectTasks = tasksByProject.get(project.id) || [];
      const activeProjectTasks = projectTasks.filter((task) => task.trang_thai !== 'done');
      const members = summarizeMemberWorkload(memberRowsByProject.get(project.id) || [], activeProjectTasks);
      const forecast = buildProjectForecast(project, projectTasks, members);

      return {
        id: forecast.project.id,
        ten: forecast.project.ten,
        forecastStatus: forecast.forecastStatus,
        slipProbability: forecast.slipProbability,
        projectedDelayDays: forecast.projectedDelayDays,
        completionRate: forecast.summary.completionRate,
        overdueTasks: forecast.summary.overdueTasks,
      };
    })
    .sort((left, right) => right.slipProbability - left.slipProbability);
}
