import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  calculateDuAnProgress,
  calculatePhanDuAnProgress,
} from '@/lib/utils/calculate-progress';
import { sendTaskAssignedEmail, shouldSendNotification } from '@/lib/email/notifications';

const updateTaskSchema = z.object({
  ten: z.string().min(1).max(200).optional(),
  mo_ta: z.string().optional(),
  deadline: z.string().datetime().optional(),
  assignee_id: z.string().uuid().optional(),
  trang_thai: z.enum(['todo', 'in-progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  progress: z.number().min(0).max(100).optional(),
});

async function authorizeTaskAccess(taskId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: taskData, error: taskError } = await supabaseAdmin
    .from('task')
    .select('id, phan_du_an_id, phan_du_an (du_an_id)')
    .eq('id', taskId)
    .is('deleted_at', null)
    .single();

  if (taskError || !taskData) {
    return {
      error: NextResponse.json(
        { error: 'Không tìm thấy task' },
        { status: 404 }
      ),
    };
  }

  const phanDuAn = taskData.phan_du_an as unknown as { du_an_id: string } | { du_an_id: string }[] | null;
  const projectId = Array.isArray(phanDuAn) ? phanDuAn[0]?.du_an_id : phanDuAn?.du_an_id;
  if (!projectId) {
    return {
      error: NextResponse.json(
        { error: 'Task không thuộc dự án hợp lệ' },
        { status: 400 }
      ),
    };
  }

  const { data: membership } = await supabase
    .from('thanh_vien_du_an')
    .select('id')
    .eq('du_an_id', projectId)
    .eq('email', user.email)
    .eq('trang_thai', 'active')
    .single();

  if (!membership) {
    return {
      error: NextResponse.json(
        { error: 'Bạn không có quyền truy cập task này' },
        { status: 403 }
      ),
    };
  }

  return { user, taskData };
}

// GET /api/tasks/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizeTaskAccess(id);
    if (auth.error) return auth.error;

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
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizeTaskAccess(id);
    if (auth.error) return auth.error;

    const body = await request.json();
    const validated = updateTaskSchema.parse(body);

    const { data: oldTask } = await supabaseAdmin
      .from('task')
      .select('assignee_id, phan_du_an_id, phan_du_an (du_an_id, du_an (ten))')
      .eq('id', id)
      .single();

    const { data: updatedTask, error } = await supabaseAdmin
      .from('task')
      .update(validated)
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

        if (assigneeData && assigneeData.email !== auth.user?.email) {
          const shouldSend = await shouldSendNotification(assigneeData.email, 'emailTaskAssigned');
          if (shouldSend) {
            const rawPhanDuAn = oldTask?.phan_du_an as unknown as { du_an?: { ten?: string } } | { du_an?: { ten?: string } }[] | null;
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

    if (updatedTask.phan_du_an_id && (validated.trang_thai || validated.progress !== undefined)) {
      await updatePhanDuAnProgress(updatedTask.phan_du_an_id);
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function updatePhanDuAnProgress(phanDuAnId: string) {
  try {
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('task')
      .select('id, trang_thai, progress')
      .eq('phan_du_an_id', phanDuAnId)
      .is('deleted_at', null);

    if (tasksError || !tasks) return;

    const newProgress = calculatePhanDuAnProgress(
      tasks.map((t) => ({
        id: t.id,
        trangThai: t.trang_thai,
        progress: t.progress,
      }))
    );

    const { data: updatedPhanDuAn, error: updateError } = await supabaseAdmin
      .from('phan_du_an')
      .update({ phan_tram_hoan_thanh: newProgress })
      .eq('id', phanDuAnId)
      .is('deleted_at', null)
      .select('du_an_id')
      .single();

    if (updateError || !updatedPhanDuAn) return;

    await updateDuAnProgress(updatedPhanDuAn.du_an_id);
  } catch (error) {
    console.error('Error updating PhanDuAn progress:', error);
  }
}

async function updateDuAnProgress(duAnId: string) {
  try {
    const { data: parts, error: partsError } = await supabaseAdmin
      .from('phan_du_an')
      .select('id, phan_tram_hoan_thanh')
      .eq('du_an_id', duAnId)
      .is('deleted_at', null);

    if (partsError || !parts || parts.length === 0) return;

    const newProgress = calculateDuAnProgress(
      parts.map((part) => ({
        phanTramHoanThanh: part.phan_tram_hoan_thanh || 0,
      }))
    );

    await supabaseAdmin
      .from('du_an')
      .update({ phan_tram_hoan_thanh: newProgress })
      .eq('id', duAnId)
      .is('deleted_at', null);
  } catch (error) {
    console.error('Error updating DuAn progress:', error);
  }
}

// DELETE /api/tasks/[id] - Soft delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizeTaskAccess(id);
    if (auth.error) return auth.error;

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
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
