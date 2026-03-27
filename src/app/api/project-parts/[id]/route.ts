import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logActivity } from '@/lib/activity/log';
import { hasPermission } from '@/lib/auth/permissions';
import { updateDuAnProgress, updatePhanDuAnProgress } from '@/lib/tasks/progress';
import { getPartAccessContext, toErrorResponse } from '@/lib/tasks/auth';
import { supabaseAdmin } from '@/lib/supabase/client';

const updatePartSchema = z.object({
  ten: z.string().trim().min(1, 'Tên phần dự án là bắt buộc.').max(200, 'Tên phần dự án không được vượt quá 200 ký tự.').optional(),
  mo_ta: z.string().trim().max(2000, 'Mô tả phần dự án không được vượt quá 2000 ký tự.').optional(),
  deadline: z.string().datetime().optional(),
});

function canManagePart(auth: Awaited<ReturnType<typeof getPartAccessContext>>) {
  return hasPermission(
    {
      appRole: auth.dbUser.vai_tro as 'admin' | 'manager' | 'member',
      projectRole: auth.membership.vai_tro as 'owner' | 'admin' | 'member' | 'viewer',
    },
    'manageProjects'
  );
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await getPartAccessContext(id);

    const { data, error } = await supabaseAdmin
      .from('phan_du_an')
      .select('*, task (*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Không tìm thấy phần dự án' }, { status: 404 });
    }

    return NextResponse.json({
      ...data,
      task: (data.task || []).filter((task: { deleted_at?: string | null }) => !task.deleted_at),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getPartAccessContext(id);

    if (!canManagePart(auth)) {
      return NextResponse.json(
        { error: 'Bạn không có quyền cập nhật phần dự án này' },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (
      typeof body === 'object' &&
      body !== null &&
      Object.prototype.hasOwnProperty.call(body, 'phan_tram_hoan_thanh')
    ) {
      return NextResponse.json(
        { error: 'Tiến độ phần dự án được tính tự động từ các task.' },
        { status: 400 }
      );
    }

    if (
      typeof body === 'object' &&
      body !== null &&
      Object.prototype.hasOwnProperty.call(body, 'trang_thai')
    ) {
      return NextResponse.json(
        { error: 'Trạng thái phần dự án được tính tự động từ các task.' },
        { status: 400 }
      );
    }

    const validated = updatePartSchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from('phan_du_an')
      .update(validated)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Không thể cập nhật phần dự án' }, { status: 400 });
    }

    await updatePhanDuAnProgress(id);

    const { data: refreshedPart, error: refreshedPartError } = await supabaseAdmin
      .from('phan_du_an')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    await logActivity({
      entityType: 'project_part',
      entityId: id,
      action: 'project_part_updated',
      actorId: auth.dbUser.id,
      metadata: {
        projectId: auth.projectId,
        partId: id,
        partName: data.ten,
        changes: Object.keys(validated),
      },
    });

    return NextResponse.json(refreshedPartError || !refreshedPart ? data : refreshedPart);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getPartAccessContext(id);

    if (!canManagePart(auth)) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa phần dự án này' }, { status: 403 });
    }

    const deletedAt = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('phan_du_an')
      .update({ deleted_at: deletedAt })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Không thể xóa phần dự án' }, { status: 400 });
    }

    await supabaseAdmin
      .from('task')
      .update({ deleted_at: deletedAt })
      .eq('phan_du_an_id', id)
      .is('deleted_at', null);

    await supabaseAdmin
      .from('recurring_task_rule')
      .update({ is_active: false })
      .eq('phan_du_an_id', id)
      .eq('is_active', true);

    await updateDuAnProgress(auth.projectId);

    await logActivity({
      entityType: 'project_part',
      entityId: id,
      action: 'project_part_deleted',
      actorId: auth.dbUser.id,
      metadata: {
        projectId: auth.projectId,
        partId: id,
        partName: data.ten,
      },
    });

    return NextResponse.json({ message: 'Đã xóa phần dự án', data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
