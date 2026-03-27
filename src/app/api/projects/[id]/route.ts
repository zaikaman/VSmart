import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logActivity } from '@/lib/activity/log';
import { hasPermission } from '@/lib/auth/permissions';
import { updateDuAnProgress } from '@/lib/tasks/progress';
import { getProjectAccessContext, toErrorResponse } from '@/lib/tasks/auth';
import { supabaseAdmin } from '@/lib/supabase/client';

const updateProjectSchema = z.object({
  ten: z.string().trim().min(1, 'Tên dự án là bắt buộc.').max(200, 'Tên dự án không được vượt quá 200 ký tự.').optional(),
  mo_ta: z.string().trim().max(2000, 'Mô tả dự án không được vượt quá 2000 ký tự.').optional(),
  deadline: z.string().datetime().optional(),
});

function buildProjectPermissions(auth: Awaited<ReturnType<typeof getProjectAccessContext>>) {
  const context = {
    appRole: auth.dbUser.vai_tro as 'admin' | 'manager' | 'member',
    projectRole: auth.membership.vai_tro as 'owner' | 'admin' | 'member' | 'viewer',
  };

  const canManageProject = hasPermission(context, 'manageProjects');
  const canDeleteProject = canManageProject && ['owner', 'admin'].includes(auth.membership.vai_tro);

  return {
    canManageProject,
    canDeleteProject,
    canManageMembers: hasPermission(context, 'manageMembers'),
    canCreateTasks: hasPermission(context, 'createTask'),
    canAssignTasks: hasPermission(context, 'assignTask'),
    canViewAnalytics: hasPermission(context, 'viewAnalytics'),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getProjectAccessContext(id);
    const permissions = buildProjectPermissions(auth);

    const { data: project, error: projectError } = await auth.supabase
      .from('du_an')
      .select(
        `
        *,
        phan_du_an (*)
      `
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
    }

    return NextResponse.json({
      ...project,
      phan_du_an: (project.phan_du_an || []).filter(
        (part: { deleted_at?: string | null }) => !part.deleted_at
      ),
      current_membership_role: auth.membership.vai_tro,
      permissions,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getProjectAccessContext(id);
    const permissions = buildProjectPermissions(auth);

    if (!permissions.canManageProject) {
      return NextResponse.json({ error: 'Bạn không có quyền cập nhật dự án này' }, { status: 403 });
    }

    const body = await request.json();
    if (
      typeof body === 'object' &&
      body !== null &&
      Object.prototype.hasOwnProperty.call(body, 'phan_tram_hoan_thanh')
    ) {
      return NextResponse.json(
        { error: 'Tiến độ dự án được tính tự động từ toàn bộ task.' },
        { status: 400 }
      );
    }

    if (
      typeof body === 'object' &&
      body !== null &&
      Object.prototype.hasOwnProperty.call(body, 'trang_thai')
    ) {
      return NextResponse.json(
        { error: 'Trạng thái dự án được tính tự động từ toàn bộ task.' },
        { status: 400 }
      );
    }

    const validated = updateProjectSchema.parse(body);

    const { data, error } = await auth.supabase
      .from('du_an')
      .update(validated)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Không thể cập nhật dự án' }, { status: 400 });
    }

    await updateDuAnProgress(id);

    const { data: refreshedProject, error: refreshedProjectError } = await auth.supabase
      .from('du_an')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    await logActivity({
      entityType: 'project',
      entityId: id,
      action: 'project_updated',
      actorId: auth.dbUser.id,
      metadata: {
        projectId: id,
        projectName: data.ten,
        changes: Object.keys(validated),
      },
    });

    return NextResponse.json({
      ...(refreshedProjectError || !refreshedProject ? data : refreshedProject),
      permissions,
    });
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
    const auth = await getProjectAccessContext(id);
    const permissions = buildProjectPermissions(auth);

    if (!permissions.canDeleteProject) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa dự án này' }, { status: 403 });
    }

    const deletedAt = new Date().toISOString();

    const { data, error } = await auth.supabase
      .from('du_an')
      .update({ deleted_at: deletedAt })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Không thể xóa dự án' }, { status: 400 });
    }

    await supabaseAdmin
      .from('phan_du_an')
      .update({ deleted_at: deletedAt })
      .eq('du_an_id', id)
      .is('deleted_at', null);

    const { data: projectParts } = await supabaseAdmin
      .from('phan_du_an')
      .select('id')
      .eq('du_an_id', id);
    const projectPartIds = (projectParts || []).map(part => part.id);

    if (projectPartIds.length > 0) {
      await supabaseAdmin
        .from('task')
        .update({ deleted_at: deletedAt })
        .in('phan_du_an_id', projectPartIds)
        .is('deleted_at', null);

      await supabaseAdmin
        .from('recurring_task_rule')
        .update({ is_active: false })
        .in('phan_du_an_id', projectPartIds)
        .eq('is_active', true);
    }

    await logActivity({
      entityType: 'project',
      entityId: id,
      action: 'project_deleted',
      actorId: auth.dbUser.id,
      metadata: {
        projectId: id,
        projectName: data.ten,
      },
    });

    return NextResponse.json({ message: 'Đã xóa dự án', data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
