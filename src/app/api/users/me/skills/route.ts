import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
    const { ten_ky_nang, trinh_do, nam_kinh_nghiem } = body;

    // Validation
    if (!ten_ky_nang || typeof ten_ky_nang !== 'string' || ten_ky_nang.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tên kỹ năng không được để trống' },
        { status: 400 }
      );
    }

    const validTrinhDo = ['beginner', 'intermediate', 'advanced', 'expert'];
    if (!trinh_do || !validTrinhDo.includes(trinh_do)) {
      return NextResponse.json(
        { error: 'Trình độ không hợp lệ' },
        { status: 400 }
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

    // Kiểm tra kỹ năng đã tồn tại chưa
    const { data: existingSkill } = await supabase
      .from('ky_nang_nguoi_dung')
      .select('id')
      .eq('nguoi_dung_id', userData.id)
      .ilike('ten_ky_nang', ten_ky_nang.trim())
      .single();

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
        ten_ky_nang: ten_ky_nang.trim(),
        trinh_do,
        nam_kinh_nghiem: typeof nam_kinh_nghiem === 'number' && nam_kinh_nghiem >= 0 
          ? Math.min(nam_kinh_nghiem, 50) 
          : 0,
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
    console.error('Error in POST /api/users/me/skills:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
