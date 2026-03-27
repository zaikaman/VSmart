import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const TEN_MIN_LENGTH = 2;
const TEN_MAX_LENGTH = 255;
const TEN_PATTERN = /^[\p{L}\p{M}\d .,'-]+$/u;

function validateTen(ten: unknown): { value?: string; error?: string } {
  if (ten === undefined) {
    return {};
  }

  if (typeof ten !== 'string') {
    return { error: 'Họ và tên phải là chuỗi ký tự hợp lệ.' };
  }

  const normalized = ten.trim();

  if (!normalized) {
    return { error: 'Họ và tên không được để trống.' };
  }

  if (normalized.length < TEN_MIN_LENGTH) {
    return { error: `Họ và tên phải có ít nhất ${TEN_MIN_LENGTH} ký tự.` };
  }

  if (normalized.length > TEN_MAX_LENGTH) {
    return { error: `Họ và tên không được vượt quá ${TEN_MAX_LENGTH} ký tự.` };
  }

  if (!TEN_PATTERN.test(normalized)) {
    return { error: "Họ và tên chỉ được chứa chữ, số, khoảng trắng và các ký tự . , ' -." };
  }

  return { value: normalized };
}

function mapUpdateUserError(error: { code?: string; message?: string } | null): string {
  if (!error) {
    return 'Không thể cập nhật thông tin người dùng lúc này. Vui lòng thử lại.';
  }

  if (error.code === '22001') {
    return `Giá trị nhập vào quá dài. Vui lòng rút gọn xuống tối đa ${TEN_MAX_LENGTH} ký tự.`;
  }

  if (error.code === '23514') {
    return 'Dữ liệu chưa đúng định dạng yêu cầu. Vui lòng kiểm tra lại thông tin đã nhập.';
  }

  if (error.code === '42501') {
    return 'Bạn không có quyền cập nhật thông tin này.';
  }

  if (error.message?.toLowerCase().includes('violates row-level security policy')) {
    return 'Bạn không có quyền cập nhật thông tin này.';
  }

  return 'Không thể cập nhật thông tin người dùng lúc này. Vui lòng thử lại.';
}

// GET /api/users/me - Lấy thông tin user hiện tại
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
      .select(
        `
        *,
        to_chuc:to_chuc_id (
          id,
          ten,
          mo_ta,
          logo_url
        )
      `
      )
      .eq('email', user.email)
      .single();

    if (userError) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin người dùng' }, { status: 404 });
    }

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/users/me - Cập nhật thông tin user hiện tại
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
    const { ten, ten_cong_ty, ten_phong_ban, avatar_url, onboarding_completed } = body;

    const tenValidation = validateTen(ten);
    if (tenValidation.error) {
      return NextResponse.json({ error: tenValidation.error }, { status: 400 });
    }

    const { data: currentUser, error: getUserError } = await supabase
      .from('nguoi_dung')
      .select('id, to_chuc_id')
      .eq('email', user.email)
      .single();

    if (getUserError || !currentUser) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin người dùng' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (tenValidation.value !== undefined) updateData.ten = tenValidation.value;
    if (ten_phong_ban !== undefined) updateData.ten_phong_ban = ten_phong_ban;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (onboarding_completed !== undefined) updateData.onboarding_completed = onboarding_completed;

    // Khi user đã thuộc một tổ chức thật, tên công ty chính thức phải lấy từ bảng to_chuc.
    if (ten_cong_ty !== undefined && !currentUser.to_chuc_id) {
      updateData.ten_cong_ty = ten_cong_ty;
    }

    const { data: userData, error: updateError } = await supabase
      .from('nguoi_dung')
      .update(updateData)
      .eq('id', currentUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json({ error: mapUpdateUserError(updateError) }, { status: 400 });
    }

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error updating current user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
