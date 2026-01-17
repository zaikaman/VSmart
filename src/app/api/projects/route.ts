import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Schema validation
const projectSchema = z.object({
  ten: z.string().min(1).max(200),
  mo_ta: z.string().optional(),
  deadline: z.string().datetime(),
});

// GET /api/projects - Lấy danh sách dự án của user (thuộc organization hoặc là thành viên)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const trangThai = searchParams.get('trangThai');

    // Lấy thông tin user hiện tại
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Lấy organization_id của user
    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('id, to_chuc_id')
      .eq('email', user.email)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Query dự án mà user là thành viên active
    let query = supabase
      .from('du_an')
      .select(`
        *,
        thanh_vien_du_an!inner(email, trang_thai)
      `, { count: 'exact' })
      .eq('thanh_vien_du_an.email', user.email)
      .eq('thanh_vien_du_an.trang_thai', 'active')
      .range(from, to)
      .order('ngay_tao', { ascending: false });

    // Filter by status if provided
    if (trangThai) {
      query = query.eq('trang_thai', trangThai);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Loại bỏ thông tin thanh_vien_du_an trong response
    const cleanData = data?.map(({ thanh_vien_du_an, ...project }: any) => project);

    return NextResponse.json({
      data: cleanData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Tạo dự án mới
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
    const validated = projectSchema.parse(body);

    // Lấy thông tin user để có to_chuc_id
    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('id, to_chuc_id')
      .eq('email', user.email)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    if (!userData.to_chuc_id) {
      return NextResponse.json(
        { error: 'Bạn cần thuộc về một tổ chức để tạo dự án' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('du_an')
      .insert([
        {
          ten: validated.ten,
          mo_ta: validated.mo_ta,
          deadline: validated.deadline,
          nguoi_tao_id: userData.id,
          to_chuc_id: userData.to_chuc_id,
          trang_thai: 'todo',
          phan_tram_hoan_thanh: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error in POST /api/projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
