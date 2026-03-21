import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createNotificationSchema = z.object({
  nguoi_dung_id: z.string().uuid(),
  loai: z.enum(['risk_alert', 'stale_task', 'assignment', 'overload', 'project_invitation']),
  noi_dung: z.string().min(1).max(500),
  task_lien_quan_id: z.string().uuid().optional().nullable(),
});

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('nguoi_dung')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User không tồn tại' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT), MAX_LIMIT);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let notificationsQuery = supabase
      .from('thong_bao')
      .select(
        `
        *,
        task:task_lien_quan_id (
          id,
          ten,
          trang_thai,
          progress,
          risk_level
        )
      `,
        { count: 'exact' }
      )
      .eq('nguoi_dung_id', userData.id)
      .order('thoi_gian', { ascending: false })
      .range(from, to);

    if (unreadOnly) {
      notificationsQuery = notificationsQuery.eq('da_doc', false);
    }

    const [notificationsResult, unreadResult] = await Promise.all([
      notificationsQuery,
      supabase
        .from('thong_bao')
        .select('id', { count: 'exact', head: true })
        .eq('nguoi_dung_id', userData.id)
        .eq('da_doc', false),
    ]);

    const { data: notifications, error, count } = notificationsResult;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Lỗi khi lấy thông báo' }, { status: 500 });
    }

    return NextResponse.json({
      data: notifications || [],
      unreadCount: unreadResult.count || 0,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const parsed = createNotificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: notification, error } = await supabase
      .from('thong_bao')
      .insert({
        nguoi_dung_id: parsed.data.nguoi_dung_id,
        loai: parsed.data.loai,
        noi_dung: parsed.data.noi_dung,
        task_lien_quan_id: parsed.data.task_lien_quan_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: 'Lỗi khi tạo thông báo' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Error in POST /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
