import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface Organization {
  id: string;
  ten: string;
  mo_ta: string | null;
  logo_url: string | null;
  settings: {
    allow_external_project_invites: boolean;
  };
  nguoi_tao_id: string;
  ngay_tao: string;
  cap_nhat_cuoi: string;
}

const defaultOrganizationSettings: Organization['settings'] = {
  allow_external_project_invites: false,
};

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

// GET /api/organizations - Lấy thông tin tổ chức của user hiện tại
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Lấy thông tin user hiện tại
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Lấy thông tin người dùng để có organization_id
    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('to_chuc_id')
      .eq('email', user.email)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    if (!userData.to_chuc_id) {
      return NextResponse.json(
        { error: 'Người dùng chưa thuộc tổ chức nào' },
        { status: 404 }
      );
    }

    // Lấy thông tin tổ chức
    const { data: organization, error: orgError } = await supabase
      .from('to_chuc')
      .select('*')
      .eq('id', userData.to_chuc_id)
      .single();

    if (orgError) {
      return NextResponse.json(
        { error: 'Không tìm thấy tổ chức' },
        { status: 404 }
      );
    }

    return NextResponse.json(normalizeOrganization(organization));
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/organizations - Tạo tổ chức mới
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Lấy thông tin user hiện tại
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ten, mo_ta, logo_url, settings } = body;

    if (!ten) {
      return NextResponse.json(
        { error: 'Tên tổ chức là bắt buộc' },
        { status: 400 }
      );
    }

    // Lấy ID người dùng
    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('id, to_chuc_id')
      .eq('email', user.email)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    // Kiểm tra user đã có tổ chức chưa
    if (userData.to_chuc_id) {
      return NextResponse.json(
        { error: 'Người dùng đã thuộc một tổ chức' },
        { status: 400 }
      );
    }

    // Tạo tổ chức mới
    const { data: organization, error: createError } = await supabase
      .from('to_chuc')
      .insert({
        ten,
        mo_ta,
        logo_url,
        settings: {
          ...defaultOrganizationSettings,
          ...(settings || {}),
        },
        nguoi_tao_id: userData.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating organization:', createError);
      return NextResponse.json(
        { error: 'Không thể tạo tổ chức' },
        { status: 500 }
      );
    }

    // Cập nhật organization_id cho user
    const { error: updateError } = await supabase
      .from('nguoi_dung')
      .update({ to_chuc_id: organization.id })
      .eq('id', userData.id);

    if (updateError) {
      console.error('Error updating user organization:', updateError);
      // Rollback: xóa organization vừa tạo
      await supabase.from('to_chuc').delete().eq('id', organization.id);
      return NextResponse.json(
        { error: 'Không thể cập nhật thông tin người dùng' },
        { status: 500 }
      );
    }

    return NextResponse.json(normalizeOrganization(organization), { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/organizations - Cập nhật thông tin tổ chức
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Lấy thông tin user hiện tại
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ten, mo_ta, logo_url, settings } = body;

    // Lấy thông tin người dùng
    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('id, to_chuc_id')
      .eq('email', user.email)
      .single();

    if (userError || !userData.to_chuc_id) {
      return NextResponse.json(
        { error: 'Không tìm thấy tổ chức' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền (chỉ người tạo mới được update)
    const { data: orgData, error: orgError } = await supabase
      .from('to_chuc')
      .select('nguoi_tao_id')
      .eq('id', userData.to_chuc_id)
      .single();

    if (orgError) {
      return NextResponse.json(
        { error: 'Không tìm thấy tổ chức' },
        { status: 404 }
      );
    }

    if (orgData.nguoi_tao_id !== userData.id) {
      return NextResponse.json(
        { error: 'Bạn không có quyền cập nhật tổ chức này' },
        { status: 403 }
      );
    }

    // Cập nhật thông tin
    const updateData: Record<string, unknown> = {};
    if (ten !== undefined) updateData.ten = ten;
    if (mo_ta !== undefined) updateData.mo_ta = mo_ta;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (settings !== undefined) {
      updateData.settings = {
        ...defaultOrganizationSettings,
        ...((settings || {}) as Partial<Organization['settings']>),
      };
    }

    const { data: organization, error: updateError } = await supabase
      .from('to_chuc')
      .update(updateData)
      .eq('id', userData.to_chuc_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return NextResponse.json(
        { error: 'Không thể cập nhật tổ chức' },
        { status: 500 }
      );
    }

    return NextResponse.json(normalizeOrganization(organization));
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
