/**
 * API endpoint để gợi ý phân công task bằng AI
 * POST /api/ai/suggest-assignee
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  goiYPhanCongAI,
  type AssignmentCandidate,
  type TaskForSuggestion,
} from '@/lib/openai/assignment-suggestion';

// Validation schema
const suggestAssigneeSchema = z.object({
  ten: z.string().min(1, 'Tên task không được để trống'),
  mo_ta: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  deadline: z.string().datetime(),
  phan_du_an_id: z.string().uuid('Phần dự án ID không hợp lệ'),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const supabase = await createSupabaseServerClient();

    // Xác thực user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    // Parse và validate request body
    const body = await request.json();
    const validated = suggestAssigneeSchema.parse(body);

    // Lấy thông tin project từ phan_du_an
    const { data: partData, error: partError } = await supabase
      .from('phan_du_an')
      .select('du_an_id')
      .eq('id', validated.phan_du_an_id)
      .single();

    if (partError || !partData) {
      return NextResponse.json(
        { error: 'Phần dự án không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền truy cập project
    const { data: membership } = await supabase
      .from('thanh_vien_du_an')
      .select('id')
      .eq('du_an_id', partData.du_an_id)
      .eq('email', user.email)
      .eq('trang_thai', 'active')
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Bạn không có quyền truy cập dự án này' },
        { status: 403 }
      );
    }

    // Lấy danh sách thành viên của project với skills và workload
    const { data: members, error: membersError } = await supabase
      .from('thanh_vien_du_an')
      .select(`
        nguoi_dung_id,
        nguoi_dung:nguoi_dung_id (
          id,
          ten,
          email,
          avatar_url,
          ty_le_hoan_thanh
        )
      `)
      .eq('du_an_id', partData.du_an_id)
      .eq('trang_thai', 'active')
      .not('nguoi_dung_id', 'is', null);

    if (membersError) {
      console.error('Lỗi lấy danh sách thành viên:', membersError);
      return NextResponse.json(
        { error: 'Không thể lấy danh sách thành viên' },
        { status: 500 }
      );
    }

    if (!members || members.length === 0) {
      return NextResponse.json({
        suggestions: [],
        message: 'Không có thành viên nào trong dự án',
        latency_ms: Date.now() - startTime,
      });
    }

    // Xử lý dữ liệu members - Supabase trả về nguoi_dung là object hoặc null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const membersData = members as any[];

    // Lấy user IDs
    const userIds: string[] = [];
    membersData.forEach((m) => {
      const userData = m.nguoi_dung;
      if (userData && userData.id) {
        userIds.push(userData.id);
      }
    });

    if (userIds.length === 0) {
      return NextResponse.json({
        suggestions: [],
        message: 'Không có thành viên nào trong dự án',
        latency_ms: Date.now() - startTime,
        all_candidates: [],
      });
    }

    // Lấy skills của các users
    const { data: skillsData } = await supabase
      .from('ky_nang_nguoi_dung')
      .select('nguoi_dung_id, ten_ky_nang, trinh_do, nam_kinh_nghiem')
      .in('nguoi_dung_id', userIds);

    // Lấy số task đang làm của mỗi user
    const { data: taskCounts } = await supabase
      .from('task')
      .select('assignee_id')
      .eq('trang_thai', 'in-progress')
      .in('assignee_id', userIds)
      .is('deleted_at', null);

    // Đếm số task đang làm của mỗi user
    const taskCountMap: Record<string, number> = {};
    taskCounts?.forEach((t) => {
      if (t.assignee_id) {
        taskCountMap[t.assignee_id] = (taskCountMap[t.assignee_id] || 0) + 1;
      }
    });

    // Tạo candidates data
    const candidates: AssignmentCandidate[] = [];
    membersData.forEach((m) => {
      const userData = m.nguoi_dung;
      if (!userData || !userData.id) return;
        
      const userSkills = skillsData
        ?.filter((s) => s.nguoi_dung_id === userData.id)
        .map((s) => ({
          ten_ky_nang: s.ten_ky_nang,
          trinh_do: s.trinh_do as 'beginner' | 'intermediate' | 'advanced' | 'expert',
          nam_kinh_nghiem: s.nam_kinh_nghiem || 0,
        })) || [];

      candidates.push({
        id: userData.id,
        ten: userData.ten,
        email: userData.email,
        avatar_url: userData.avatar_url || undefined,
        skills: userSkills,
        ty_le_hoan_thanh: userData.ty_le_hoan_thanh || 0,
        so_task_dang_lam: taskCountMap[userData.id] || 0,
      });
    });

    // Tạo task info cho AI
    const taskInfo: TaskForSuggestion = {
      ten: validated.ten,
      mo_ta: validated.mo_ta,
      priority: validated.priority,
      deadline: validated.deadline,
    };

    console.log('[AI Suggest Assignee] Starting AI suggestion:', {
      task_name: validated.ten,
      task_description: validated.mo_ta?.substring(0, 100),
      priority: validated.priority,
      candidates_count: candidates.length,
      candidates_preview: candidates.slice(0, 2).map(c => ({ id: c.id, ten: c.ten, skills_count: c.skills.length })),
    });

    // Gọi algorithm để gợi ý (nhanh hơn và chính xác hơn LLM)
    console.log('[AI Suggest Assignee] Calling AI algorithm...');
    const suggestions = goiYPhanCongAI(taskInfo, candidates);
    const latency_ms = Date.now() - startTime;
    
    console.log('[AI Suggest Assignee] Algorithm result:', {
      suggestions_count: suggestions.length,
      latency_ms,
      suggestions_preview: suggestions.map(s => ({
        name: s.user?.ten,
        score: s.diem_phu_hop,
        skills: s.ly_do.ky_nang_phu_hop,
      })),
    });

    // Log metrics (có thể mở rộng để lưu vào database hoặc analytics)
    console.log('[AI Suggest Assignee] Final result:', {
      task_name: validated.ten,
      candidates_count: candidates.length,
      suggestions_count: suggestions.length,
      latency_ms,
      suggestions_details: suggestions.map(s => ({
        nguoi_dung_id: s.nguoi_dung_id,
        diem_phu_hop: s.diem_phu_hop,
        has_user: !!s.user,
        user_name: s.user?.ten,
        ly_do_chinh: s.ly_do?.chinh,
      })),
    });

    return NextResponse.json({
      suggestions,
      latency_ms,
      model: 'algorithm',
      all_candidates: candidates, // Trả về toàn bộ candidates cho manual selection
    });
  } catch (error) {
    console.error('Lỗi trong /api/ai/suggest-assignee:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    );
  }
}
