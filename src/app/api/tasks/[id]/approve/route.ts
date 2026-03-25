import { NextResponse } from 'next/server';
import { canTransitionReviewStatus, hasPermission } from '@/lib/auth/permissions';
import { logTaskActivity } from '@/lib/activity/log';
import { sendTaskReviewDecisionEmail } from '@/lib/email/workflow';
import { getTaskAccessContext, toErrorResponse } from '@/lib/tasks/auth';
import { supabaseAdmin } from '@/lib/supabase/client';
import { updatePhanDuAnProgress } from '@/lib/tasks/progress';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getTaskAccessContext(id);
    const canApprove = hasPermission(
      {
        appRole: auth.dbUser.vai_tro as 'admin' | 'manager' | 'member',
        projectRole: auth.membership.vai_tro as 'owner' | 'admin' | 'member' | 'viewer',
        isAssignee: auth.taskData.assignee_id === auth.dbUser.id,
      },
      'approveTask'
    );

    if (!canApprove) {
      return NextResponse.json({ error: 'Bạn không có quyền duyệt task này' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const reviewComment =
      typeof body.review_comment === 'string' && body.review_comment.trim().length > 0
        ? body.review_comment.trim()
        : null;

    const { data: task, error: taskError } = await supabaseAdmin
      .from('task')
      .select(
        `
          id,
          ten,
          assignee_id,
          progress_mode,
          requires_review,
          review_status,
          phan_du_an_id,
          nguoi_dung:assignee_id (
            ten,
            email
          ),
          phan_du_an (
            du_an (
              ten
            )
          )
        `
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Không tìm thấy task' }, { status: 404 });
    }

    if (!canTransitionReviewStatus({ currentStatus: task.review_status, nextStatus: 'approved' })) {
      return NextResponse.json({ error: 'Task hiện không ở trạng thái chờ duyệt' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('task')
      .update({
        review_status: 'approved',
        ...(task.progress_mode === 'checklist'
          ? { trang_thai: 'done', progress: 100 }
          : { progress: 100 }),
        reviewed_by: auth.dbUser.id,
        reviewed_at: now,
        review_comment: reviewComment,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedTask) {
      return NextResponse.json({ error: 'Không thể duyệt task' }, { status: 400 });
    }

    if (task.phan_du_an_id) {
      await updatePhanDuAnProgress(task.phan_du_an_id);
    }

    if (task.assignee_id && task.assignee_id !== auth.dbUser.id) {
      await supabaseAdmin.from('thong_bao').insert({
        nguoi_dung_id: task.assignee_id,
        loai: 'assignment',
        noi_dung: `Task "${task.ten}" đã được duyệt${reviewComment ? `: ${reviewComment}` : '.'}`,
        task_lien_quan_id: task.id,
        du_an_lien_quan_id: auth.projectId,
      });

      const assignee = Array.isArray(task.nguoi_dung) ? task.nguoi_dung[0] : task.nguoi_dung;
      const partRelation = Array.isArray(task.phan_du_an) ? task.phan_du_an[0] : task.phan_du_an;
      const projectRelation = Array.isArray(partRelation?.du_an) ? partRelation.du_an[0] : partRelation?.du_an;

      if (assignee?.email) {
        sendTaskReviewDecisionEmail({
          to: assignee.email,
          recipientName: assignee.ten || assignee.email,
          reviewerName: auth.dbUser.ten,
          taskName: task.ten,
          projectName: projectRelation?.ten || 'Dự án',
          reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/kanban?taskId=${task.id}`,
          decision: 'approved',
          reviewComment,
        }).catch((emailError) =>
          console.error('Error sending task approval email:', emailError)
        );
      }
    }

    await logTaskActivity({
      taskId: id,
      actorId: auth.dbUser.id,
      action: 'review_approved',
      previousValue: {
        review_status: task.review_status,
      },
      nextValue: {
        review_status: 'approved',
        review_comment: reviewComment,
      },
      metadata: {
        projectId: auth.projectId,
        partId: task.phan_du_an_id,
        taskName: task.ten,
      },
    });

    return NextResponse.json({
      message: 'Task đã được duyệt',
      data: updatedTask,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
