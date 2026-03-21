import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { sendTaskAssignedEmail, shouldSendNotification } from '@/lib/email/notifications';
import { createTaskWithRelations } from '@/lib/tasks/create-task';
import { getAuthenticatedUserContext } from '@/lib/tasks/auth';
import { normalizeChecklistItems } from '@/lib/tasks/checklist';

const taskSchema = z.object({
  ten: z.string().min(1).max(200),
  mo_ta: z.string().optional(),
  deadline: z.string().datetime(),
  phan_du_an_id: z.string().uuid(),
  assignee_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  checklist_items: z.array(z.unknown()).optional(),
  template_id: z.string().uuid().optional().nullable(),
  progress_mode: z.enum(['manual', 'checklist']).optional(),
});

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildEmptyResponse(page: number, limit: number) {
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

async function getAccessiblePartIds({
  supabase,
  email,
  duAnId,
  phanDuAnId,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  email: string;
  duAnId: string | null;
  phanDuAnId: string | null;
}) {
  const { data: memberships, error: membershipError } = await supabase
    .from('thanh_vien_du_an')
    .select('du_an_id')
    .eq('email', email)
    .eq('trang_thai', 'active');

  if (membershipError) {
    throw membershipError;
  }

  let projectIds = memberships?.map((membership) => membership.du_an_id) || [];

  if (duAnId) {
    projectIds = projectIds.filter((projectId) => projectId === duAnId);
  }

  if (projectIds.length === 0) {
    return [];
  }

  let partsQuery = supabase
    .from('phan_du_an')
    .select('id')
    .in('du_an_id', projectIds)
    .is('deleted_at', null);

  if (phanDuAnId) {
    partsQuery = partsQuery.eq('id', phanDuAnId);
  }

  const { data: projectParts, error: partsError } = await partsQuery;

  if (partsError) {
    throw partsError;
  }

  return projectParts?.map((part) => part.id) || [];
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

    const searchParams = request.nextUrl.searchParams;
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT), MAX_LIMIT);
    const trangThai = searchParams.get('trangThai');
    const assigneeId = searchParams.get('assigneeId');
    const deadline = searchParams.get('deadline');
    const duAnId = searchParams.get('duAnId');
    const phanDuAnId = searchParams.get('phanDuAnId');
    const riskLevel = searchParams.get('riskLevel');
    const riskScoreMin = searchParams.get('riskScoreMin');
    const isStale = searchParams.get('isStale') === 'true';

    const accessiblePartIds = await getAccessiblePartIds({
      supabase,
      email: user.email || '',
      duAnId,
      phanDuAnId,
    });

    if (accessiblePartIds.length === 0) {
      return buildEmptyResponse(page, limit);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

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
          du_an (
            ten
          )
        )
      `,
        { count: 'exact' }
      )
      .in('phan_du_an_id', accessiblePartIds)
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

    if (riskLevel) {
      query = query.eq('risk_level', riskLevel);
    }

    if (riskScoreMin) {
      const parsedRiskScore = Number.parseInt(riskScoreMin, 10);
      if (Number.isFinite(parsedRiskScore)) {
        query = query.gte('risk_score', parsedRiskScore);
      }
    }

    if (isStale) {
      query = query.eq('is_stale', true);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, authUser, dbUser } = await getAuthenticatedUserContext();
    const body = await request.json();
    const validated = taskSchema.parse(body);

    const { data: partData } = await supabase
      .from('phan_du_an')
      .select('du_an_id, du_an:du_an_id (ten)')
      .eq('id', validated.phan_du_an_id)
      .is('deleted_at', null)
      .single();

    if (!partData) {
      return NextResponse.json({ error: 'Phần dự án không tồn tại' }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from('thanh_vien_du_an')
      .select('id')
      .eq('du_an_id', partData.du_an_id)
      .eq('email', authUser.email)
      .eq('trang_thai', 'active')
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Bạn không có quyền tạo task trong dự án này' },
        { status: 403 }
      );
    }

    let checklistItems = normalizeChecklistItems(validated.checklist_items || []);

    if (validated.template_id) {
      const { data: template, error: templateError } = await supabase
        .from('task_template')
        .select('id, checklist_template, created_by, is_shared')
        .eq('id', validated.template_id)
        .single();

      if (templateError || !template) {
        return NextResponse.json({ error: 'Template không tồn tại' }, { status: 404 });
      }

      if (!template.is_shared && template.created_by !== dbUser.id) {
        return NextResponse.json({ error: 'Bạn không có quyền dùng template này' }, { status: 403 });
      }

      if (checklistItems.length === 0) {
        checklistItems = normalizeChecklistItems(template.checklist_template);
      }
    }

    const data = await createTaskWithRelations({
      ten: validated.ten,
      mo_ta: validated.mo_ta,
      deadline: validated.deadline,
      phan_du_an_id: validated.phan_du_an_id,
      assignee_id: validated.assignee_id,
      priority: validated.priority,
      checklist_items: checklistItems,
      template_id: validated.template_id ?? null,
      progress_mode: validated.progress_mode,
    });

    if (validated.assignee_id) {
      try {
        const { data: assigneeData } = await supabase
          .from('nguoi_dung')
          .select('email, ten')
          .eq('id', validated.assignee_id)
          .single();

        if (assigneeData && assigneeData.email !== authUser.email) {
          const shouldSend = await shouldSendNotification(assigneeData.email, 'emailTaskAssigned');
          if (shouldSend) {
            const projectName = Array.isArray(partData.du_an)
              ? partData.du_an[0]?.ten
              : (partData.du_an as { ten: string } | null)?.ten || 'Chưa xác định';

            sendTaskAssignedEmail(assigneeData.email, assigneeData.ten, {
              taskId: data.id,
              taskName: validated.ten,
              projectName,
              deadline: validated.deadline,
              priority: validated.priority,
            }).catch((emailError) => console.error('Error sending task assigned email:', emailError));
          }
        }
      } catch (emailError) {
        console.error('Error sending task assignment notification:', emailError);
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error in POST /api/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
