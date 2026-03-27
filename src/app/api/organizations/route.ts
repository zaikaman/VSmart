import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canManageOrganizationSettings, type AppRole } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/client';

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

const createOrganizationSchema = z.object({
  ten: z
    .string({ error: 'Tên tổ chức là bắt buộc.' })
    .trim()
    .min(1, 'Tên tổ chức là bắt buộc.')
    .max(120, 'Tên tổ chức không được vượt quá 120 ký tự.'),
  mo_ta: z.string().trim().max(500, 'Mô tả không được vượt quá 500 ký tự.').optional(),
  logo_url: z.url('Logo URL không hợp lệ.').optional(),
  settings: organizationSettingsSchema.optional(),
});

const updateOrganizationSchema = z
  .object({
    ten: z.string().trim().min(1, 'Tên tổ chức là bắt buộc.').max(120, 'Tên tổ chức không được vượt quá 120 ký tự.').optional(),
    mo_ta: z.string().trim().max(500, 'Mô tả không được vượt quá 500 ký tự.').optional(),
    logo_url: z.union([z.url('Logo URL không hợp lệ.'), z.literal('')]).optional(),
    settings: organizationSettingsSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Cần ít nhất một trường để cập nhật tổ chức.',
  });

function normalizeOrganization<T extends Partial<Organization> & { settings?: Partial<Organization['settings']> | null }>(
  organization: T
): T & { settings: Organization['settings'] } {
  return {
    ...organization,
    settings: {
      ...defaultOrganizationSettings,
      ...(organization.settings || {}),
    },
  };
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
      return NextResponse.json({ error: 'Không thể tạo tổ chức' }, { status: 500 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('nguoi_dung')
      .update({ to_chuc_id: organization.id, vai_tro: 'owner' })
      .eq('id', userData.id);

    if (updateError) {
      console.error('Error updating user organization:', updateError);
      await supabaseAdmin.from('to_chuc').delete().eq('id', organization.id);
      return NextResponse.json({ error: 'Không thể cập nhật thông tin người dùng' }, { status: 500 });
    }

    return NextResponse.json(normalizeOrganization(organization), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, { status: 400 });
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
      return NextResponse.json({ error: 'Bạn không có quyền cập nhật tổ chức này' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (validated.ten !== undefined) updateData.ten = validated.ten;
    if (validated.mo_ta !== undefined) updateData.mo_ta = validated.mo_ta || null;
    if (validated.logo_url !== undefined) updateData.logo_url = validated.logo_url || null;
    if (validated.settings !== undefined) {
      const existingSettings = await getNormalizedOrganizationSettings(userData.to_chuc_id);

      if (!existingSettings) {
        return NextResponse.json({ error: 'Không tìm thấy cấu hình tổ chức hiện tại' }, { status: 404 });
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
      return NextResponse.json({ error: 'Không thể cập nhật tổ chức' }, { status: 500 });
    }

    return NextResponse.json(normalizeOrganization(organization));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }

    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
