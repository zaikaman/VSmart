import { supabaseAdmin } from '@/lib/supabase/client';
import { getProjectForecast, getWorkloadPlanningData, type WorkloadMemberSummary } from '@/lib/planning/planning-service';

type RiskBucket = 'low' | 'medium' | 'high';

interface AnalyticsTaskRow {
  id: string;
  ten: string;
  deadline: string;
  ngay_tao: string;
  cap_nhat_cuoi: string;
  trang_thai: 'todo' | 'in-progress' | 'done';
  risk_score: number;
  assignee_id: string | null;
  phan_du_an?: {
    du_an_id: string;
    du_an?: {
      id: string;
      ten: string;
    } | {
      id: string;
      ten: string;
    }[] | null;
  } | {
    du_an_id: string;
    du_an?: {
      id: string;
      ten: string;
    } | {
      id: string;
      ten: string;
    }[] | null;
  }[] | null;
}

interface ProjectRow {
  id: string;
  ten: string;
  deadline: string;
  trang_thai: string;
  phan_tram_hoan_thanh: number;
}

export interface AnalyticsOverviewResult {
  summary: {
    totalProjects: number;
    totalTasks: number;
    completionRate: number;
    overdueRate: number;
    averageLeadTimeDays: number;
    avgLoadRatio: number;
  };
  completionTrend: Array<{
    label: string;
    completed: number;
  }>;
  overdueTrend: Array<{
    label: string;
    overdue: number;
  }>;
  riskDistribution: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  topOverloadedMembers: WorkloadMemberSummary[];
  projectHealth: Array<{
    id: string;
    ten: string;
    completionRate: number;
    overdueTasks: number;
    slipProbability: number;
    status: 'on-track' | 'watch' | 'slipping';
  }>;
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

async function getAccessibleProjectIds(email: string) {
  const { data, error } = await supabaseAdmin
    .from('thanh_vien_du_an')
    .select('du_an_id')
    .eq('email', email)
    .eq('trang_thai', 'active');

  if (error) {
    throw new Error(error.message);
  }

  return Array.from(new Set((data || []).map((item) => item.du_an_id)));
}

function getRiskBucket(riskScore: number): RiskBucket {
  if (riskScore >= 70) {
    return 'high';
  }
  if (riskScore >= 40) {
    return 'medium';
  }
  return 'low';
}

function getWeekBuckets(weeks = 8) {
  const buckets: Array<{ start: Date; end: Date; label: string }> = [];
  const today = new Date();

  for (let index = weeks - 1; index >= 0; index -= 1) {
    const end = new Date(today);
    end.setDate(today.getDate() - index * 7);

    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    buckets.push({
      start,
      end,
      label: `${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`,
    });
  }

  return buckets;
}

export async function getAnalyticsOverview(email: string): Promise<AnalyticsOverviewResult> {
  const projectIds = await getAccessibleProjectIds(email);

  if (projectIds.length === 0) {
    return {
      summary: {
        totalProjects: 0,
        totalTasks: 0,
        completionRate: 0,
        overdueRate: 0,
        averageLeadTimeDays: 0,
        avgLoadRatio: 0,
      },
      completionTrend: [],
      overdueTrend: [],
      riskDistribution: [
        { label: 'Rủi ro thấp', value: 0, color: '#4ade80' },
        { label: 'Rủi ro trung bình', value: 0, color: '#fbbf24' },
        { label: 'Rủi ro cao', value: 0, color: '#fb7185' },
      ],
      topOverloadedMembers: [],
      projectHealth: [],
    };
  }

  const [{ data: projects }, { data: tasks }, workload] = await Promise.all([
    supabaseAdmin
      .from('du_an')
      .select('id, ten, deadline, trang_thai, phan_tram_hoan_thanh')
      .in('id', projectIds)
      .is('deleted_at', null),
    supabaseAdmin
      .from('task')
      .select(
        `
          id,
          ten,
          deadline,
          ngay_tao,
          cap_nhat_cuoi,
          trang_thai,
          risk_score,
          assignee_id,
          phan_du_an (
            du_an_id,
            du_an:du_an_id (
              id,
              ten
            )
          )
        `
      )
      .is('deleted_at', null)
      .in(
        'phan_du_an_id',
        (
          await supabaseAdmin
            .from('phan_du_an')
            .select('id')
            .in('du_an_id', projectIds)
            .is('deleted_at', null)
        ).data?.map((item) => item.id) || []
      ),
    getWorkloadPlanningData({ email }),
  ]);

  const projectRows = (projects || []) as ProjectRow[];
  const taskRows = (tasks || []) as AnalyticsTaskRow[];
  const now = new Date();
  const openTasks = taskRows.filter((task) => task.trang_thai !== 'done');
  const doneTasks = taskRows.filter((task) => task.trang_thai === 'done');
  const overdueTasks = openTasks.filter((task) => new Date(task.deadline).getTime() < now.getTime());

  const completionRate =
    taskRows.length > 0 ? Number(((doneTasks.length / taskRows.length) * 100).toFixed(1)) : 0;
  const overdueRate =
    openTasks.length > 0 ? Number(((overdueTasks.length / openTasks.length) * 100).toFixed(1)) : 0;
  const averageLeadTimeDays =
    doneTasks.length > 0
      ? Number(
          (
            doneTasks.reduce((total, task) => {
              const start = new Date(task.ngay_tao).getTime();
              const end = new Date(task.cap_nhat_cuoi).getTime();
              return total + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
            }, 0) / doneTasks.length
          ).toFixed(1)
        )
      : 0;

  const riskCounts = taskRows.reduce(
    (acc, task) => {
      const bucket = getRiskBucket(task.risk_score || 0);
      acc[bucket] += 1;
      return acc;
    },
    { low: 0, medium: 0, high: 0 }
  );

  const weekBuckets = getWeekBuckets();
  const completionTrend = weekBuckets.map((bucket) => ({
    label: bucket.label,
    completed: doneTasks.filter((task) => {
      const completedAt = new Date(task.cap_nhat_cuoi).getTime();
      return completedAt >= bucket.start.getTime() && completedAt <= bucket.end.getTime();
    }).length,
  }));

  const overdueTrend = weekBuckets.map((bucket) => ({
    label: bucket.label,
    overdue: openTasks.filter((task) => new Date(task.deadline).getTime() <= bucket.end.getTime()).length,
  }));

  const forecasts = await Promise.all(
    projectRows.slice(0, 8).map(async (project) => {
      try {
        return await getProjectForecast({ email, projectId: project.id });
      } catch {
        return null;
      }
    })
  );

  const projectHealth = forecasts
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((forecast) => ({
      id: forecast.project.id,
      ten: forecast.project.ten,
      completionRate: forecast.summary.completionRate,
      overdueTasks: forecast.summary.overdueTasks,
      slipProbability: forecast.slipProbability,
      status: forecast.forecastStatus,
    }))
    .sort((a, b) => b.slipProbability - a.slipProbability);

  return {
    summary: {
      totalProjects: projectRows.length,
      totalTasks: taskRows.length,
      completionRate,
      overdueRate,
      averageLeadTimeDays,
      avgLoadRatio: Number(((workload.summary.avgLoadRatio || 0) * 100).toFixed(1)),
    },
    completionTrend,
    overdueTrend,
    riskDistribution: [
      { label: 'Rủi ro thấp', value: riskCounts.low, color: '#4ade80' },
      { label: 'Rủi ro trung bình', value: riskCounts.medium, color: '#fbbf24' },
      { label: 'Rủi ro cao', value: riskCounts.high, color: '#fb7185' },
    ],
    topOverloadedMembers: workload.members
      .filter((member) => member.loadStatus === 'overloaded' || member.loadStatus === 'stretched')
      .slice(0, 5),
    projectHealth,
  };
}

export async function buildAnalyticsCsv(email: string) {
  const overview = await getAnalyticsOverview(email);
  const rows = [
    ['Nhóm chỉ số', 'Tên', 'Giá trị'],
    ['Tổng quan', 'Tổng dự án', String(overview.summary.totalProjects)],
    ['Tổng quan', 'Tổng task', String(overview.summary.totalTasks)],
    ['Tổng quan', 'Tỷ lệ hoàn thành (%)', String(overview.summary.completionRate)],
    ['Tổng quan', 'Tỷ lệ quá hạn (%)', String(overview.summary.overdueRate)],
    ['Tổng quan', 'Lead time trung bình (ngày)', String(overview.summary.averageLeadTimeDays)],
    ['Tổng quan', 'Tải trung bình (%)', String(overview.summary.avgLoadRatio)],
    ...overview.projectHealth.map((project) => [
      'Dự án',
      project.ten,
      `Hoàn thành ${project.completionRate}% | Quá hạn ${project.overdueTasks} | Slip ${project.slipProbability}%`,
    ]),
    ...overview.topOverloadedMembers.map((member) => [
      'Nhân sự',
      member.ten,
      `${member.activeTasks} task mở | ${Math.round(member.loadRatio * 100)}% tải`,
    ]),
  ];

  return rows
    .map((row) =>
      row
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(',')
    )
    .join('\n');
}
