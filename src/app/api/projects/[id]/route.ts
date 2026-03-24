import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logActivity } from '@/lib/activity/log';
import { hasPermission } from '@/lib/auth/permissions';
import { getProjectAccessContext, toErrorResponse } from '@/lib/tasks/auth';
import { supabaseAdmin } from '@/lib/supabase/client';

const updateProjectSchema = z.object({
  ten: z.string().min(1).max(200).optional(),
  mo_ta: z.string().optional(),
  deadline: z.string().datetime().optional(),
  trang_thai: z.enum(['todo', 'in-progress', 'done']).optional(),
  phan_tram_hoan_thanh: z.number().min(0).max(100).optional(),
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
      ...data,
      permissions,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
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
