import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const skillLevelSchema = z.enum(['beginner', 'intermediate', 'advanced', 'expert']);

const createSkillSchema = z.object({
  ten_ky_nang: z
    .string({ error: 'Tên kỹ năng không được để trống.' })
    .trim()
    .min(1, 'Tên kỹ năng không được để trống.')
    .max(80, 'Tên kỹ năng không được vượt quá 80 ký tự.'),
  trinh_do: skillLevelSchema,
  nam_kinh_nghiem: z.coerce
    .number({ error: 'Số năm kinh nghiệm không hợp lệ.' })
    .int('Số năm kinh nghiệm phải là số nguyên.')
    .min(0, 'Số năm kinh nghiệm không được âm.')
    .max(50, 'Số năm kinh nghiệm tối đa là 50.')
    .optional()
    .default(0),
});

// GET /api/users/me/skills - Lấy danh sách kỹ năng của user hiện tại
export async function GET() {
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

    // Lấy danh sách kỹ năng
    const { data: skills, error: skillsError } = await supabase
      .from('ky_nang_nguoi_dung')
      .select('*')
      .eq('nguoi_dung_id', userData.id)
      .order('ten_ky_nang', { ascending: true });

    if (skillsError) {
      console.error('Error fetching skills:', skillsError);
      return NextResponse.json(
        { error: 'Không thể lấy danh sách kỹ năng' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: skills || [] });
  } catch (error) {
    console.error('Error in GET /api/users/me/skills:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users/me/skills - Thêm kỹ năng mới
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
    const validated = createSkillSchema.parse(body);

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

    // Kiểm tra kỹ năng đã tồn tại chưa
    const { data: existingSkill } = await supabase
      .from('ky_nang_nguoi_dung')
      .select('id')
      .eq('nguoi_dung_id', userData.id)
      .ilike('ten_ky_nang', validated.ten_ky_nang)
      .maybeSingle();

    if (existingSkill) {
      return NextResponse.json(
        { error: 'Kỹ năng này đã tồn tại' },
        { status: 409 }
      );
    }

    // Thêm kỹ năng mới
    const { data: newSkill, error: insertError } = await supabase
      .from('ky_nang_nguoi_dung')
      .insert({
        nguoi_dung_id: userData.id,
        ten_ky_nang: validated.ten_ky_nang,
        trinh_do: validated.trinh_do,
        nam_kinh_nghiem: validated.nam_kinh_nghiem,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting skill:', insertError);
      return NextResponse.json(
        { error: 'Không thể thêm kỹ năng' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newSkill }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Dữ liệu kỹ năng không hợp lệ.' },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/users/me/skills:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
