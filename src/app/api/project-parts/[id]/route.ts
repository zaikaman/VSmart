import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updatePartSchema = z.object({
  ten: z.string().min(1).max(200).optional(),
  mo_ta: z.string().optional(),
  deadline: z.string().datetime().optional(),
  trang_thai: z.enum(['todo', 'in-progress', 'done']).optional(),
  phan_tram_hoan_thanh: z.number().min(0).max(100).optional(),
});

async function authorizePartAccess(partId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: partData, error: partError } = await supabaseAdmin
    .from('phan_du_an')
    .select('id, du_an_id')
    .eq('id', partId)
    .is('deleted_at', null)
    .single();

  if (partError || !partData) {
    return {
      error: NextResponse.json(
        { error: 'Không tìm thấy phần dự án' },
        { status: 404 }
      ),
    };
  }

  const { data: membership } = await supabase
    .from('thanh_vien_du_an')
    .select('id')
    .eq('du_an_id', partData.du_an_id)
    .eq('email', user.email)
    .eq('trang_thai', 'active')
    .single();

  if (!membership) {
    return {
      error: NextResponse.json(
        { error: 'Bạn không có quyền truy cập phần dự án này' },
        { status: 403 }
      ),
    };
  }

  return { supabase, partData };
}

// GET /api/project-parts/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizePartAccess(id);
    if (auth.error) return auth.error;

    const { data, error } = await supabaseAdmin
      .from('phan_du_an')
      .select('*, task (*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Không tìm thấy phần dự án' }, { status: 404 });
    }

    return NextResponse.json({
      ...data,
      task: (data.task || []).filter((task: { deleted_at?: string | null }) => !task.deleted_at),
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/project-parts/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizePartAccess(id);
    if (auth.error) return auth.error;

    const body = await request.json();
    const validated = updatePartSchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from('phan_du_an')
      .update(validated)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Không thể cập nhật phần dự án' }, { status: 400 });
    }

    return NextResponse.json(data);
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

// DELETE /api/project-parts/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizePartAccess(id);
    if (auth.error) return auth.error;

    const deletedAt = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('phan_du_an')
      .update({ deleted_at: deletedAt })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Không thể xóa phần dự án' }, { status: 400 });
    }

    await supabaseAdmin
      .from('task')
      .update({ deleted_at: deletedAt })
      .eq('phan_du_an_id', id)
      .is('deleted_at', null);

    return NextResponse.json({ message: 'Project part deleted', data });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
