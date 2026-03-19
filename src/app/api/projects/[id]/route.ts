import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateProjectSchema = z.object({
  ten: z.string().min(1).max(200).optional(),
  mo_ta: z.string().optional(),
  deadline: z.string().datetime().optional(),
  trang_thai: z.enum(['todo', 'in-progress', 'done']).optional(),
  phan_tram_hoan_thanh: z.number().min(0).max(100).optional(),
});

async function getAuthenticatedSupabase() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { supabase, user };
}

// GET /api/projects/[id] - Get single project với parts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedSupabase();
    if (auth.error || !auth.supabase) return auth.error;

    const { id } = await params;
    const { data: project, error: projectError } = await auth.supabase
      .from('du_an')
      .select(
        `
        *,
        phan_du_an (*)
      `
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Không tìm thấy dự án hoặc bạn không có quyền truy cập' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...project,
      phan_du_an: (project.phan_du_an || []).filter(
        (part: { deleted_at?: string | null }) => !part.deleted_at
      ),
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedSupabase();
    if (auth.error || !auth.supabase) return auth.error;

    const { id } = await params;
    const body = await request.json();
    const validated = updateProjectSchema.parse(body);

    const { data, error } = await auth.supabase
      .from('du_an')
      .update(validated)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Không thể cập nhật dự án hoặc bạn không có quyền thực hiện' },
        { status: 403 }
      );
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

// DELETE /api/projects/[id] - Soft delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedSupabase();
    if (auth.error || !auth.supabase) return auth.error;

    const { id } = await params;
    const deletedAt = new Date().toISOString();

    const { data, error } = await auth.supabase
      .from('du_an')
      .update({ deleted_at: deletedAt })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Không thể xóa dự án hoặc bạn không có quyền thực hiện' },
        { status: 403 }
      );
    }

    await supabaseAdmin
      .from('phan_du_an')
      .update({ deleted_at: deletedAt })
      .eq('du_an_id', id)
      .is('deleted_at', null);

    return NextResponse.json({ message: 'Project deleted', data });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
