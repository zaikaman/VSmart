import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  goiYPhanCong,
  type AssignmentCandidate,
  type TaskForSuggestion,
} from '@/lib/openai/assignment-suggestion';
import { summarizeWorkload } from '@/lib/utils/workload-utils';

const suggestAssigneeSchema = z.object({
  ten: z.string().min(1, 'Tên task không được để trống'),
  mo_ta: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  deadline: z.string().datetime(),
  phan_du_an_id: z.string().uuid('Phần dự án ID không hợp lệ'),
});

type MemberUser = {
  id: string;
  ten: string;
  email: string;
  avatar_url: string | null;
  ty_le_hoan_thanh: number | null;
};

type ProjectMemberRow = {
  nguoi_dung_id: string | null;
  nguoi_dung: MemberUser | MemberUser[] | null;
};

function pickSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await request.json();
    const validated = suggestAssigneeSchema.parse(body);

    const { data: partData, error: partError } = await supabase
      .from('phan_du_an')
      .select('du_an_id')
      .eq('id', validated.phan_du_an_id)
      .single();

    if (partError || !partData) {
      return NextResponse.json({ error: 'Phần dự án không tồn tại' }, { status: 404 });
    }

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

    const { data: members, error: membersError } = await supabase
      .from('thanh_vien_du_an')
      .select(
        `
        nguoi_dung_id,
        nguoi_dung:nguoi_dung_id (
          id,
          ten,
          email,
          avatar_url,
          ty_le_hoan_thanh
        )
      `
      )
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
        all_candidates: [],
        latency_ms: Date.now() - startTime,
        error: 'Không có thành viên nào trong dự án để gợi ý phân công.',
      });
    }

    const membersData = members as ProjectMemberRow[];
    const userIds = membersData
      .map((member) => pickSingleRelation(member.nguoi_dung)?.id)
      .filter((value): value is string => Boolean(value));

    if (userIds.length === 0) {
      console.warn('[AI Suggest Assignee] Empty userIds after relation normalization', {
        project_part_id: validated.phan_du_an_id,
        members_preview: membersData.slice(0, 3),
      });

      return NextResponse.json({
        suggestions: [],
        all_candidates: [],
        latency_ms: Date.now() - startTime,
        error: 'Không đọc được dữ liệu thành viên dự án để tạo gợi ý.',
      });
    }

    const [{ data: skillsData }, { data: taskRows }] = await Promise.all([
      supabase
        .from('ky_nang_nguoi_dung')
        .select('nguoi_dung_id, ten_ky_nang, trinh_do, nam_kinh_nghiem')
        .in('nguoi_dung_id', userIds),
      supabase
        .from('task')
        .select('assignee_id, priority, risk_score, deadline, trang_thai')
        .in('assignee_id', userIds)
        .is('deleted_at', null),
    ]);

    const taskGroups = new Map<
      string,
      Array<{
        id: string;
        priority: 'low' | 'medium' | 'high' | 'urgent';
        risk_score: number | null;
        deadline: string;
        trang_thai: 'todo' | 'in-progress' | 'done';
      }>
    >();

    taskRows?.forEach((task, index) => {
      if (!task.assignee_id) {
        return;
      }

      const existing = taskGroups.get(task.assignee_id) || [];
      existing.push({
        id: `${task.assignee_id}-${index}`,
        priority: (task.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
        risk_score: task.risk_score,
        deadline: task.deadline,
        trang_thai: (task.trang_thai || 'todo') as 'todo' | 'in-progress' | 'done',
      });
      taskGroups.set(task.assignee_id, existing);
    });

    const candidates: AssignmentCandidate[] = membersData.flatMap((member) => {
      const userData = pickSingleRelation(member.nguoi_dung);
      if (!userData?.id) {
        return [];
      }

      const userSkills =
        skillsData
          ?.filter((skill) => skill.nguoi_dung_id === userData.id)
          .map((skill) => ({
            ten_ky_nang: skill.ten_ky_nang,
            trinh_do: skill.trinh_do as 'beginner' | 'intermediate' | 'advanced' | 'expert',
            nam_kinh_nghiem: skill.nam_kinh_nghiem || 0,
          })) || [];

      const workload = summarizeWorkload(taskGroups.get(userData.id) || []);

      return [
        {
          id: userData.id,
          ten: userData.ten,
          email: userData.email,
          avatar_url: userData.avatar_url || undefined,
          skills: userSkills,
          ty_le_hoan_thanh: userData.ty_le_hoan_thanh || 0,
          so_task_dang_lam: workload.activeTasks,
          load_ratio: workload.loadRatio,
          load_status: workload.loadStatus,
          overloaded_warning:
            workload.loadStatus === 'overloaded'
              ? 'Đang quá tải'
              : workload.loadStatus === 'stretched'
                ? 'Đang sát tải'
                : undefined,
        },
      ];
    });

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
      candidates_preview: candidates.slice(0, 2).map((candidate) => ({
        id: candidate.id,
        ten: candidate.ten,
        skills_count: candidate.skills.length,
        load_status: candidate.load_status,
      })),
    });

    const aiResult = await goiYPhanCong(taskInfo, candidates);

    const suggestions = aiResult.suggestions
      .map((suggestion) => {
        const loadStatus = suggestion.user?.load_status;
        const penalty = loadStatus === 'overloaded' ? 15 : loadStatus === 'stretched' ? 8 : 0;
        const loadWarning =
          loadStatus === 'overloaded'
            ? 'Hiện người này đang quá tải, chỉ nên giao nếu thật sự cần.'
            : loadStatus === 'stretched'
              ? 'Khối lượng hiện tại đã sát tải, nên cân nhắc lại deadline.'
              : null;

        return {
          ...suggestion,
          diem_phu_hop: Math.max(0, suggestion.diem_phu_hop - penalty),
          ly_do: {
            ...suggestion.ly_do,
            chinh: loadWarning ? `${suggestion.ly_do.chinh}. ${loadWarning}` : suggestion.ly_do.chinh,
            khoi_luong_hien_tai: suggestion.user?.overloaded_warning
              ? `${suggestion.user.overloaded_warning} • ${suggestion.user.so_task_dang_lam} task`
              : suggestion.ly_do.khoi_luong_hien_tai,
          },
        };
      })
      .sort((a, b) => b.diem_phu_hop - a.diem_phu_hop);

    const latency_ms = Date.now() - startTime;

    console.log('[AI Suggest Assignee] Final result:', {
      task_name: validated.ten,
      candidates_count: candidates.length,
      suggestions_count: suggestions.length,
      latency_ms,
      model: aiResult.model,
      suggestions_details: suggestions.map((suggestion) => ({
        nguoi_dung_id: suggestion.nguoi_dung_id,
        diem_phu_hop: suggestion.diem_phu_hop,
        user_name: suggestion.user?.ten,
        load_status: suggestion.user?.load_status,
      })),
    });

    return NextResponse.json({
      suggestions,
      latency_ms,
      model: aiResult.model,
      all_candidates: candidates,
      error: aiResult.error,
    });
  } catch (error) {
    console.error('Lỗi trong /api/ai/suggest-assignee:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
