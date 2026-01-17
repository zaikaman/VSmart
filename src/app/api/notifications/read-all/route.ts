import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * PATCH /api/notifications/read-all
 * Đánh dấu tất cả thông báo đã đọc
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Kiểm tra authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Lấy user ID
    const { data: userData } = await supabase
      .from('nguoi_dung')
      .select('id')
      .eq('email', user.email)
      .single();
    
    if (!userData) {
      return NextResponse.json(
        { error: 'User không tồn tại' },
        { status: 404 }
      );
    }
    
    // Cập nhật tất cả thông báo chưa đọc
    const { error } = await supabase
      .from('thong_bao')
      .update({ da_doc: true })
      .eq('nguoi_dung_id', userData.id)
      .eq('da_doc', false);
    
    if (error) {
      console.error('Error marking all notifications as read:', error);
      return NextResponse.json(
        { error: 'Lỗi khi cập nhật thông báo' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Đã đánh dấu tất cả thông báo là đã đọc',
    });
    
  } catch (error) {
    console.error('Error in PATCH /api/notifications/read-all:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
