import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getCalendarPlanningData,
  getProjectHealthSummaries,
  getWorkloadPlanningData,
} from '@/lib/planning/planning-service';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('id, to_chuc_id')
      .eq('email', user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    const [membershipsResult, userCountResult] = await Promise.all([
      supabase
        .from('thanh_vien_du_an')
        .select('du_an_id')
        .eq('email', user.email)
        .eq('trang_thai', 'active'),
      supabase
        .from('nguoi_dung')
        .select('id', { count: 'exact', head: true })
        .eq('to_chuc_id', userData.to_chuc_id),
    ]);

    const projectIds = Array.from(new Set(membershipsResult.data?.map((membership) => membership.du_an_id) || []));

    let inProgressTasks = 0;
    if (projectIds.length > 0) {
      const { data: parts, error: partsError } = await supabase
        .from('phan_du_an')
        .select('id')
        .in('du_an_id', projectIds)
        .is('deleted_at', null);

      if (!partsError && parts && parts.length > 0) {
        const partIds = parts.map((part) => part.id);
        const { count } = await supabase
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
        email: user.email || '',
        dateFrom: rangeStart.toISOString(),
        dateTo: rangeEnd.toISOString(),
      }),
      getWorkloadPlanningData({
        email: user.email || '',
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

    return NextResponse.json({
      data: {
        totalProjects: projectIds.length,
        inProgressTasks,
        totalUsers: userCountResult.count || 0,
        overdueTasks: planningCalendar.summary.overdueTasks,
        upcomingDeadlines,
        workloadSummary: workload.summary,
        riskTrends,
        overloadedMembers,
        riskyProjects: normalizedRiskyProjects,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
