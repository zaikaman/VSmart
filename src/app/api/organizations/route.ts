import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canManageOrganizationSettings, type AppRole } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/client';
import {
  normalizeOrganizationName,
  validateOrganizationName,
} from '@/lib/validation/organization-name';

export interface Organization {
  id: string;
  ten: string;
  mo_ta: string | null;
  logo_url: string | null;
  settings: {
    allow_external_project_invites: boolean;
    allow_join_requests: boolean;
  };
  nguoi_tao_id: string;
  ngay_tao: string;
  cap_nhat_cuoi: string;
}

const defaultOrganizationSettings: Organization['settings'] = {
  allow_external_project_invites: false,
  allow_join_requests: false,
};

const organizationSettingsSchema = z
  .object({
    allow_external_project_invites: z.boolean().optional(),
    allow_join_requests: z.boolean().optional(),
  })
  .strict();

const organizationNameSchema = z
  .string({ error: 'Tên tổ chức là bắt buộc.' })
  .transform(value => normalizeOrganizationName(value))
  .superRefine((value, context) => {
    const error = validateOrganizationName(value);

    if (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
      });
    }
  });

const createOrganizationSchema = z.object({
  ten: organizationNameSchema,
  mo_ta: z.string().trim().max(500, 'Mô tả không được vượt quá 500 ký tự.').optional(),
  logo_url: z.url('Logo URL không hợp lệ.').optional(),
  settings: organizationSettingsSchema.optional(),
});

const updateOrganizationSchema = z
  .object({
    ten: organizationNameSchema.optional(),
    mo_ta: z.string().trim().max(500, 'Mô tả không được vượt quá 500 ký tự.').optional(),
    logo_url: z.union([z.url('Logo URL không hợp lệ.'), z.literal('')]).optional(),
    settings: organizationSettingsSchema.optional(),
  })
  .refine(value => Object.keys(value).length > 0, {
    message: 'Cần ít nhất một trường để cập nhật tổ chức.',
  });

const deleteOrganizationSchema = z.object({
  confirmation_name: z
    .string({ error: 'Cần nhập tên tổ chức để xác nhận.' })
    .transform(value => normalizeOrganizationName(value)),
});

function normalizeOrganization<
  T extends Partial<Organization> & { settings?: Partial<Organization['settings']> | null },
>(organization: T): T & { settings: Organization['settings'] } {
  return {
    ...organization,
    settings: {
      ...defaultOrganizationSettings,
      ...(organization.settings || {}),
    },
  };
}

async function findDuplicateOrganizationName(ten: string, excludeId?: string) {
  let query = supabaseAdmin.from('to_chuc').select('id').ilike('ten', ten).limit(1);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data } = await query;
  return data?.[0] || null;
}

function isDuplicateOrganizationError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === '23505' || error?.message?.toLowerCase().includes('duplicate key') === true
  );
}

async function getNormalizedOrganizationSettings(organizationId: string) {
  const { data: organization, error } = await supabaseAdmin
    .from('to_chuc')
    .select('settings')
    .eq('id', organizationId)
    .single();

  if (error || !organization) {
    return null;
  }

  return normalizeOrganization(organization).settings;
}

