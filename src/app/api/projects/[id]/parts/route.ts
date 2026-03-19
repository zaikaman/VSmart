import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const partSchema = z.object({
  ten: z.string().min(1).max(200),
  mo_ta: z.string().optional(),
  deadline: z.string().datetime(),
  phong_ban_id: z.string().uuid(),
});

async function authorizeProjectAccess(projectId: string) {
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
    .eq('du_an_id', projectId)
    .eq('email', user.email)
    .eq('trang_thai', 'active')
    .single();

  if (!membership) {
    return {
      error: NextResponse.json(
        { error: 'Bạn không có quyền tạo phần dự án trong dự án này' },
        { status: 403 }
      ),
    };
  }

  const { data: projectData, error: projectError } = await supabaseAdmin
    .from('du_an')
    .select('id')
    .eq('id', projectId)
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

  return { projectId };
}

// POST /api/projects/[id]/parts - Create project part
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizeProjectAccess(id);
    if (auth.error) return auth.error;

    const body = await request.json();
    const validated = partSchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from('phan_du_an')
      .insert([
        {
          ten: validated.ten,
          mo_ta: validated.mo_ta,
          deadline: validated.deadline,
          du_an_id: id,
          phong_ban_id: validated.phong_ban_id,
          trang_thai: 'todo',
          phan_tram_hoan_thanh: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
