import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// GET /api/users/me - Lấy thông tin user hiện tại
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

    // Lấy thông tin chi tiết từ bảng nguoi_dung
    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select(`
        *,
        to_chuc:to_chuc_id (
          id,
          ten,
          mo_ta,
          logo_url
        )
      `)
      .eq('email', user.email)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/me - Cập nhật thông tin user hiện tại
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
    const { ten, ten_cong_ty, ten_phong_ban, avatar_url, onboarding_completed } = body;

    // Lấy ID người dùng hiện tại
    const { data: currentUser, error: getUserError } = await supabase
      .from('nguoi_dung')
      .select('id')
      .eq('email', user.email)
      .single();

    if (getUserError) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    // Chuẩn bị dữ liệu cập nhật
    const updateData: any = {};
    if (ten !== undefined) updateData.ten = ten;
    if (ten_cong_ty !== undefined) updateData.ten_cong_ty = ten_cong_ty;
    if (ten_phong_ban !== undefined) updateData.ten_phong_ban = ten_phong_ban;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (onboarding_completed !== undefined) updateData.onboarding_completed = onboarding_completed;

    // Cập nhật thông tin
    const { data: userData, error: updateError } = await supabase
      .from('nguoi_dung')
      .update(updateData)
      .eq('id', currentUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Không thể cập nhật thông tin người dùng' },
        { status: 500 }
      );
    }

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error updating current user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
