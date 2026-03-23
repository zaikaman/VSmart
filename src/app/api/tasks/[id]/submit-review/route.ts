import { NextResponse } from 'next/server';
import { canTransitionReviewStatus, hasPermission } from '@/lib/auth/permissions';
import { logTaskActivity } from '@/lib/activity/log';
import { getTaskAccessContext, toErrorResponse } from '@/lib/tasks/auth';
import { supabaseAdmin } from '@/lib/supabase/client';
import { updatePhanDuAnProgress } from '@/lib/tasks/progress';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reviewRequestComment =
      typeof body.review_request_comment === 'string' && body.review_request_comment.trim().length > 0
        ? body.review_request_comment.trim()
        : typeof body.review_comment === 'string' && body.review_comment.trim().length > 0
          ? body.review_comment.trim()
          : null;

    const auth = await getTaskAccessContext(id);
    const canSubmit = hasPermission(
      {
        appRole: auth.dbUser.vai_tro as 'admin' | 'manager' | 'member',
        projectRole: auth.membership.vai_tro as 'owner' | 'admin' | 'member' | 'viewer',
        isAssignee: auth.taskData.assignee_id === auth.dbUser.id,
      },
      'submitReview'
    );

    if (!canSubmit) {
      return NextResponse.json({ error: 'Bạn không có quyền gửi duyệt task này' }, { status: 403 });
    }

    const { data: task, error: taskError } = await supabaseAdmin
      .from('task')
      .select('id, ten, trang_thai, progress, progress_mode, review_status, phan_du_an_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Không tìm thấy task' }, { status: 404 });
    }

    if (!canTransitionReviewStatus({ currentStatus: task.review_status, nextStatus: 'pending_review' })) {
      return NextResponse.json({ error: 'Task hiện chưa thể chuyển sang chờ duyệt' }, { status: 400 });
    }

    const isChecklistTask = task.progress_mode === 'checklist';
    const isReadyForReview = isChecklistTask
      ? task.progress >= 100
      : task.trang_thai === 'done' || task.progress >= 100;

    if (!isReadyForReview) {
      return NextResponse.json(
        {
          error: isChecklistTask
            ? 'Task checklist chỉ có thể gửi duyệt khi đã hoàn tất toàn bộ checklist'
            : 'Task chỉ có thể gửi duyệt khi đã chuyển sang Hoàn thành',
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('task')
      .update({
        review_status: 'pending_review',
        progress: task.progress_mode === 'checklist' ? task.progress : 90,
        submitted_for_review_at: now,
        review_request_comment: reviewRequestComment,
        reviewed_by: null,
        reviewed_at: null,
        review_comment: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedTask) {
      return NextResponse.json({ error: 'Không thể gửi task sang hàng chờ duyệt' }, { status: 400 });
    }

    if (task.phan_du_an_id) {
      await updatePhanDuAnProgress(task.phan_du_an_id);
    }

    const { data: approvers } = await supabaseAdmin
      .from('thanh_vien_du_an')
      .select('nguoi_dung_id')
      .eq('du_an_id', auth.projectId)
      .in('vai_tro', ['owner', 'admin', 'member'])
      .eq('trang_thai', 'active');

    const recipientIds = (approvers || [])
      .map((item) => item.nguoi_dung_id)
      .filter((value): value is string => Boolean(value) && value !== auth.dbUser.id);

    if (recipientIds.length > 0) {
      await supabaseAdmin.from('thong_bao').insert(
        recipientIds.map((nguoi_dung_id) => ({
          nguoi_dung_id,
          loai: 'assignment',
          noi_dung: `${auth.dbUser.ten} vừa gửi task "${task.ten}" để chờ duyệt.`,
          task_lien_quan_id: task.id,
          du_an_lien_quan_id: auth.projectId,
        }))
      );
    }

    await logTaskActivity({
      taskId: id,
      actorId: auth.dbUser.id,
      action: 'review_submitted',
      previousValue: {
        review_status: task.review_status,
      },
      nextValue: {
        review_status: 'pending_review',
        submitted_for_review_at: now,
        review_request_comment: reviewRequestComment,
      },
      metadata: {
        projectId: auth.projectId,
        partId: task.phan_du_an_id,
        taskName: task.ten,
        reviewRequestComment: reviewRequestComment,
      },
    });

    return NextResponse.json({
      message: 'Task đã được gửi sang hàng chờ duyệt',
      data: updatedTask,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
