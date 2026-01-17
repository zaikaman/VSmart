import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * PATCH /api/notifications/[id]/read
 * Đánh dấu thông báo đã đọc
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { id } = await params;
    
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
    
    // Cập nhật thông báo (chỉ cho phép cập nhật thông báo của chính user)
    const { data: notification, error } = await supabase
      .from('thong_bao')
      .update({ da_doc: true })
      .eq('id', id)
      .eq('nguoi_dung_id', userData.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error marking notification as read:', error);
      return NextResponse.json(
        { error: 'Lỗi khi cập nhật thông báo' },
        { status: 500 }
      );
    }
    
    if (!notification) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông báo' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: notification,
    });
    
  } catch (error) {
    console.error('Error in PATCH /api/notifications/[id]/read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
