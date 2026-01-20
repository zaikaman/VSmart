import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendProjectInvitationEmail } from '@/lib/email/project-invitation';

export interface ProjectMember {
  id: string;
  du_an_id: string;
  nguoi_dung_id: string | null;
  email: string;
  vai_tro: 'owner' | 'admin' | 'member' | 'viewer';
  trang_thai: 'pending' | 'active' | 'declined';
  ngay_moi: string;
  ngay_tham_gia: string | null;
  nguoi_moi_id: string;
  nguoi_dung?: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  };
}

// GET /api/project-members?projectId=xxx - Lấy danh sách thành viên của dự án
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId là bắt buộc' },
        { status: 400 }
      );
    }

    // Lấy thông tin user hiện tại
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Lấy danh sách thành viên
    const { data: members, error } = await supabase
      .from('thanh_vien_du_an')
      .select(`
        *,
        nguoi_dung:nguoi_dung_id (
          id,
          ten,
          email,
          avatar_url
        )
      `)
      .eq('du_an_id', projectId)
      .order('ngay_moi', { ascending: false });

    if (error) {
      console.error('Error fetching project members:', error);
      return NextResponse.json(
        { error: 'Không thể lấy danh sách thành viên' },
        { status: 500 }
      );
    }

    return NextResponse.json(members || []);
  } catch (error) {
    console.error('Error fetching project members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/project-members - Mời thành viên vào dự án
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
    const { du_an_id, email, vai_tro = 'member' } = body;

    if (!du_an_id || !email) {
      return NextResponse.json(
        { error: 'du_an_id và email là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email không hợp lệ' },
        { status: 400 }
      );
    }

    // Lấy ID người mời
    const { data: inviterData, error: inviterError } = await supabase
      .from('nguoi_dung')
      .select('id')
      .eq('email', user.email)
      .single();

    if (inviterError) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin người mời' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền mời (phải là owner hoặc admin)
    const { data: memberCheck, error: memberCheckError } = await supabase
      .from('thanh_vien_du_an')
      .select('vai_tro')
      .eq('du_an_id', du_an_id)
      .eq('email', user.email)
      .eq('trang_thai', 'active')
      .single();

    // Hoặc là người tạo dự án
    const { data: projectCheck } = await supabase
      .from('du_an')
      .select('nguoi_tao_id')
      .eq('id', du_an_id)
      .single();

    const isOwnerOrAdmin = memberCheck && ['owner', 'admin'].includes(memberCheck.vai_tro);
    const isCreator = projectCheck && projectCheck.nguoi_tao_id === inviterData.id;

    if (!isOwnerOrAdmin && !isCreator) {
      return NextResponse.json(
        { error: 'Bạn không có quyền mời thành viên vào dự án này' },
        { status: 403 }
      );
    }

    // Kiểm tra xem email đã được mời chưa
    const { data: existingMember } = await supabase
      .from('thanh_vien_du_an')
      .select('*')
      .eq('du_an_id', du_an_id)
      .eq('email', email)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'Email này đã được mời vào dự án' },
        { status: 400 }
      );
    }

    // Tìm user với email này
    const { data: invitedUser } = await supabase
      .from('nguoi_dung')
      .select('id')
      .eq('email', email)
      .single();

    // Tạo lời mời
    const { data: member, error: createError } = await supabase
      .from('thanh_vien_du_an')
      .insert({
        du_an_id,
        nguoi_dung_id: invitedUser?.id || null,
        email,
        vai_tro,
        trang_thai: 'pending',
        nguoi_moi_id: inviterData.id,
      })
      .select(`
        *,
        nguoi_dung:nguoi_dung_id (
          id,
          ten,
          email,
          avatar_url
        )
      `)
      .single();

    if (createError) {
      console.error('Error creating member invitation:', createError);
      return NextResponse.json(
        { error: 'Không thể tạo lời mời' },
        { status: 500 }
      );
    }

    // Lấy thông tin dự án và người mời
    const { data: projectInfo } = await supabase
      .from('du_an')
      .select('ten')
      .eq('id', du_an_id)
      .single();

    const { data: inviterInfo } = await supabase
      .from('nguoi_dung')
      .select('ten, email')
      .eq('id', inviterData.id)
      .single();

    // Tạo thông báo trong app nếu user đã tồn tại
    if (invitedUser?.id) {
      await supabase
        .from('thong_bao')
        .insert({
          nguoi_dung_id: invitedUser.id,
          loai: 'project_invitation',
          noi_dung: `${inviterInfo?.ten || 'Ai đó'} đã mời bạn tham gia dự án "${projectInfo?.ten || 'một dự án'}"`,
          du_an_lien_quan_id: du_an_id,
          thanh_vien_du_an_id: member.id,
        });

      // Socket broadcast đã bị vô hiệu hóa - sử dụng polling thay thế
      // Notification sẽ được hiển thị qua polling mỗi 10 giây
    }

    // Gửi email thông báo
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const acceptUrl = `${baseUrl}/dashboard?tab=invitations`;
      
      await sendProjectInvitationEmail({
        to: email,
        projectName: projectInfo?.ten || 'Dự án',
        inviterName: inviterInfo?.ten || 'Người dùng',
        inviterEmail: inviterInfo?.email || '',
        role: vai_tro,
        acceptUrl,
      });
      
      console.log(`Invitation email sent to ${email}`);
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Không throw error vì lời mời đã được tạo thành công
    }

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Error inviting project member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/project-members - Cập nhật trạng thái hoặc vai trò thành viên
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
    const { member_id, trang_thai, vai_tro } = body;

    if (!member_id) {
      return NextResponse.json(
        { error: 'member_id là bắt buộc' },
        { status: 400 }
      );
    }

    // Lấy thông tin membership
    const { data: memberData, error: memberError } = await supabase
      .from('thanh_vien_du_an')
      .select('*, du_an:du_an_id(nguoi_tao_id)')
      .eq('id', member_id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: 'Không tìm thấy thành viên' },
        { status: 404 }
      );
    }

    // Nếu cập nhật trạng thái (accept/decline), chỉ chính user đó mới được làm
    if (trang_thai && memberData.email !== user.email) {
      return NextResponse.json(
        { error: 'Bạn chỉ có thể cập nhật trạng thái của chính mình' },
        { status: 403 }
      );
    }

    // Nếu cập nhật vai trò, cần quyền owner/admin
    if (vai_tro) {
      const { data: userData } = await supabase
        .from('nguoi_dung')
        .select('id')
        .eq('email', user.email)
        .single();

      const { data: requesterMember } = await supabase
        .from('thanh_vien_du_an')
        .select('vai_tro')
        .eq('du_an_id', memberData.du_an_id)
        .eq('email', user.email)
        .eq('trang_thai', 'active')
        .single();

      const isOwnerOrAdmin = requesterMember && ['owner', 'admin'].includes(requesterMember.vai_tro);
      const isCreator = memberData.du_an?.nguoi_tao_id === userData?.id;

      if (!isOwnerOrAdmin && !isCreator) {
        return NextResponse.json(
          { error: 'Bạn không có quyền thay đổi vai trò thành viên' },
          { status: 403 }
        );
      }
    }

    // Cập nhật
    const updateData: any = {};
    if (trang_thai) updateData.trang_thai = trang_thai;
    if (vai_tro) updateData.vai_tro = vai_tro;

    const { data: updatedMember, error: updateError } = await supabase
      .from('thanh_vien_du_an')
      .update(updateData)
      .eq('id', member_id)
      .select(`
        *,
        nguoi_dung:nguoi_dung_id (
          id,
          ten,
          email,
          avatar_url
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating member:', updateError);
      return NextResponse.json(
        { error: 'Không thể cập nhật thành viên' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('Error updating project member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/project-members?memberId=xxx - Xóa thành viên khỏi dự án
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId là bắt buộc' },
        { status: 400 }
      );
    }

    // Lấy thông tin user hiện tại
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Lấy thông tin membership
    const { data: memberData, error: memberError } = await supabase
      .from('thanh_vien_du_an')
      .select('*, du_an:du_an_id(nguoi_tao_id)')
      .eq('id', memberId)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: 'Không tìm thấy thành viên' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền xóa
    const { data: userData } = await supabase
      .from('nguoi_dung')
      .select('id')
      .eq('email', user.email)
      .single();

    const { data: requesterMember } = await supabase
      .from('thanh_vien_du_an')
      .select('vai_tro')
      .eq('du_an_id', memberData.du_an_id)
      .eq('email', user.email)
      .eq('trang_thai', 'active')
      .single();

    const isOwnerOrAdmin = requesterMember && ['owner', 'admin'].includes(requesterMember.vai_tro);
    const isCreator = memberData.du_an?.nguoi_tao_id === userData?.id;
    const isSelf = memberData.email === user.email;

    if (!isOwnerOrAdmin && !isCreator && !isSelf) {
      return NextResponse.json(
        { error: 'Bạn không có quyền xóa thành viên này' },
        { status: 403 }
      );
    }

    // Không cho phép xóa owner nếu không phải chính họ
    if (memberData.vai_tro === 'owner' && !isSelf) {
      return NextResponse.json(
        { error: 'Không thể xóa owner của dự án' },
        { status: 400 }
      );
    }

    // Xóa thành viên
    const { error: deleteError } = await supabase
      .from('thanh_vien_du_an')
      .delete()
      .eq('id', memberId);

    if (deleteError) {
      console.error('Error deleting member:', deleteError);
      return NextResponse.json(
        { error: 'Không thể xóa thành viên' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