// GET /api/organizations - Lấy thông tin tổ chức của user hiện tại
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('to_chuc_id')
      .eq('email', user.email)
      .single();

    if (userError) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin người dùng' }, { status: 404 });
    }

    if (!userData.to_chuc_id) {
      return NextResponse.json({ error: 'Người dùng chưa thuộc tổ chức nào' }, { status: 404 });
    }

    const { data: organization, error: orgError } = await supabase
      .from('to_chuc')
      .select('*')
      .eq('id', userData.to_chuc_id)
      .single();

    if (orgError) {
      return NextResponse.json({ error: 'Không tìm thấy tổ chức' }, { status: 404 });
    }

    return NextResponse.json(normalizeOrganization(organization));
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/organizations - Tạo tổ chức mới
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createOrganizationSchema.parse(body);

    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('id, to_chuc_id')
      .eq('email', user.email)
      .single();

    if (userError) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin người dùng' }, { status: 404 });
    }

    if (userData.to_chuc_id) {
      return NextResponse.json({ error: 'Người dùng đã thuộc một tổ chức' }, { status: 400 });
    }

    const duplicateOrganization = await findDuplicateOrganizationName(validated.ten);
    if (duplicateOrganization) {
      return NextResponse.json(
        { error: 'Tên tổ chức này đã tồn tại. Vui lòng chọn tên khác.' },
        { status: 409 }
      );
    }

    const { data: organization, error: createError } = await supabaseAdmin
      .from('to_chuc')
      .insert({
        ten: validated.ten,
        mo_ta: validated.mo_ta || null,
        logo_url: validated.logo_url || null,
        settings: {
          ...defaultOrganizationSettings,
          ...(validated.settings || {}),
        },
        nguoi_tao_id: userData.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating organization:', createError);

      if (isDuplicateOrganizationError(createError)) {
        return NextResponse.json(
          { error: 'Tên tổ chức này đã tồn tại. Vui lòng chọn tên khác.' },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: 'Không thể tạo tổ chức' }, { status: 500 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('nguoi_dung')
      .update({ to_chuc_id: organization.id, vai_tro: 'owner' })
      .eq('id', userData.id);

    if (updateError) {
      console.error('Error updating user organization:', updateError);
      await supabaseAdmin.from('to_chuc').delete().eq('id', organization.id);
      return NextResponse.json(
        { error: 'Không thể cập nhật thông tin người dùng' },
        { status: 500 }
      );
    }

    return NextResponse.json(normalizeOrganization(organization), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' },
        { status: 400 }
      );
    }

    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/organizations - Cập nhật thông tin tổ chức
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateOrganizationSchema.parse(body);

    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('id, to_chuc_id, vai_tro')
      .eq('email', user.email)
      .single();

    if (userError || !userData?.to_chuc_id) {
      return NextResponse.json({ error: 'Không tìm thấy tổ chức' }, { status: 404 });
    }

    if (!canManageOrganizationSettings(userData.vai_tro as AppRole)) {
      return NextResponse.json(
        { error: 'Bạn không có quyền cập nhật tổ chức này' },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (validated.ten !== undefined) {
      const duplicateOrganization = await findDuplicateOrganizationName(
        validated.ten,
        userData.to_chuc_id
      );

      if (duplicateOrganization) {
        return NextResponse.json(
          { error: 'Tên tổ chức này đã tồn tại. Vui lòng chọn tên khác.' },
          { status: 409 }
        );
      }

      updateData.ten = validated.ten;
    }
    if (validated.mo_ta !== undefined) updateData.mo_ta = validated.mo_ta || null;
    if (validated.logo_url !== undefined) updateData.logo_url = validated.logo_url || null;
    if (validated.settings !== undefined) {
      const existingSettings = await getNormalizedOrganizationSettings(userData.to_chuc_id);

      if (!existingSettings) {
        return NextResponse.json(
          { error: 'Không tìm thấy cấu hình tổ chức hiện tại' },
          { status: 404 }
        );
      }

      updateData.settings = {
        ...existingSettings,
        ...(validated.settings as Partial<Organization['settings']>),
      };
    }

    const { data: organization, error: updateError } = await supabaseAdmin
      .from('to_chuc')
      .update(updateData)
      .eq('id', userData.to_chuc_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating organization:', updateError);

      if (isDuplicateOrganizationError(updateError)) {
        return NextResponse.json(
          { error: 'Tên tổ chức này đã tồn tại. Vui lòng chọn tên khác.' },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: 'Không thể cập nhật tổ chức' }, { status: 500 });
    }

    return NextResponse.json(normalizeOrganization(organization));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' },
        { status: 400 }
      );
    }

    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/organizations - Xóa tổ chức hiện tại
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = deleteOrganizationSchema.parse(body);

    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('id, to_chuc_id, vai_tro')
      .eq('email', user.email)
      .single();

    if (userError || !userData?.to_chuc_id) {
      return NextResponse.json({ error: 'Không tìm thấy tổ chức để xóa' }, { status: 404 });
    }

    if (userData.vai_tro !== 'owner') {
      return NextResponse.json(
        { error: 'Chỉ chủ tổ chức mới có thể xóa workspace này' },
        { status: 403 }
      );
    }

    const { data: organization, error: organizationError } = await supabaseAdmin
      .from('to_chuc')
      .select('id, ten')
      .eq('id', userData.to_chuc_id)
      .single();

    if (organizationError || !organization) {
      return NextResponse.json({ error: 'Không tìm thấy tổ chức' }, { status: 404 });
    }

    if (validated.confirmation_name !== normalizeOrganizationName(organization.ten)) {
      return NextResponse.json(
        { error: 'Tên xác nhận chưa khớp với tên tổ chức hiện tại' },
        { status: 400 }
      );
    }

    const { count: memberCount, error: memberCountError } = await supabaseAdmin
      .from('nguoi_dung')
      .select('id', { count: 'exact', head: true })
      .eq('to_chuc_id', organization.id);

    if (memberCountError) {
      return NextResponse.json(
        { error: 'Không thể kiểm tra số lượng thành viên hiện tại' },
        { status: 500 }
      );
    }

    if ((memberCount || 0) > 1) {
      return NextResponse.json(
        {
          error: `Tổ chức vẫn còn ${memberCount} thành viên. Hãy chuyển hoặc gỡ các thành viên khác trước khi xóa.`,
        },
        { status: 400 }
      );
    }

    const { count: activeProjectCount, error: activeProjectCountError } = await supabaseAdmin
      .from('du_an')
      .select('id', { count: 'exact', head: true })
      .eq('to_chuc_id', organization.id)
      .is('deleted_at', null);

    if (activeProjectCountError) {
      return NextResponse.json(
        { error: 'Không thể kiểm tra danh sách dự án hiện tại' },
        { status: 500 }
      );
    }

    if ((activeProjectCount || 0) > 0) {
      return NextResponse.json(
        {
          error: `Tổ chức vẫn còn ${activeProjectCount} dự án đang hoạt động. Hãy xóa hoặc đóng toàn bộ dự án trước khi xóa workspace.`,
        },
        { status: 400 }
      );
    }

    const { error: detachProjectError } = await supabaseAdmin
      .from('du_an')
      .update({ to_chuc_id: null })
      .eq('to_chuc_id', organization.id);

    if (detachProjectError) {
      return NextResponse.json(
        { error: 'Không thể xử lý dữ liệu dự án cũ của tổ chức' },
        { status: 500 }
      );
    }

    const { error: deleteInvitationError } = await supabaseAdmin
      .from('loi_moi_to_chuc')
      .delete()
      .eq('to_chuc_id', organization.id);

    if (deleteInvitationError) {
      return NextResponse.json(
        { error: 'Không thể dọn lời mời tổ chức trước khi xóa' },
        { status: 500 }
      );
    }

    const { error: deleteJoinRequestError } = await supabaseAdmin
      .from('yeu_cau_gia_nhap_to_chuc')
      .delete()
      .eq('to_chuc_id', organization.id);

    if (deleteJoinRequestError) {
      return NextResponse.json(
        { error: 'Không thể dọn yêu cầu gia nhập trước khi xóa' },
        { status: 500 }
      );
    }

    const { error: detachMembersError } = await supabaseAdmin
      .from('nguoi_dung')
      .update({
        to_chuc_id: null,
        vai_tro: 'member',
        phong_ban_id: null,
        ten_cong_ty: null,
        ten_phong_ban: null,
      })
      .eq('to_chuc_id', organization.id);

    if (detachMembersError) {
      return NextResponse.json(
        { error: 'Không thể tách thành viên ra khỏi tổ chức' },
        { status: 500 }
      );
    }

    const { error: deleteDepartmentsError } = await supabaseAdmin
      .from('phong_ban')
      .delete()
      .eq('to_chuc_id', organization.id);

    if (deleteDepartmentsError) {
      return NextResponse.json(
        { error: 'Không thể xóa dữ liệu phòng ban của tổ chức' },
        { status: 500 }
      );
    }

    const { error: deleteOrganizationError } = await supabaseAdmin
      .from('to_chuc')
      .delete()
      .eq('id', organization.id);

    if (deleteOrganizationError) {
      return NextResponse.json({ error: 'Không thể xóa tổ chức' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Đã xóa tổ chức thành công' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' },
        { status: 400 }
      );
    }

    console.error('Error deleting organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
