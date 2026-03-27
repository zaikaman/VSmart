import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const updateSkillSchema = z
  .object({
    trinh_do: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    nam_kinh_nghiem: z.coerce
      .number({ error: 'Số năm kinh nghiệm không hợp lệ.' })
      .int('Số năm kinh nghiệm phải là số nguyên.')
      .min(0, 'Số năm kinh nghiệm không được âm.')
      .max(50, 'Số năm kinh nghiệm tối đa là 50.')
      .optional(),
  })
  .strict()
  .refine((value) => value.trinh_do !== undefined || value.nam_kinh_nghiem !== undefined, {
    message: 'Không có dữ liệu để cập nhật.',
  });

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
    const validated = updateSkillSchema.parse(body);

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
    if (validated.trinh_do !== undefined) {
      updateData.trinh_do = validated.trinh_do;
    }
    if (validated.nam_kinh_nghiem !== undefined) {
      updateData.nam_kinh_nghiem = validated.nam_kinh_nghiem;
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Dữ liệu kỹ năng không hợp lệ.' },
        { status: 400 }
      );
    }

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
