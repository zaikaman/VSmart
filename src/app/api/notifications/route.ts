import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createNotificationSchema = z.object({
  nguoi_dung_id: z.string().uuid(),
  loai: z.enum(['risk_alert', 'stale_task', 'assignment', 'overload']),
  noi_dung: z.string().min(1).max(500),
  task_lien_quan_id: z.string().uuid().optional().nullable(),
});

/**
 * GET /api/notifications
 * Lấy danh sách thông báo của user hiện tại
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Kiểm tra authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Lấy user ID từ nguoi_dung table
    const { data: userData } = await supabase
      .from('nguoi_dung')
      .select('id')
      .eq('email', user.email)
      .single();
    
    if (!userData) {
      return NextResponse.json(
        { error: 'User không tồn tại' },
        { status: 404 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    let query = supabase
      .from('thong_bao')
      .select(`
        *,
        task:task_lien_quan_id (
          id,
          ten,
          trang_thai,
          progress,
          risk_level
        )
      `, { count: 'exact' })
      .eq('nguoi_dung_id', userData.id)
      .order('thoi_gian', { ascending: false })
      .range(from, to);
    
    if (unreadOnly) {
      query = query.eq('da_doc', false);
    }
    
    const { data: notifications, error, count } = await query;
    
    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Lỗi khi lấy thông báo' },
        { status: 500 }
      );
    }
    
    // Đếm số thông báo chưa đọc
    const { count: unreadCount } = await supabase
      .from('thong_bao')
      .select('id', { count: 'exact', head: true })
      .eq('nguoi_dung_id', userData.id)
      .eq('da_doc', false);
    
    return NextResponse.json({
      data: notifications || [],
      unreadCount: unreadCount || 0,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
    
  } catch (error) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Tạo thông báo mới (internal use - từ cron job hoặc các API khác)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Kiểm tra cron secret hoặc auth
    const cronSecret = request.headers.get('x-cron-secret');
    const isValidCron = cronSecret === process.env.CRON_SECRET;
    
    if (!isValidCron) {
      // Kiểm tra auth nếu không phải cron
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    
    // Parse và validate body
    const body = await request.json();
    const parsed = createNotificationSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    // Tạo notification
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
      return NextResponse.json(
        { error: 'Lỗi khi tạo thông báo' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: notification,
    });
    
  } catch (error) {
    console.error('Error in POST /api/notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
