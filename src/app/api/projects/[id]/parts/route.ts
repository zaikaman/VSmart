import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logActivity } from '@/lib/activity/log';
import { hasPermission } from '@/lib/auth/permissions';
import { getProjectAccessContext, toErrorResponse } from '@/lib/tasks/auth';
import { supabaseAdmin } from '@/lib/supabase/client';

const partSchema = z.object({
  ten: z.string().trim().min(1, 'Tên phần dự án là bắt buộc.').max(200, 'Tên phần dự án không được vượt quá 200 ký tự.'),
  mo_ta: z.string().trim().max(2000, 'Mô tả phần dự án không được vượt quá 2000 ký tự.').optional(),
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

    const { data: projectData, error: projectError } = await supabaseAdmin
      .from('du_an')
      .select('id, to_chuc_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (projectError || !projectData?.to_chuc_id) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin tổ chức của dự án.' }, { status: 404 });
    }

    const { data: departmentData, error: departmentError } = await supabaseAdmin
      .from('phong_ban')
      .select('id, trang_thai')
      .eq('id', validated.phong_ban_id)
      .eq('to_chuc_id', projectData.to_chuc_id)
      .maybeSingle();

    if (departmentError || !departmentData) {
      return NextResponse.json(
        { error: 'Phòng ban được chọn không thuộc cùng tổ chức với dự án.' },
        { status: 400 }
      );
    }

    if (departmentData.trang_thai !== 'active') {
      return NextResponse.json(
        { error: 'Phòng ban này đã ngừng dùng nên không thể nhận phần dự án mới.' },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }
    return toErrorResponse(error);
  }
}
