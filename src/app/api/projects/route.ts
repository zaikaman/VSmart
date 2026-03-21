import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logActivity } from '@/lib/activity/log';
import { hasPermission } from '@/lib/auth/permissions';
import { getAuthenticatedUserContext } from '@/lib/tasks/auth';

const projectSchema = z.object({
  ten: z.string().min(1).max(200),
  mo_ta: z.string().optional(),
  deadline: z.string().datetime(),
});

export async function GET(request: NextRequest) {
  try {
    const { supabase, authUser } = await getAuthenticatedUserContext();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const trangThai = searchParams.get('trangThai');

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('du_an')
      .select(
        `
          *,
          thanh_vien_du_an!inner(email, trang_thai, vai_tro)
        `,
        { count: 'exact' }
      )
      .eq('thanh_vien_du_an.email', authUser.email)
      .eq('thanh_vien_du_an.trang_thai', 'active')
      .is('deleted_at', null)
      .range(from, to)
      .order('ngay_tao', { ascending: false });

    if (trangThai) {
      query = query.eq('trang_thai', trangThai);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const cleanData =
      data?.map((project) => {
        const membership = Array.isArray(project.thanh_vien_du_an)
          ? project.thanh_vien_du_an[0]
          : project.thanh_vien_du_an;
        const rest = { ...project };
        delete rest.thanh_vien_du_an;
        return {
          ...rest,
          current_membership_role: membership?.vai_tro || null,
        };
      }) || [];

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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, authUser, dbUser } = await getAuthenticatedUserContext();

    if (!hasPermission({ appRole: dbUser.vai_tro as 'admin' | 'manager' | 'member' }, 'manageProjects')) {
      return NextResponse.json({ error: 'Bạn không có quyền tạo dự án' }, { status: 403 });
    }

    const body = await request.json();
    const validated = projectSchema.parse(body);

    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('id, to_chuc_id')
      .eq('email', authUser.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin người dùng' }, { status: 404 });
    }

    if (!userData.to_chuc_id) {
      return NextResponse.json({ error: 'Bạn cần thuộc về một tổ chức để tạo dự án' }, { status: 400 });
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

    if (error || !data) {
      console.error('Error creating project:', error);
      return NextResponse.json({ error: error?.message || 'Không thể tạo dự án' }, { status: 400 });
    }

    await supabase.from('thanh_vien_du_an').insert({
      du_an_id: data.id,
      nguoi_dung_id: userData.id,
      email: authUser.email,
      vai_tro: 'owner',
      trang_thai: 'active',
      ngay_tham_gia: new Date().toISOString(),
      nguoi_moi_id: userData.id,
    });

    await logActivity({
      entityType: 'project',
      entityId: data.id,
      action: 'project_created',
      actorId: userData.id,
      metadata: {
        projectId: data.id,
        projectName: data.ten,
      },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error in POST /api/projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
