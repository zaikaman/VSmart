import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { canManageOrganizationSettings, type AppRole } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type DepartmentStatus = 'active' | 'inactive' | 'merged';

const phongBanSchema = z.object({
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
    return {
      user: {
        ...dbUser,
        vai_tro: dbUser.vai_tro as AppRole,
      },
      hasOrganization: false,
    };
  }

  return {
    user: {
      ...dbUser,
      vai_tro: dbUser.vai_tro as AppRole,
    },
    hasOrganization: true,
  };
}

async function findDuplicateDepartmentName(toChucId: string, ten: string) {
  const { data } = await supabaseAdmin
    .from('phong_ban')
    .select('id')
    .eq('to_chuc_id', toChucId)
    .ilike('ten', ten)
    .limit(1);

  return data?.[0] || null;
}

export async function GET(request: NextRequest) {
  try {
    const context = await getCurrentUserOrgContext();

    if ('error' in context) {
      return context.error;
    }

    if (!context.hasOrganization) {
      return NextResponse.json({ data: [] });
    }

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true';

    let query = supabaseAdmin
      .from('phong_ban')
      .select('*')
      .eq('to_chuc_id', context.user.to_chuc_id);

    if (!includeInactive) {
      query = query.eq('trang_thai', 'active');
    }

    const { data, error } = await query.order('ten', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const mergedIds = (data || [])
      .map((department) => department.merged_into_id)
      .filter((value): value is string => Boolean(value));

    const mergedTargets =
      mergedIds.length > 0
        ? await supabaseAdmin
            .from('phong_ban')
            .select('id, ten')
            .in('id', mergedIds)
        : { data: [] as Array<{ id: string; ten: string }>, error: null };

    if (mergedTargets.error) {
      return NextResponse.json({ error: mergedTargets.error.message }, { status: 400 });
    }

    const mergedTargetMap = new Map(
      (mergedTargets.data || []).map((department) => [department.id, department])
    );

    const statusOrder: Record<DepartmentStatus, number> = {
      active: 0,
      inactive: 1,
      merged: 2,
    };

    const normalizedData: Array<
      (typeof data)[number] & {
        trang_thai: DepartmentStatus;
        merged_into: { id: string; ten: string } | null;
      }
    > = (data || [])
      .map((department) => ({
        ...department,
        trang_thai: department.trang_thai as DepartmentStatus,
        merged_into: department.merged_into_id
          ? mergedTargetMap.get(department.merged_into_id) || null
          : null,
      }))
      .sort((a, b) => {
        const statusDiff =
          statusOrder[a.trang_thai as DepartmentStatus] -
          statusOrder[b.trang_thai as DepartmentStatus];

        if (statusDiff !== 0) {
          return statusDiff;
        }

        return a.ten.localeCompare(b.ten, 'vi');
      });

    return NextResponse.json({ data: normalizedData });
  } catch (error) {
    console.error('Error in GET /api/phong-ban:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserOrgContext();

    if ('error' in context) {
      return context.error;
    }

    if (!context.hasOrganization) {
      return NextResponse.json(
        { error: 'Bạn cần thuộc một tổ chức trước khi tạo phòng ban.' },
        { status: 400 }
      );
    }

    if (!canManageOrganizationSettings(context.user.vai_tro)) {
      return NextResponse.json(
        { error: 'Bạn không có quyền quản lý phòng ban của tổ chức này.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = phongBanSchema.parse(body);

    const duplicate = await findDuplicateDepartmentName(context.user.to_chuc_id, validated.ten);
    if (duplicate) {
      return NextResponse.json(
        { error: 'Tên phòng ban này đã tồn tại trong tổ chức.' },
        { status: 409 }
      );
    }

    const timestamp = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('phong_ban')
      .insert({
        ten: validated.ten,
        mo_ta: validated.mo_ta || null,
        to_chuc_id: context.user.to_chuc_id,
        trang_thai: 'active',
        cap_nhat_cuoi: timestamp,
      })
      .select('*')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Không thể tạo phòng ban.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/phong-ban:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
