import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { z } from 'zod';
import { sendTaskAssignedEmail, shouldSendNotification } from '@/lib/email/notifications';
import { getTaskAccessContext } from '@/lib/tasks/auth';
import { syncTaskProgressFromChecklist, updatePhanDuAnProgress } from '@/lib/tasks/progress';

const updateTaskSchema = z.object({
  ten: z.string().min(1).max(200).optional(),
  mo_ta: z.string().optional(),
  deadline: z.string().datetime().optional(),
  assignee_id: z.string().uuid().optional(),
  trang_thai: z.enum(['todo', 'in-progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  progress: z.number().min(0).max(100).optional(),
  progress_mode: z.enum(['manual', 'checklist']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await getTaskAccessContext(id);

    const { data, error } = await supabaseAdmin
      .from('task')
      .select(
        `
        *,
        nguoi_dung:assignee_id (id, ten, email, avatar_url),
        phan_du_an (id, ten, du_an_id, du_an (*))
      `
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/tasks/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getTaskAccessContext(id);
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
      .select('assignee_id, phan_du_an_id, phan_du_an (du_an_id, du_an (ten))')
      .eq('id', id)
      .single();

    const { data: updatedTask, error } = await supabaseAdmin
      .from('task')
      .update(updatePayload)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*, phan_du_an_id')
      .single();

    if (error || !updatedTask) {
      return NextResponse.json({ error: 'Không thể cập nhật task' }, { status: 400 });
    }

    if (validated.assignee_id && validated.assignee_id !== oldTask?.assignee_id) {
      try {
        const { data: assigneeData } = await supabaseAdmin
          .from('nguoi_dung')
          .select('email, ten')
          .eq('id', validated.assignee_id)
          .single();

        if (assigneeData && assigneeData.email !== auth.authUser.email) {
          const shouldSend = await shouldSendNotification(assigneeData.email, 'emailTaskAssigned');
          if (shouldSend) {
            const rawPhanDuAn = oldTask?.phan_du_an as
              | { du_an?: { ten?: string } }
              | { du_an?: { ten?: string } }[]
              | null;
            const phanDuAn = Array.isArray(rawPhanDuAn) ? rawPhanDuAn[0] : rawPhanDuAn;
            const projectName = phanDuAn?.du_an?.ten || 'Chưa xác định';

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

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('PATCH /api/tasks/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getTaskAccessContext(id);

    const { data, error } = await supabaseAdmin
      .from('task')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (auth.taskData?.phan_du_an_id) {
      await updatePhanDuAnProgress(auth.taskData.phan_du_an_id);
    }

    return NextResponse.json({ message: 'Task deleted', data });
  } catch (error) {
    console.error('DELETE /api/tasks/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
