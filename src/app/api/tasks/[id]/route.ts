import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase, supabaseAdmin } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { calculatePhanDuAnProgress } from '@/lib/utils/calculate-progress';
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

// GET /api/tasks/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
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
    const body = await request.json();
    const validated = updateTaskSchema.parse(body);

    // Lấy thông tin task cũ để so sánh assignee
    const { data: oldTask } = await supabase
      .from('task')
      .select('assignee_id, phan_du_an (du_an_id, du_an (ten))')
      .eq('id', id)
      .single();

    // Update task
    const { data: updatedTask, error } = await supabase
      .from('task')
      .update(validated)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*, phan_du_an_id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Gửi email nếu assignee thay đổi
    if (validated.assignee_id && validated.assignee_id !== oldTask?.assignee_id) {
      try {
        // Lấy thông tin user hiện tại
        const supabaseAuth = await createSupabaseServerClient();
        const { data: { user } } = await supabaseAuth.auth.getUser();

        const { data: assigneeData } = await supabase
          .from('nguoi_dung')
          .select('email, ten')
          .eq('id', validated.assignee_id)
          .single();

        if (assigneeData && (!user || assigneeData.email !== user.email)) {
          const shouldSend = await shouldSendNotification(assigneeData.email, 'emailTaskAssigned');
          if (shouldSend) {
            // Get project name
            const projectName = oldTask?.phan_du_an?.du_an?.ten || 'Chưa xác định';

            sendTaskAssignedEmail(
              assigneeData.email,
              assigneeData.ten,
              {
                taskId: updatedTask.id,
                taskName: updatedTask.ten,
                projectName,
                deadline: updatedTask.deadline,
                priority: updatedTask.priority,
              }
            ).catch(err => console.error('Error sending task assigned email:', err));
          }
        }
      } catch (emailError) {
        console.error('Error sending task assignment notification:', emailError);
      }
    }

    // Broadcast task update qua socket
    try {
      const { broadcastTaskUpdate } = await import('@/lib/socket/server');
      const supabaseAuth = await createSupabaseServerClient();
      const { data: { user } } = await supabaseAuth.auth.getUser();
      broadcastTaskUpdate(id, validated, user?.email || 'unknown');
    } catch (socketError) {
      console.error('Error broadcasting task update:', socketError);
    }

    // Auto-update phan_tram_hoan_thanh cho PhanDuAn nếu task thuộc về một phần dự án
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

// Helper: Update PhanDuAn progress based on its tasks
async function updatePhanDuAnProgress(phanDuAnId: string) {
  try {
    // Get all tasks in this phan_du_an
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('task')
      .select('id, trang_thai, progress')
      .eq('phan_du_an_id', phanDuAnId)
      .is('deleted_at', null);

    if (tasksError || !tasks) return;

    // Calculate new progress
    const newProgress = calculatePhanDuAnProgress(
      tasks.map((t) => ({
        id: t.id,
        trangThai: t.trang_thai,
        progress: t.progress,
      }))
    );

    // Update PhanDuAn
    const { data: updatedPhanDuAn, error: updateError } = await supabaseAdmin
      .from('phan_du_an')
      .update({ phan_tram_hoan_thanh: newProgress })
      .eq('id', phanDuAnId)
      .select('du_an_id')
      .single();

    if (updateError || !updatedPhanDuAn) return;

    // Auto-update DuAn progress
    await updateDuAnProgress(updatedPhanDuAn.du_an_id);
  } catch (error) {
    console.error('Error updating PhanDuAn progress:', error);
  }
}

// Helper: Update DuAn progress based on its parts
async function updateDuAnProgress(duAnId: string) {
  try {
    // Get all parts in this du_an
    const { data: parts, error: partsError } = await supabaseAdmin
      .from('phan_du_an')
      .select('id, phan_tram_hoan_thanh')
      .eq('du_an_id', duAnId);

    if (partsError || !parts || parts.length === 0) return;

    // Calculate average progress
    const totalProgress = parts.reduce((sum, part) => sum + (part.phan_tram_hoan_thanh || 0), 0);
    const newProgress = Math.round((totalProgress / parts.length) * 100) / 100;

    // Update DuAn
    await supabaseAdmin
      .from('du_an')
      .update({ phan_tram_hoan_thanh: newProgress })
      .eq('id', duAnId);
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
    const { data, error } = await supabase
      .from('task')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Broadcast task deletion qua socket
    try {
      const { broadcastTaskDelete } = await import('@/lib/socket/server');
      const supabaseAuth = await createSupabaseServerClient();
      const { data: { user } } = await supabaseAuth.auth.getUser();
      broadcastTaskDelete(id, user?.email || 'unknown');
    } catch (socketError) {
      console.error('Error broadcasting task deletion:', socketError);
    }

    return NextResponse.json({ message: 'Task deleted', data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
