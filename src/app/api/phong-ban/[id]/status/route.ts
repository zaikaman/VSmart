import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { canManageOrganizationSettings, type AppRole } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const statusSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('deactivate'),
  }),
  z.object({
    action: z.literal('reactivate'),
  }),
  z.object({
    action: z.literal('merge'),
    target_department_id: z.string().uuid('Phòng ban đích không hợp lệ'),
  }),
]);

async function getCurrentUserOrgContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: dbUser, error: userError } = await supabaseAdmin
    .from('nguoi_dung')
    .select('id, email, to_chuc_id, vai_tro')
    .eq('email', user.email)
    .single();

  if (userError || !dbUser) {
    return { error: NextResponse.json({ error: 'Không tìm thấy người dùng.' }, { status: 404 }) };
  }

  if (!dbUser.to_chuc_id) {
    return { error: NextResponse.json({ error: 'Bạn chưa thuộc tổ chức nào.' }, { status: 400 }) };
  }

  return {
    user: {
      ...dbUser,
      vai_tro: dbUser.vai_tro as AppRole,
    },
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getCurrentUserOrgContext();

    if ('error' in context) {
      return context.error;
    }

    if (!canManageOrganizationSettings(context.user.vai_tro)) {
      return NextResponse.json(
        { error: 'Bạn không có quyền quản lý phòng ban của tổ chức này.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validated = statusSchema.parse(body);

    const { data: sourceDepartment, error: sourceError } = await supabaseAdmin
      .from('phong_ban')
      .select('*')
      .eq('id', id)
      .eq('to_chuc_id', context.user.to_chuc_id)
      .maybeSingle();

    if (sourceError || !sourceDepartment) {
      return NextResponse.json({ error: 'Không tìm thấy phòng ban.' }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (validated.action === 'deactivate') {
      if (sourceDepartment.trang_thai !== 'active') {
        return NextResponse.json(
          { error: 'Chỉ phòng ban đang dùng mới có thể chuyển sang ngừng dùng.' },
          { status: 400 }
        );
      }

      const { data, error } = await supabaseAdmin
        .from('phong_ban')
        .update({
          trang_thai: 'inactive',
          ngung_su_dung_at: now,
          merged_into_id: null,
          cap_nhat_cuoi: now,
        })
        .eq('id', id)
        .eq('to_chuc_id', context.user.to_chuc_id)
        .select('*')
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Không thể cập nhật phòng ban.' }, { status: 400 });
      }

      return NextResponse.json({ data });
    }

    if (validated.action === 'reactivate') {
      if (sourceDepartment.trang_thai === 'merged') {
        return NextResponse.json(
          { error: 'Phòng ban đã gộp không thể dùng lại trực tiếp.' },
          { status: 400 }
        );
      }

      const { data, error } = await supabaseAdmin
        .from('phong_ban')
        .update({
          trang_thai: 'active',
          ngung_su_dung_at: null,
          merged_into_id: null,
          cap_nhat_cuoi: now,
        })
        .eq('id', id)
        .eq('to_chuc_id', context.user.to_chuc_id)
        .select('*')
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Không thể cập nhật phòng ban.' }, { status: 400 });
      }

      return NextResponse.json({ data });
    }

    if (validated.target_department_id === id) {
      return NextResponse.json(
        { error: 'Không thể gộp phòng ban vào chính nó.' },
        { status: 400 }
      );
    }

    if (sourceDepartment.trang_thai === 'merged') {
      return NextResponse.json(
        { error: 'Phòng ban này đã được gộp trước đó.' },
        { status: 400 }
      );
    }

    const { data: targetDepartment, error: targetError } = await supabaseAdmin
      .from('phong_ban')
      .select('*')
      .eq('id', validated.target_department_id)
      .eq('to_chuc_id', context.user.to_chuc_id)
      .maybeSingle();

    if (targetError || !targetDepartment) {
      return NextResponse.json(
        { error: 'Không tìm thấy phòng ban đích để gộp.' },
        { status: 404 }
      );
    }

    if (targetDepartment.trang_thai !== 'active') {
      return NextResponse.json(
        { error: 'Chỉ có thể gộp vào một phòng ban đang dùng.' },
        { status: 400 }
      );
    }

    const updateUsersResult = await supabaseAdmin
      .from('nguoi_dung')
      .update({
        phong_ban_id: targetDepartment.id,
        ten_phong_ban: targetDepartment.ten,
      })
      .eq('to_chuc_id', context.user.to_chuc_id)
      .eq('phong_ban_id', id);

    if (updateUsersResult.error) {
      return NextResponse.json(
        { error: 'Không thể chuyển thành viên sang phòng ban đích.' },
        { status: 500 }
      );
    }

    const updateProjectPartsResult = await supabaseAdmin
      .from('phan_du_an')
      .update({
        phong_ban_id: targetDepartment.id,
        cap_nhat_cuoi: now,
      })
      .eq('phong_ban_id', id)
      .is('deleted_at', null);

    if (updateProjectPartsResult.error) {
      return NextResponse.json(
        { error: 'Không thể chuyển phần dự án sang phòng ban đích.' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('phong_ban')
      .update({
        trang_thai: 'merged',
        merged_into_id: targetDepartment.id,
        ngung_su_dung_at: now,
        cap_nhat_cuoi: now,
      })
      .eq('id', id)
      .eq('to_chuc_id', context.user.to_chuc_id)
      .select('*')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Không thể cập nhật trạng thái phòng ban sau khi gộp.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: {
        ...data,
        merged_into: {
          id: targetDepartment.id,
          ten: targetDepartment.ten,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' },
        { status: 400 }
      );
    }

    console.error('Error in PATCH /api/phong-ban/[id]/status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
