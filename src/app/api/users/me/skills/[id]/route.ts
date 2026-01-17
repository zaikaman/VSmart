import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// PATCH /api/users/me/skills/[id] - Cập nhật kỹ năng
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const { trinh_do, nam_kinh_nghiem } = body;

    // Lấy ID người dùng từ bảng nguoi_dung
    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('id')
      .eq('email', user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    // Kiểm tra skill thuộc về user hiện tại
    const { data: existingSkill, error: skillError } = await supabase
      .from('ky_nang_nguoi_dung')
      .select('*')
      .eq('id', id)
      .eq('nguoi_dung_id', userData.id)
      .single();

    if (skillError || !existingSkill) {
      return NextResponse.json(
        { error: 'Không tìm thấy kỹ năng hoặc bạn không có quyền chỉnh sửa' },
        { status: 404 }
      );
    }

    // Chuẩn bị dữ liệu cập nhật
    const updateData: Record<string, unknown> = {};

    if (trinh_do !== undefined) {
      const validTrinhDo = ['beginner', 'intermediate', 'advanced', 'expert'];
      if (!validTrinhDo.includes(trinh_do)) {
        return NextResponse.json(
          { error: 'Trình độ không hợp lệ' },
          { status: 400 }
        );
      }
      updateData.trinh_do = trinh_do;
    }

    if (nam_kinh_nghiem !== undefined) {
      if (typeof nam_kinh_nghiem !== 'number' || nam_kinh_nghiem < 0) {
        return NextResponse.json(
          { error: 'Số năm kinh nghiệm không hợp lệ' },
          { status: 400 }
        );
      }
      updateData.nam_kinh_nghiem = Math.min(nam_kinh_nghiem, 50);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Không có dữ liệu để cập nhật' },
        { status: 400 }
      );
    }

    // Cập nhật kỹ năng
    const { data: updatedSkill, error: updateError } = await supabase
      .from('ky_nang_nguoi_dung')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating skill:', updateError);
      return NextResponse.json(
        { error: 'Không thể cập nhật kỹ năng' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedSkill });
  } catch (error) {
    console.error('Error in PATCH /api/users/me/skills/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/me/skills/[id] - Xóa kỹ năng
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    
    // Lấy thông tin user hiện tại
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Lấy ID người dùng từ bảng nguoi_dung
    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('id')
      .eq('email', user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    // Kiểm tra skill thuộc về user hiện tại và xóa
    const { error: deleteError } = await supabase
      .from('ky_nang_nguoi_dung')
      .delete()
      .eq('id', id)
      .eq('nguoi_dung_id', userData.id);

    if (deleteError) {
      console.error('Error deleting skill:', deleteError);
      return NextResponse.json(
        { error: 'Không thể xóa kỹ năng' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Đã xóa kỹ năng thành công' });
  } catch (error) {
    console.error('Error in DELETE /api/users/me/skills/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
