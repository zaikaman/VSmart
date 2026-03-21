import { supabaseAdmin } from '@/lib/supabase/client';
import {
  getProjectForecast,
  getWorkloadPlanningData,
  type ProjectForecastResult,
  type WorkloadPlanningResult,
} from '@/lib/planning/planning-service';

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type TaskStatus = 'todo' | 'in-progress' | 'done';

interface TaskRow {
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
  ngay_tao: string;
  cap_nhat_cuoi: string;
  nguoi_dung?:
    | {
        id: string;
        ten: string;
        email: string;
        avatar_url: string | null;
      }
    | {
        id: string;
        ten: string;
        email: string;
        avatar_url: string | null;
      }[]
    | null;
  phan_du_an?:
    | {
        id: string;
        ten: string;
        du_an_id: string;
        du_an?: { id: string; ten: string } | { id: string; ten: string }[] | null;
      }
    | {
        id: string;
        ten: string;
        du_an_id: string;
        du_an?: { id: string; ten: string } | { id: string; ten: string }[] | null;
      }[]
    | null;
}

export interface InsightTask {
  id: string;
  ten: string;
  mo_ta: string | null;
  deadline: string;
  priority: TaskPriority;
  trang_thai: TaskStatus;
  progress: number;
  risk_score: number;
  assignee_id: string | null;
  assignee_name: string | null;
  project_id: string | null;
  project_name: string | null;
  part_id: string | null;
  part_name: string | null;
  ngay_tao: string;
  cap_nhat_cuoi: string;
}

export interface InsightViewer {
  id: string;
  ten: string;
  email: string;
  vai_tro: 'admin' | 'manager' | 'member';
}

export interface InsightDataset {
  viewer: InsightViewer;
  generated_at: string;
  project_id: string | null;
  project_ids: string[];
  tasks: InsightTask[];
  open_tasks: InsightTask[];
  overdue_tasks: InsightTask[];
  due_soon_tasks: InsightTask[];
  high_risk_tasks: InsightTask[];
  recently_completed_tasks: InsightTask[];
  workload: WorkloadPlanningResult;
  forecasts: ProjectForecastResult[];
  summary: {
    totalTasks: number;
    openTasks: number;
    overdueTasks: number;
    dueSoonTasks: number;
    highRiskTasks: number;
    completedThisWindow: number;
    overloadedMembers: number;
    stretchedMembers: number;
    riskyProjects: number;
  };
  timeframe: {
    lookbackDays: number;
    lookaheadDays: number;
  };
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function normalizeTask(row: TaskRow): InsightTask {
  const assignee = pickOne(row.nguoi_dung);
  const part = pickOne(row.phan_du_an);
  const project = pickOne(part?.du_an);

  return {
    id: row.id,
    ten: row.ten,
    mo_ta: row.mo_ta,
    deadline: row.deadline,
    priority: row.priority,
    trang_thai: row.trang_thai,
    progress: row.progress || 0,
    risk_score: row.risk_score || 0,
    assignee_id: row.assignee_id,
    assignee_name: assignee?.ten || null,
    project_id: project?.id || null,
    project_name: project?.ten || null,
    part_id: part?.id || null,
    part_name: part?.ten || null,
    ngay_tao: row.ngay_tao,
    cap_nhat_cuoi: row.cap_nhat_cuoi,
  };
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

async function getTaskRows(projectIds: string[]) {
  if (projectIds.length === 0) {
    return [] as InsightTask[];
  }

  const { data: parts, error: partError } = await supabaseAdmin
    .from('phan_du_an')
    .select('id')
    .in('du_an_id', projectIds)
    .is('deleted_at', null);

  if (partError) {
    throw new Error(partError.message);
  }

  const partIds = (parts || []).map((item) => item.id);

  if (partIds.length === 0) {
    return [] as InsightTask[];
  }

  const { data: tasks, error: taskError } = await supabaseAdmin
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
      ngay_tao,
      cap_nhat_cuoi,
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
        )
      )
    `
    )
    .in('phan_du_an_id', partIds)
    .is('deleted_at', null)
    .order('deadline', { ascending: true });

  if (taskError) {
    throw new Error(taskError.message);
  }

  return (tasks || []).map((task) => normalizeTask(task as TaskRow));
}

export async function buildInsightDataset({
  email,
  projectId,
  lookbackDays = 7,
  lookaheadDays = 7,
}: {
  email: string;
  projectId?: string | null;
  lookbackDays?: number;
  lookaheadDays?: number;
}): Promise<InsightDataset> {
  const { data: viewer, error: viewerError } = await supabaseAdmin
    .from('nguoi_dung')
    .select('id, ten, email, vai_tro')
    .eq('email', email)
    .single();

  if (viewerError || !viewer) {
    throw new Error('Không tìm thấy thông tin người dùng');
  }

  const projectIds = await getAccessibleProjectIds(email, projectId);
  const tasks = await getTaskRows(projectIds);
  const workload = await getWorkloadPlanningData({ email, projectId });

  const forecasts = await Promise.all(
    projectIds.slice(0, projectId ? 1 : 6).map(async (id) => {
      try {
        return await getProjectForecast({ email, projectId: id });
      } catch {
        return null;
      }
    })
  ).then((items) => items.filter((item): item is ProjectForecastResult => Boolean(item)));

  const now = new Date();
  const completedBoundary = new Date();
  completedBoundary.setDate(completedBoundary.getDate() - lookbackDays);
  const dueBoundary = new Date();
  dueBoundary.setDate(dueBoundary.getDate() + lookaheadDays);

  const openTasks = tasks.filter((task) => task.trang_thai !== 'done');
  const overdueTasks = openTasks.filter((task) => new Date(task.deadline).getTime() < now.getTime());
  const dueSoonTasks = openTasks.filter((task) => {
    const deadline = new Date(task.deadline).getTime();
    return deadline >= now.getTime() && deadline <= dueBoundary.getTime();
  });
  const highRiskTasks = openTasks.filter((task) => task.risk_score >= 70);
  const recentlyCompletedTasks = tasks.filter(
    (task) =>
      task.trang_thai === 'done' &&
      new Date(task.cap_nhat_cuoi).getTime() >= completedBoundary.getTime()
  );

  return {
    viewer: {
      id: viewer.id,
      ten: viewer.ten,
      email: viewer.email,
      vai_tro: viewer.vai_tro,
    },
    generated_at: new Date().toISOString(),
    project_id: projectId || null,
    project_ids: projectIds,
    tasks,
    open_tasks: openTasks,
    overdue_tasks: overdueTasks,
    due_soon_tasks: dueSoonTasks,
    high_risk_tasks: highRiskTasks,
    recently_completed_tasks: recentlyCompletedTasks,
    workload,
    forecasts,
    summary: {
      totalTasks: tasks.length,
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      dueSoonTasks: dueSoonTasks.length,
      highRiskTasks: highRiskTasks.length,
      completedThisWindow: recentlyCompletedTasks.length,
      overloadedMembers: workload.summary.overloadedMembers,
      stretchedMembers: workload.summary.stretchedMembers,
      riskyProjects: forecasts.filter((item) => item.forecastStatus !== 'on-track').length,
    },
    timeframe: {
      lookbackDays,
      lookaheadDays,
    },
  };
}
