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

function buildTaskPermissions(auth: Awaited<ReturnType<typeof getTaskAccessContext>>) {
  const context = {
    appRole: auth.dbUser.vai_tro as 'admin' | 'manager' | 'member',
    projectRole: auth.membership.vai_tro as 'owner' | 'admin' | 'member' | 'viewer',
    isAssignee: auth.taskData.assignee_id === auth.dbUser.id,
  };

  return {
    canUpdate: hasPermission(context, 'updateTask'),
    canDelete: hasPermission(context, 'deleteTask'),
    canSubmitReview: hasPermission(context, 'submitReview'),
    canApprove: hasPermission(context, 'approveTask'),
    canReject: hasPermission(context, 'rejectTask'),
  };
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
        phan_du_an_id,
        phan_du_an (
          du_an_id,
          du_an (ten)
        )
      `
      )
      .eq('id', id)
      .single();

    const { data: updatedTask, error } = await supabaseAdmin
      .from('task')
      .update(updatePayload)
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

    if (updatePayload.progress_mode === 'checklist') {
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
