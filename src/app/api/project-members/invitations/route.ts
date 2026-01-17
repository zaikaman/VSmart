import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/project-members/invitations
 * Lấy danh sách lời mời dự án đang chờ của user hiện tại
 */
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

    // Lấy danh sách lời mời đang pending cho email của user
    const { data: invitations, error } = await supabase
      .from('thanh_vien_du_an')
      .select(`
        *,
        du_an:du_an_id (
          id,
          ten,
          mo_ta
        ),
        nguoi_moi:nguoi_moi_id (
          id,
          ten,
          email,
          avatar_url
        )
      `)
      .eq('email', user.email)
      .eq('trang_thai', 'pending')
      .order('ngay_moi', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return NextResponse.json(
        { error: 'Không thể lấy danh sách lời mời' },
        { status: 500 }
      );
    }

    return NextResponse.json(invitations || []);
  } catch (error) {
    console.error('Error in GET /api/project-members/invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/project-members/invitations/accept
 * Chấp nhận lời mời vào dự án
 */
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
    const { invitation_id, action } = body; // action: 'accept' hoặc 'decline'

    if (!invitation_id || !action) {
      return NextResponse.json(
        { error: 'invitation_id và action là bắt buộc' },
        { status: 400 }
      );
    }

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'action phải là "accept" hoặc "decline"' },
        { status: 400 }
      );
    }

    // Lấy thông tin lời mời
    const { data: invitation, error: invitationError } = await supabase
      .from('thanh_vien_du_an')
      .select('*')
      .eq('id', invitation_id)
      .eq('email', user.email)
      .eq('trang_thai', 'pending')
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Không tìm thấy lời mời hoặc lời mời đã được xử lý' },
        { status: 404 }
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
        { error: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    // Cập nhật trạng thái
    const updateData: any = {
      trang_thai: action === 'accept' ? 'active' : 'declined',
      nguoi_dung_id: userData.id,
    };

    if (action === 'accept') {
      updateData.ngay_tham_gia = new Date().toISOString();
    }

    const { data: updatedInvitation, error: updateError } = await supabase
      .from('thanh_vien_du_an')
      .update(updateData)
      .eq('id', invitation_id)
      .select(`
        *,
        du_an:du_an_id (
          id,
          ten,
          mo_ta
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      return NextResponse.json(
        { error: 'Không thể cập nhật lời mời' },
        { status: 500 }
      );
    }

    // Xóa thông báo liên quan
    await supabase
      .from('thong_bao')
      .delete()
      .eq('thanh_vien_du_an_id', invitation_id);

    return NextResponse.json({
      success: true,
      message: action === 'accept' ? 'Đã chấp nhận lời mời' : 'Đã từ chối lời mời',
      data: updatedInvitation,
    });
  } catch (error) {
    console.error('Error in POST /api/project-members/invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
