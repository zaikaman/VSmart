import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { sendTaskAssignedEmail, shouldSendNotification } from '@/lib/email/notifications';

const taskSchema = z.object({
  ten: z.string().min(1).max(200),
  mo_ta: z.string().optional(),
  deadline: z.string().datetime(),
  phan_du_an_id: z.string().uuid(),
  assignee_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

// GET /api/tasks - List tasks của các dự án mà user tham gia
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100'); // Tăng limit cho kanban board
    const trangThai = searchParams.get('trangThai');
    const assigneeId = searchParams.get('assigneeId');
    const deadline = searchParams.get('deadline');
    const duAnId = searchParams.get('duAnId'); // Filter theo dự án cụ thể

    // Lấy danh sách project IDs mà user tham gia
    const { data: userProjects } = await supabase
      .from('thanh_vien_du_an')
      .select('du_an_id')
      .eq('email', user.email)
      .eq('trang_thai', 'active');

    const projectIds = userProjects?.map(p => p.du_an_id) || [];

    if (projectIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Query tasks từ các dự án mà user tham gia
    let query = supabase
      .from('task')
      .select(
        `
        *,
        nguoi_dung:assignee_id (id, ten, email, avatar_url),
        phan_du_an (
          id, 
          ten, 
          du_an_id,
          du_an (id, ten)
        )
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .range(from, to)
      .order('ngay_tao', { ascending: false });

    // Filter tasks theo projects của user thông qua phan_du_an
    // Lấy tất cả part IDs của các projects user tham gia
    const { data: projectParts } = await supabase
      .from('phan_du_an')
      .select('id')
      .in('du_an_id', projectIds);

    const partIds = projectParts?.map(p => p.id) || [];

    if (partIds.length > 0) {
      query = query.in('phan_du_an_id', partIds);
    } else {
      // Không có part nào, return empty
      return NextResponse.json({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Apply filters
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
      console.error('Error fetching tasks:', error);
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
    console.error('Error in GET /api/tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create new task
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
    const validated = taskSchema.parse(body);

    // Verify user có quyền tạo task trong project này không
    const { data: partData } = await supabase
      .from('phan_du_an')
      .select('du_an_id, du_an:du_an_id (ten)')
      .eq('id', validated.phan_du_an_id)
      .single();

    if (!partData) {
      return NextResponse.json(
        { error: 'Phần dự án không tồn tại' },
        { status: 404 }
      );
    }

    // Check user có phải thành viên của project này không
    const { data: membership } = await supabase
      .from('thanh_vien_du_an')
      .select('id')
      .eq('du_an_id', partData.du_an_id)
      .eq('email', user.email)
      .eq('trang_thai', 'active')
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Bạn không có quyền tạo task trong dự án này' },
        { status: 403 }
      );
    }

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
      console.error('Error creating task:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Gửi email thông báo cho assignee nếu có
    if (validated.assignee_id) {
      try {
        const { data: assigneeData } = await supabase
          .from('nguoi_dung')
          .select('email, ten')
          .eq('id', validated.assignee_id)
          .single();

        if (assigneeData && assigneeData.email !== user.email) {
          const shouldSend = await shouldSendNotification(assigneeData.email, 'emailTaskAssigned');
          if (shouldSend) {
            // Get project name
            const projectName = Array.isArray(partData.du_an)
              ? partData.du_an[0]?.ten
              : (partData.du_an as { ten: string })?.ten || 'Chưa xác định';

            sendTaskAssignedEmail(
              assigneeData.email,
              assigneeData.ten,
              {
                taskId: data.id,
                taskName: validated.ten,
                projectName,
                deadline: validated.deadline,
                priority: validated.priority,
              }
            ).catch(err => console.error('Error sending task assigned email:', err));
          }
        }
      } catch (emailError) {
        console.error('Error sending task assignment notification:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Broadcast task creation qua socket để cập nhật realtime
    try {
      const { broadcastTaskCreate } = await import('@/lib/socket/server');
      broadcastTaskCreate(data, user.email);
    } catch (socketError) {
      console.error('Error broadcasting task creation:', socketError);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error in POST /api/tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
