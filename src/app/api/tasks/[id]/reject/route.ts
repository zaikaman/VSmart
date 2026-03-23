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
    const auth = await getTaskAccessContext(id);
    const canReject = hasPermission(
      {
        appRole: auth.dbUser.vai_tro as 'admin' | 'manager' | 'member',
        projectRole: auth.membership.vai_tro as 'owner' | 'admin' | 'member' | 'viewer',
        isAssignee: auth.taskData.assignee_id === auth.dbUser.id,
      },
      'rejectTask'
    );

    if (!canReject) {
      return NextResponse.json({ error: 'Bạn không có quyền từ chối task này' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const reviewComment =
      typeof body.review_comment === 'string' && body.review_comment.trim().length > 0
        ? body.review_comment.trim()
        : '';

    if (!reviewComment) {
      return NextResponse.json({ error: 'Vui lòng nhập nhận xét khi yêu cầu chỉnh sửa' }, { status: 400 });
    }

    const { data: task, error: taskError } = await supabaseAdmin
      .from('task')
      .select('id, ten, assignee_id, progress_mode, review_status, phan_du_an_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Không tìm thấy task' }, { status: 404 });
    }

    if (!canTransitionReviewStatus({ currentStatus: task.review_status, nextStatus: 'changes_requested' })) {
      return NextResponse.json({ error: 'Task hiện không ở trạng thái chờ duyệt' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('task')
      .update({
        review_status: 'changes_requested',
        ...(task.progress_mode === 'checklist'
          ? {
              trang_thai: 'in-progress',
            }
          : {
              trang_thai: 'in-progress',
              progress: 50,
            }),
        reviewed_by: auth.dbUser.id,
        reviewed_at: now,
        review_comment: reviewComment,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedTask) {
      return NextResponse.json({ error: 'Không thể trả lại task' }, { status: 400 });
    }

    if (task.phan_du_an_id) {
      await updatePhanDuAnProgress(task.phan_du_an_id);
    }

    if (task.assignee_id && task.assignee_id !== auth.dbUser.id) {
      await supabaseAdmin.from('thong_bao').insert({
        nguoi_dung_id: task.assignee_id,
        loai: 'assignment',
        noi_dung: `Task "${task.ten}" cần chỉnh sửa: ${reviewComment}`,
        task_lien_quan_id: task.id,
        du_an_lien_quan_id: auth.projectId,
      });
    }

    await logTaskActivity({
      taskId: id,
      actorId: auth.dbUser.id,
      action: 'review_rejected',
      previousValue: {
        review_status: task.review_status,
      },
      nextValue: {
        review_status: 'changes_requested',
        review_comment: reviewComment,
      },
      metadata: {
        projectId: auth.projectId,
        partId: task.phan_du_an_id,
        taskName: task.ten,
      },
    });

    return NextResponse.json({
      message: 'Task đã được trả lại để chỉnh sửa',
      data: updatedTask,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
