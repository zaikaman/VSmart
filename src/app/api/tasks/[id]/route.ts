import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { z } from 'zod';
import { sendTaskAssignedEmail, shouldSendNotification } from '@/lib/email/notifications';
import { logTaskActivity } from '@/lib/activity/log';
import { hasPermission } from '@/lib/auth/permissions';
import { getTaskAccessContext } from '@/lib/tasks/auth';
import { syncTaskProgressFromChecklist, updatePhanDuAnProgress } from '@/lib/tasks/progress';

const updateTaskSchema = z.object({
  ten: z.string().min(1).max(200).optional(),
  mo_ta: z.string().optional(),
  deadline: z.string().datetime().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  trang_thai: z.enum(['todo', 'in-progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  progress: z.number().min(0).max(100).optional(),
  progress_mode: z.enum(['manual', 'checklist']).optional(),
});

function getProjectNameFromRelation(value: unknown) {
  const relation = Array.isArray(value) ? value[0] : value;
  return relation && typeof relation === 'object' && 'ten' in relation
    ? ((relation as { ten?: string }).ten || null)
    : null;
}

function canSelfAssignOnly(params: {
  actorId: string;
  currentAssigneeId?: string | null;
  nextAssigneeId?: string | null;
}) {
  const currentAssigneeId = params.currentAssigneeId ?? null;
  const nextAssigneeId = params.nextAssigneeId ?? null;

  return (
    (currentAssigneeId === null || currentAssigneeId === params.actorId) &&
    (nextAssigneeId === null || nextAssigneeId === params.actorId)
  );
}

function buildTaskPermissions(auth: Awaited<ReturnType<typeof getTaskAccessContext>>) {
  const context = {
    appRole: auth.dbUser.vai_tro as 'admin' | 'manager' | 'member',
    projectRole: auth.membership.vai_tro as 'owner' | 'admin' | 'member' | 'viewer',
    isAssignee: auth.taskData.assignee_id === auth.dbUser.id,
  };

  return {
    canAssign: hasPermission(context, 'assignTask'),
    canUpdate: hasPermission(context, 'updateTask'),
    canDelete: hasPermission(context, 'deleteTask'),
    canSubmitReview: hasPermission(context, 'submitReview'),
    canApprove: hasPermission(context, 'approveTask'),
    canReject: hasPermission(context, 'rejectTask'),
  };
}

function getManualStatusFromProgress(progress: number) {
  if (progress >= 100) return 'done' as const;
  if (progress <= 0) return 'todo' as const;
  return 'in-progress' as const;
}

function getManualProgressFromStatus(status: 'todo' | 'in-progress' | 'done', currentProgress: number) {
  if (status === 'todo') return 0;
  if (status === 'done') return 100;

  if (currentProgress > 0 && currentProgress < 100) {
    return currentProgress;
  }

  return 50;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getTaskAccessContext(id);

    const { data, error } = await supabaseAdmin
      .from('task')
      .select(
        `
        *,
        nguoi_dung:assignee_id (id, ten, email, avatar_url),
        reviewer:reviewed_by (id, ten, email, avatar_url),
        phan_du_an (id, ten, du_an_id, du_an (*))
      `
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Không tìm thấy task' }, { status: 404 });
    }

    return NextResponse.json({
      ...data,
      permissions: buildTaskPermissions(auth),
    });
  } catch (error) {
    console.error('GET /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getTaskAccessContext(id);
    const permissions = buildTaskPermissions(auth);

    if (!permissions.canUpdate) {
      return NextResponse.json({ error: 'Bạn không có quyền cập nhật task này' }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateTaskSchema.parse(body);

    const updatePayload = {
      ...validated,
      ...(validated.progress !== undefined && !validated.progress_mode
        ? { progress_mode: 'manual' as const }
        : {}),
    };

    const { data: oldTask } = await supabaseAdmin
      .from('task')
      .select(
        `
        id,
        ten,
        mo_ta,
        deadline,
        assignee_id,
        trang_thai,
        priority,
        progress,
        progress_mode,
        review_status,
        submitted_for_review_at,
        reviewed_by,
        reviewed_at,
        review_comment,
        phan_du_an_id,
        phan_du_an (
          du_an_id,
          du_an (ten)
        )
      `
      )
      .eq('id', id)
      .single();

    if (!oldTask) {
      return NextResponse.json({ error: 'KhÃ´ng tÃ¬m tháº¥y task' }, { status: 404 });
    }

    const currentProgressMode = oldTask?.progress_mode || 'manual';

    if (currentProgressMode === 'checklist' && (validated.progress !== undefined || validated.trang_thai !== undefined)) {
      return NextResponse.json(
        { error: 'Task dùng checklist không thể đổi trạng thái hoặc tiến độ thủ công' },
        { status: 400 }
      );
    }

    if (
      validated.assignee_id !== undefined &&
      validated.assignee_id !== oldTask.assignee_id &&
      !permissions.canAssign &&
      !canSelfAssignOnly({
        actorId: auth.dbUser.id,
        currentAssigneeId: oldTask.assignee_id,
        nextAssigneeId: validated.assignee_id,
      })
    ) {
      return NextResponse.json(
        { error: 'Báº¡n khÃ´ng cÃ³ quyá»n thay Ä‘á»•i ngÆ°á»i thá»±c hiá»‡n task nÃ y' },
        { status: 403 }
      );
    }

    if (validated.assignee_id) {
      const { data: assigneeMembership, error: assigneeMembershipError } = await supabaseAdmin
        .from('thanh_vien_du_an')
        .select('id')
        .eq('du_an_id', auth.projectId)
        .eq('nguoi_dung_id', validated.assignee_id)
        .eq('trang_thai', 'active')
        .maybeSingle();

      if (assigneeMembershipError) {
        return NextResponse.json({ error: 'KhÃ´ng thá»ƒ kiá»ƒm tra ngÆ°á»i Ä‘Æ°á»£c giao' }, { status: 400 });
      }

      if (!assigneeMembership) {
        return NextResponse.json(
          { error: 'NgÆ°á»i Ä‘Æ°á»£c giao khÃ´ng thuá»™c dá»± Ã¡n nÃ y' },
          { status: 400 }
        );
      }
    }

    const normalizedPayload = {
      ...updatePayload,
      ...(currentProgressMode === 'manual' && validated.trang_thai !== undefined && validated.progress === undefined
        ? { progress: getManualProgressFromStatus(validated.trang_thai, oldTask.progress) }
        : {}),
      ...(currentProgressMode === 'manual' && validated.progress !== undefined && validated.trang_thai === undefined
        ? { trang_thai: getManualStatusFromProgress(validated.progress) }
        : {}),
    };

    const nextStatus =
      (normalizedPayload.trang_thai as 'todo' | 'in-progress' | 'done' | undefined) || oldTask.trang_thai;
    const nextProgress = typeof normalizedPayload.progress === 'number' ? normalizedPayload.progress : oldTask.progress;
    const hasSubstantiveChanges =
      (validated.ten !== undefined && validated.ten !== oldTask.ten) ||
      (validated.mo_ta !== undefined && validated.mo_ta !== oldTask.mo_ta) ||
      (validated.deadline !== undefined && validated.deadline !== oldTask.deadline) ||
      (validated.priority !== undefined && validated.priority !== oldTask.priority) ||
      (validated.assignee_id !== undefined && validated.assignee_id !== oldTask.assignee_id) ||
      (validated.progress_mode !== undefined && validated.progress_mode !== oldTask.progress_mode);
    const shouldResetReview =
      oldTask.review_status !== 'draft' &&
      (nextStatus !== 'done' || nextProgress < 100 || hasSubstantiveChanges);

    if (shouldResetReview) {
      Object.assign(normalizedPayload, {
        review_status: 'draft',
        submitted_for_review_at: null,
        reviewed_by: null,
        reviewed_at: null,
        review_comment: null,
      });
    }

    const { data: updatedTask, error } = await supabaseAdmin
      .from('task')
      .update(normalizedPayload)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*, phan_du_an_id')
      .single();

    if (error || !updatedTask || !oldTask) {
      return NextResponse.json({ error: 'Không thể cập nhật task' }, { status: 400 });
    }

    if (validated.assignee_id !== undefined && validated.assignee_id !== oldTask.assignee_id) {
      try {
        const { data: assigneeData } = await supabaseAdmin
          .from('nguoi_dung')
          .select('email, ten')
          .eq('id', validated.assignee_id)
          .single();

        if (assigneeData && assigneeData.email !== auth.authUser.email) {
          const shouldSend = await shouldSendNotification(assigneeData.email, 'emailTaskAssigned');
          if (shouldSend) {
            const phanDuAn = Array.isArray(oldTask.phan_du_an) ? oldTask.phan_du_an[0] : oldTask.phan_du_an;
            const projectName = getProjectNameFromRelation(phanDuAn?.du_an) || 'Dự án';

            sendTaskAssignedEmail(assigneeData.email, assigneeData.ten, {
              taskId: updatedTask.id,
              taskName: updatedTask.ten,
              projectName,
              deadline: updatedTask.deadline,
              priority: updatedTask.priority,
            }).catch((err) => console.error('Error sending task assigned email:', err));
          }
        }
      } catch (emailError) {
        console.error('Error sending task assignment notification:', emailError);
      }
    }

    if (normalizedPayload.progress_mode === 'checklist') {
      await syncTaskProgressFromChecklist(updatedTask.id);
    } else if (
      updatedTask.phan_du_an_id &&
      (validated.trang_thai || validated.progress !== undefined || validated.progress_mode)
    ) {
      await updatePhanDuAnProgress(updatedTask.phan_du_an_id);
    }

    const changes: string[] = [];
    let historyAction: 'assigned' | 'status_changed' | 'progress_updated' | 'completed' | undefined;

    if (validated.assignee_id !== undefined && validated.assignee_id !== oldTask.assignee_id) {
      changes.push('assignee');
      historyAction = 'assigned';
    }

    if (validated.trang_thai && validated.trang_thai !== oldTask.trang_thai) {
      changes.push('status');
      historyAction = validated.trang_thai === 'done' ? 'completed' : 'status_changed';
    }

    if (validated.progress !== undefined && validated.progress !== oldTask.progress) {
      changes.push('progress');
      historyAction = historyAction || 'progress_updated';
    }

    if (validated.ten !== undefined && validated.ten !== oldTask.ten) {
      changes.push('title');
    }

    if (validated.deadline !== undefined && validated.deadline !== oldTask.deadline) {
      changes.push('deadline');
    }

    if (validated.priority !== undefined && validated.priority !== oldTask.priority) {
      changes.push('priority');
    }

    await logTaskActivity({
      taskId: id,
      actorId: auth.dbUser.id,
      action: changes.length > 0 ? `task_updated:${changes.join(',')}` : 'task_updated',
      historyAction,
      previousValue: {
        ten: oldTask.ten,
        deadline: oldTask.deadline,
        assignee_id: oldTask.assignee_id,
        trang_thai: oldTask.trang_thai,
        progress: oldTask.progress,
        priority: oldTask.priority,
      },
      nextValue: {
        ten: updatedTask.ten,
        deadline: updatedTask.deadline,
        assignee_id: updatedTask.assignee_id,
        trang_thai: updatedTask.trang_thai,
        progress: updatedTask.progress,
        priority: updatedTask.priority,
      },
      metadata: {
        projectId: auth.projectId,
        partId: updatedTask.phan_du_an_id,
        taskName: updatedTask.ten,
        changes,
      },
    });

    return NextResponse.json({
      ...updatedTask,
      permissions,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('PATCH /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getTaskAccessContext(id);
    const permissions = buildTaskPermissions(auth);

    if (!permissions.canDelete) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa task này' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('task')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Không thể xóa task' }, { status: 400 });
    }

    if (auth.taskData?.phan_du_an_id) {
      await updatePhanDuAnProgress(auth.taskData.phan_du_an_id);
    }

    await logTaskActivity({
      taskId: id,
      actorId: auth.dbUser.id,
      action: 'task_deleted',
      historyAction: 'deleted',
      previousValue: {
        taskName: auth.taskData.ten,
        assigneeId: auth.taskData.assignee_id,
      },
      metadata: {
        projectId: auth.projectId,
        partId: auth.taskData.phan_du_an_id,
        taskName: auth.taskData.ten,
      },
    });

    return NextResponse.json({ message: 'Đã xóa task', data });
  } catch (error) {
    console.error('DELETE /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
