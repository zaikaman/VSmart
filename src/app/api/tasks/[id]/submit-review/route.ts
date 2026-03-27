import { NextResponse } from 'next/server';
import { z } from 'zod';
import { canTransitionReviewStatus, hasPermission } from '@/lib/auth/permissions';
import { logTaskActivity } from '@/lib/activity/log';
import { sendTaskReviewSubmittedEmail } from '@/lib/email/workflow';
import { getTaskAccessContext, toErrorResponse } from '@/lib/tasks/auth';
import { supabaseAdmin } from '@/lib/supabase/client';
import { updatePhanDuAnProgress } from '@/lib/tasks/progress';

const submitReviewSchema = z
  .object({
    review_request_comment: z.string().trim().max(1000, 'Nhận xét yêu cầu duyệt không được vượt quá 1000 ký tự.').optional(),
    review_comment: z.string().trim().max(1000, 'Nhận xét duyệt không được vượt quá 1000 ký tự.').optional(),
  })
  .strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const validatedBody = submitReviewSchema.parse(body);
    const reviewRequestComment =
      typeof validatedBody.review_request_comment === 'string' && validatedBody.review_request_comment.length > 0
        ? validatedBody.review_request_comment
        : typeof validatedBody.review_comment === 'string' && validatedBody.review_comment.length > 0
          ? validatedBody.review_comment
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
      .select(
        `
          id,
          ten,
          trang_thai,
          progress,
          progress_mode,
          requires_review,
          review_status,
          phan_du_an_id,
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

    if (!canTransitionReviewStatus({ currentStatus: task.review_status, nextStatus: 'pending_review' })) {
      return NextResponse.json({ error: 'Task hiện chưa thể chuyển sang chờ duyệt' }, { status: 400 });
    }

    if (!task.requires_review) {
      return NextResponse.json({ error: 'Task này không yêu cầu bước duyệt trước khi hoàn thành' }, { status: 400 });
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
      .select(
        `
          nguoi_dung_id,
          nguoi_dung:nguoi_dung_id (
            ten,
            email
          )
        `
      )
      .eq('du_an_id', auth.projectId)
      .in('vai_tro', ['owner', 'admin', 'member'])
      .eq('trang_thai', 'active');

    const recipients = (approvers || [])
      .map((item) => ({
        userId: item.nguoi_dung_id,
        user: Array.isArray(item.nguoi_dung) ? item.nguoi_dung[0] : item.nguoi_dung,
      }))
      .filter((item) => Boolean(item.userId) && item.userId !== auth.dbUser.id);

    if (recipients.length > 0) {
      await supabaseAdmin.from('thong_bao').insert(
        recipients.map((item) => ({
          nguoi_dung_id: item.userId,
          loai: 'assignment',
          noi_dung: `${auth.dbUser.ten} vừa gửi task "${task.ten}" để chờ duyệt.`,
          task_lien_quan_id: task.id,
          du_an_lien_quan_id: auth.projectId,
        }))
      );

      const partRelation = Array.isArray(task.phan_du_an) ? task.phan_du_an[0] : task.phan_du_an;
      const projectRelation = Array.isArray(partRelation?.du_an) ? partRelation.du_an[0] : partRelation?.du_an;
      const projectName = projectRelation?.ten || 'Dự án';
      const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/kanban?taskId=${task.id}`;

      await Promise.allSettled(
        recipients
          .filter((item) => item.user?.email)
          .map((item) =>
            sendTaskReviewSubmittedEmail({
              to: item.user.email,
              recipientName: item.user.ten || item.user.email,
              submitterName: auth.dbUser.ten,
              taskName: task.ten,
              projectName,
              reviewUrl,
              reviewRequestComment,
            })
          )
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
        reviewRequestComment,
      },
    });

    return NextResponse.json({
      message: 'Task đã được gửi sang hàng chờ duyệt',
      data: updatedTask,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }

    return toErrorResponse(error);
  }
}
