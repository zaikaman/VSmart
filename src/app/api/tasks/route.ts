import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import { z } from 'zod';

const taskSchema = z.object({
  ten: z.string().min(1).max(200),
  mo_ta: z.string().optional(),
  deadline: z.string().datetime(),
  phan_du_an_id: z.string().uuid(),
  assignee_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

// GET /api/tasks - List tasks với pagination và filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const trangThai = searchParams.get('trangThai');
    const assigneeId = searchParams.get('assigneeId');
    const deadline = searchParams.get('deadline');

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('task')
      .select(
        `
        *,
        nguoi_dung:assignee_id (id, ten, email, avatar_url),
        phan_du_an (id, ten, du_an_id)
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .range(from, to)
      .order('ngay_tao', { ascending: false });

    if (trangThai) {
      query = query.eq('trang_thai', trangThai);
    }

    if (assigneeId) {
      query = query.eq('assignee_id', assigneeId);
    }

    if (deadline) {
      query = query.lte('deadline', deadline);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = taskSchema.parse(body);

    const { data, error } = await supabase
      .from('task')
      .insert([
        {
          ten: validated.ten,
          mo_ta: validated.mo_ta,
          deadline: validated.deadline,
          phan_du_an_id: validated.phan_du_an_id,
          assignee_id: validated.assignee_id,
          priority: validated.priority,
          trang_thai: 'todo',
          progress: 0,
          risk_score: 0,
          risk_level: 'low',
          is_stale: false,
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
