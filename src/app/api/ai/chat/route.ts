import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createChatCompletionStream, ChatContext, ChatMessage } from '@/lib/openai/chat-completion';
import { z } from 'zod';

/**
 * Schema validation cho chat request
 */
const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1),
  })).min(1),
});

/**
 * Fetch context cho RAG từ database
 */
async function fetchChatContext(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userEmail: string
): Promise<ChatContext> {
  // 1. Lấy thông tin user hiện tại
  const { data: userData } = await supabase
    .from('nguoi_dung')
    .select('id, ten, email, vai_tro')
    .eq('email', userEmail)
    .single();

  const user = userData || {
    id: '',
    ten: 'Người dùng',
    email: userEmail,
  };

  // 2. Lấy danh sách dự án mà user tham gia
  const { data: userProjects } = await supabase
    .from('thanh_vien_du_an')
    .select('du_an_id')
    .eq('email', userEmail)
    .eq('trang_thai', 'active');

  const projectIds = userProjects?.map(p => p.du_an_id) || [];

  // 3. Lấy active tasks từ các dự án user tham gia
  let activeTasks: ChatContext['activeTasks'] = [];
  if (projectIds.length > 0) {
    // Lấy các phần dự án thuộc các dự án của user
    const { data: partsData } = await supabase
      .from('phan_du_an')
      .select('id, ten, du_an_id, du_an(ten)')
      .in('du_an_id', projectIds);

    const partIds = partsData?.map(p => p.id) || [];

    if (partIds.length > 0) {
      const { data: tasksData } = await supabase
        .from('task')
        .select(`
          id, ten, mo_ta, trang_thai, priority, progress, deadline, risk_score, risk_level,
          nguoi_dung:assignee_id (ten),
          phan_du_an (ten, du_an(ten))
        `)
        .in('phan_du_an_id', partIds)
        .is('deleted_at', null)
        .in('trang_thai', ['todo', 'in-progress'])
        .order('deadline', { ascending: true })
        .limit(20);

      activeTasks = (tasksData || []).map(t => ({
        id: t.id,
        ten: t.ten,
        mo_ta: t.mo_ta || undefined,
        trang_thai: t.trang_thai,
        priority: t.priority,
        progress: t.progress || 0,
        deadline: t.deadline,
        risk_score: t.risk_score || undefined,
        risk_level: t.risk_level || undefined,
        assignee_ten: (t.nguoi_dung as { ten?: string })?.ten || undefined,
        phan_du_an_ten: (t.phan_du_an as { ten?: string })?.ten || undefined,
        du_an_ten: ((t.phan_du_an as { du_an?: { ten?: string } })?.du_an as { ten?: string })?.ten || undefined,
      }));
    }
  }

  // 4. Lấy recent projects
  let recentProjects: ChatContext['recentProjects'] = [];
  if (projectIds.length > 0) {
    const { data: projectsData } = await supabase
      .from('du_an')
      .select('id, ten, mo_ta, trang_thai, phan_tram_hoan_thanh, deadline')
      .in('id', projectIds)
      .is('deleted_at', null)
      .order('ngay_tao', { ascending: false })
      .limit(5);

    // Đếm số tasks và parts cho mỗi project
    for (const project of projectsData || []) {
      const { count: partsCount } = await supabase
        .from('phan_du_an')
        .select('id', { count: 'exact', head: true })
        .eq('du_an_id', project.id);

      // Lấy part IDs để đếm tasks
      const { data: parts } = await supabase
        .from('phan_du_an')
        .select('id')
        .eq('du_an_id', project.id);

      const partIdList = parts?.map(p => p.id) || [];
      let tasksCount = 0;
      if (partIdList.length > 0) {
        const { count } = await supabase
          .from('task')
          .select('id', { count: 'exact', head: true })
          .in('phan_du_an_id', partIdList)
          .is('deleted_at', null);
        tasksCount = count || 0;
      }

      recentProjects.push({
        id: project.id,
        ten: project.ten,
        mo_ta: project.mo_ta || undefined,
        trang_thai: project.trang_thai,
        phan_tram_hoan_thanh: project.phan_tram_hoan_thanh || 0,
        deadline: project.deadline,
        so_tasks: tasksCount,
        so_parts: partsCount || 0,
      });
    }
  }

  // 5. Lấy team members (người cùng trong các dự án)
  let teamMembers: ChatContext['teamMembers'] = [];
  if (projectIds.length > 0) {
    const { data: membersData } = await supabase
      .from('thanh_vien_du_an')
      .select('email, vai_tro')
      .in('du_an_id', projectIds)
      .eq('trang_thai', 'active');

    const uniqueEmails = [...new Set((membersData || []).map(m => m.email))];
    
    for (const email of uniqueEmails.slice(0, 10)) {
      const { data: memberUser } = await supabase
        .from('nguoi_dung')
        .select('id, ten, email, vai_tro')
        .eq('email', email)
        .single();

      if (memberUser) {
        // Lấy skills
        const { data: skillsData } = await supabase
          .from('ky_nang_nguoi_dung')
          .select('ten_ky_nang, trinh_do')
          .eq('nguoi_dung_id', memberUser.id);

        // Đếm tasks đang làm
        const { count: inProgressCount } = await supabase
          .from('task')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', memberUser.id)
          .eq('trang_thai', 'in-progress')
          .is('deleted_at', null);

        // Tính tỷ lệ hoàn thành
        const { count: completedCount } = await supabase
          .from('task')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', memberUser.id)
          .eq('trang_thai', 'done')
          .is('deleted_at', null);

        const { count: totalCount } = await supabase
          .from('task')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', memberUser.id)
          .is('deleted_at', null);

        const tyLeHoanThanh = totalCount && totalCount > 0 
          ? ((completedCount || 0) / totalCount) * 100 
          : 0;

        teamMembers.push({
          id: memberUser.id,
          ten: memberUser.ten,
          email: memberUser.email,
          vai_tro: memberUser.vai_tro || undefined,
          skills: (skillsData || []).map(s => ({
            ten_ky_nang: s.ten_ky_nang,
            trinh_do: s.trinh_do,
          })),
          so_task_dang_lam: inProgressCount || 0,
          ty_le_hoan_thanh: Math.round(tyLeHoanThanh),
        });
      }
    }
  }

  // 6. Tính thống kê tổng quan
  let stats: ChatContext['stats'] | undefined;
  if (projectIds.length > 0) {
    // Lấy tất cả part IDs
    const { data: allParts } = await supabase
      .from('phan_du_an')
      .select('id')
      .in('du_an_id', projectIds);

    const allPartIds = allParts?.map(p => p.id) || [];

    if (allPartIds.length > 0) {
      const { count: totalTasks } = await supabase
        .from('task')
        .select('id', { count: 'exact', head: true })
        .in('phan_du_an_id', allPartIds)
        .is('deleted_at', null);

      const { count: completedTasks } = await supabase
        .from('task')
        .select('id', { count: 'exact', head: true })
        .in('phan_du_an_id', allPartIds)
        .eq('trang_thai', 'done')
        .is('deleted_at', null);

      const { count: inProgressTasks } = await supabase
        .from('task')
        .select('id', { count: 'exact', head: true })
        .in('phan_du_an_id', allPartIds)
        .eq('trang_thai', 'in-progress')
        .is('deleted_at', null);

      const { count: overdueTasks } = await supabase
        .from('task')
        .select('id', { count: 'exact', head: true })
        .in('phan_du_an_id', allPartIds)
        .lt('deadline', new Date().toISOString())
        .neq('trang_thai', 'done')
        .is('deleted_at', null);

      const { count: highRiskTasks } = await supabase
        .from('task')
        .select('id', { count: 'exact', head: true })
        .in('phan_du_an_id', allPartIds)
        .eq('risk_level', 'high')
        .is('deleted_at', null);

      stats = {
        total_tasks: totalTasks || 0,
        completed_tasks: completedTasks || 0,
        in_progress_tasks: inProgressTasks || 0,
        overdue_tasks: overdueTasks || 0,
        high_risk_tasks: highRiskTasks || 0,
      };
    }
  }

  return {
    user: user as ChatContext['user'],
    activeTasks,
    recentProjects,
    teamMembers,
    stats,
  };
}

/**
 * POST /api/ai/chat - Chat với AI Assistant (streaming)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Xác thực user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập để sử dụng chat AI' },
        { status: 401 }
      );
    }

    // Parse và validate request body
    const body = await request.json();
    const parseResult = chatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { messages } = parseResult.data;

    // Fetch context cho RAG
    const context = await fetchChatContext(supabase, user.email!);

    // Chuyển đổi messages thành format ChatMessage
    const chatMessages: ChatMessage[] = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Tạo streaming response
    const stream = await createChatCompletionStream({
      messages: chatMessages,
      context,
    });

    // Trả về streaming response với headers phù hợp
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Chat API Error]', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
    
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xử lý chat', details: errorMessage },
      { status: 500 }
    );
  }
}
