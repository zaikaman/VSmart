import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logActivity } from '@/lib/activity/log';
import { hasPermission } from '@/lib/auth/permissions';
import { getProjectAccessContext, toErrorResponse } from '@/lib/tasks/auth';
import { supabaseAdmin } from '@/lib/supabase/client';

const partSchema = z.object({
  ten: z.string().min(1).max(200),
  mo_ta: z.string().optional(),
  deadline: z.string().datetime(),
  phong_ban_id: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getProjectAccessContext(id);

    const canCreate = hasPermission(
      {
        appRole: auth.dbUser.vai_tro as 'admin' | 'manager' | 'member',
        projectRole: auth.membership.vai_tro as 'owner' | 'admin' | 'member' | 'viewer',
      },
      'manageProjects'
    );

    if (!canCreate) {
      return NextResponse.json({ error: 'Bạn không có quyền tạo phần dự án trong dự án này' }, { status: 403 });
    }

    const body = await request.json();
    const validated = partSchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from('phan_du_an')
      .insert([
        {
          ten: validated.ten,
          mo_ta: validated.mo_ta,
          deadline: validated.deadline,
          du_an_id: id,
          phong_ban_id: validated.phong_ban_id,
          trang_thai: 'todo',
          phan_tram_hoan_thanh: 0,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Không thể tạo phần dự án' }, { status: 400 });
    }

    await logActivity({
      entityType: 'project_part',
      entityId: data.id,
      action: 'project_part_created',
      actorId: auth.dbUser.id,
      metadata: {
        projectId: id,
        partId: data.id,
        partName: data.ten,
      },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return toErrorResponse(error);
  }
}
