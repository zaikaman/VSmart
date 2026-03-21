import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('id, to_chuc_id')
      .eq('email', user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    const [projectCountResult, membershipsResult, userCountResult] = await Promise.all([
      supabase
        .from('du_an')
        .select('id, thanh_vien_du_an!inner(email, trang_thai)', { count: 'exact', head: true })
        .eq('thanh_vien_du_an.email', user.email)
        .eq('thanh_vien_du_an.trang_thai', 'active')
        .is('deleted_at', null),
      supabase
        .from('thanh_vien_du_an')
        .select('du_an_id')
        .eq('email', user.email)
        .eq('trang_thai', 'active'),
      supabase
        .from('nguoi_dung')
        .select('id', { count: 'exact', head: true })
        .eq('to_chuc_id', userData.to_chuc_id),
    ]);

    const projectIds = membershipsResult.data?.map((membership) => membership.du_an_id) || [];

    let inProgressTasks = 0;
    if (projectIds.length > 0) {
      const { data: parts, error: partsError } = await supabase
        .from('phan_du_an')
        .select('id')
        .in('du_an_id', projectIds)
        .is('deleted_at', null);

      if (!partsError && parts && parts.length > 0) {
        const partIds = parts.map((part) => part.id);
        const { count } = await supabase
          .from('task')
          .select('id', { count: 'exact', head: true })
          .in('phan_du_an_id', partIds)
          .eq('trang_thai', 'in-progress')
          .is('deleted_at', null);

        inProgressTasks = count || 0;
      }
    }

    return NextResponse.json({
      data: {
        totalProjects: projectCountResult.count || 0,
        inProgressTasks,
        totalUsers: userCountResult.count || 0,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
