import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { canManageOrganizationSettings, type AppRole } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const updatePhongBanSchema = z.object({
  ten: z.string().trim().min(1, 'Tên phòng ban là bắt buộc').max(120, 'Tên phòng ban quá dài'),
  mo_ta: z.string().trim().max(500, 'Mô tả quá dài').optional(),
});

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
    const validated = updatePhongBanSchema.parse(body);

    const { data: existingDepartment, error: departmentError } = await supabaseAdmin
      .from('phong_ban')
      .select('id, trang_thai')
      .eq('id', id)
      .eq('to_chuc_id', context.user.to_chuc_id)
      .maybeSingle();

    if (departmentError || !existingDepartment) {
      return NextResponse.json({ error: 'Không tìm thấy phòng ban.' }, { status: 404 });
    }

    if (existingDepartment.trang_thai === 'merged') {
      return NextResponse.json(
        { error: 'Phòng ban đã gộp chỉ nên xem lịch sử, không chỉnh sửa trực tiếp.' },
        { status: 400 }
      );
    }

    const { data: duplicateDepartments } = await supabaseAdmin
      .from('phong_ban')
      .select('id')
      .eq('to_chuc_id', context.user.to_chuc_id)
      .ilike('ten', validated.ten)
      .neq('id', id)
      .limit(1);

    if (duplicateDepartments?.length) {
      return NextResponse.json(
        { error: 'Tên phòng ban này đã tồn tại trong tổ chức.' },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('phong_ban')
      .update({
        ten: validated.ten,
        mo_ta: validated.mo_ta || null,
        cap_nhat_cuoi: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('to_chuc_id', context.user.to_chuc_id)
      .select('*')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Không thể cập nhật phòng ban.' },
        { status: 400 }
      );
    }

    await supabaseAdmin
      .from('nguoi_dung')
      .update({
        ten_phong_ban: validated.ten,
      })
      .eq('to_chuc_id', context.user.to_chuc_id)
      .eq('phong_ban_id', id);

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' },
        { status: 400 }
      );
    }

    console.error('Error in PATCH /api/phong-ban/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
