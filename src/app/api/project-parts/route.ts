import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function getAuthorizedProjectId(duAnId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: membership } = await supabase
    .from('thanh_vien_du_an')
    .select('id')
    .eq('du_an_id', duAnId)
    .eq('email', user.email)
    .eq('trang_thai', 'active')
    .single();

  if (!membership) {
    return {
      error: NextResponse.json(
        { error: 'Bạn không có quyền truy cập dự án này' },
        { status: 403 }
      ),
    };
  }

  const { data: projectData, error: projectError } = await supabaseAdmin
    .from('du_an')
    .select('id')
    .eq('id', duAnId)
    .is('deleted_at', null)
    .single();

  if (projectError || !projectData) {
    return {
      error: NextResponse.json(
        { error: 'Dự án không tồn tại hoặc đã bị xóa' },
        { status: 404 }
      ),
    };
  }

  return { duAnId };
}

// GET /api/project-parts - Lấy danh sách phần dự án
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const duAnId = searchParams.get('duAnId');

    if (!duAnId) {
      return NextResponse.json(
        { error: 'duAnId là bắt buộc' },
        { status: 400 }
      );
    }

    const auth = await getAuthorizedProjectId(duAnId);
    if (auth.error) return auth.error;

    const { data, error } = await supabaseAdmin
      .from('phan_du_an')
      .select('*, phong_ban:phong_ban_id (id, ten)')
      .eq('du_an_id', duAnId)
      .is('deleted_at', null)
      .order('ngay_tao', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
