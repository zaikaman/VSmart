import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { sendTaskAssignedEmail, shouldSendNotification } from '@/lib/email/notifications';
import { createTaskWithRelations } from '@/lib/tasks/create-task';
import { getAuthenticatedUserContext } from '@/lib/tasks/auth';
import { normalizeChecklistItems } from '@/lib/tasks/checklist';
import { hasPermission } from '@/lib/auth/permissions';

const taskSchema = z.object({
  ten: z.string().min(1).max(200),
  mo_ta: z.string().optional(),
  deadline: z.string().datetime(),
  phan_du_an_id: z.string().uuid(),
  assignee_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  trang_thai: z.enum(['todo', 'in-progress', 'done']).optional(),
  checklist_items: z.array(z.unknown()).optional(),
  template_id: z.string().uuid().optional().nullable(),
  progress_mode: z.enum(['manual', 'checklist']).optional(),
  requires_review: z.boolean().optional(),
});

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function getProjectNameFromRelation(value: unknown) {
  const relation = Array.isArray(value) ? value[0] : value;
  return relation && typeof relation === 'object' && 'ten' in relation
    ? ((relation as { ten?: string }).ten || null)
    : null;
}

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

function buildPagination(params: { page: number; limit: number; total: number; viewMode: string | null }) {
  if (params.viewMode === 'kanban') {
    return {
      page: 1,
      limit: params.total,
      total: params.total,
      totalPages: params.total > 0 ? 1 : 0,
    };
  }

  return {
    page: params.page,
    limit: params.limit,
    total: params.total,
    totalPages: Math.ceil(params.total / params.limit),
  };
}

function canSelfAssignOnly(params: {
  actorId: string;
  currentAssigneeId?: string | null;
  nextAssigneeId?: string | null;
}) {
  const currentAssigneeId = params.currentAssigneeId ?? null;
  const nextAssigneeId = params.nextAssigneeId ?? null;

  return (
    (currentAssigneeId === null || currentAssigneeId === params.actorId) &&
    (nextAssigneeId === null || nextAssigneeId === params.actorId)
  );
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
    const reviewStatus = searchParams.get('reviewStatus');
    const isStale = searchParams.get('isStale') === 'true';
    const viewMode = searchParams.get('viewMode');

    const accessiblePartIds = await getAccessiblePartIds({
      supabase,
      email: user.email || '',
      duAnId,
      phanDuAnId,
    });

    if (accessiblePartIds.length === 0) {
      return buildEmptyResponse(page, limit);
    }

    const { data: currentDbUser } = await supabase
      .from('nguoi_dung')
      .select('id, vai_tro')
      .eq('email', user.email)
      .single();

    const memberRoleMap = new Map<string, string>();
    if (duAnId) {
      const { data: membership } = await supabase
        .from('thanh_vien_du_an')
        .select('du_an_id, vai_tro')
        .eq('email', user.email)
        .eq('trang_thai', 'active')
        .eq('du_an_id', duAnId);

      for (const item of membership || []) {
        memberRoleMap.set(item.du_an_id, item.vai_tro);
      }
    } else {
      const { data: memberships } = await supabase
        .from('thanh_vien_du_an')
        .select('du_an_id, vai_tro')
        .eq('email', user.email)
        .eq('trang_thai', 'active');

      for (const item of memberships || []) {
        memberRoleMap.set(item.du_an_id, item.vai_tro);
      }
    }

    let query = supabase
      .from('task')
      .select(
        `
        *,
        nguoi_dung:assignee_id (id, ten, email, avatar_url),
        reviewer:reviewed_by (id, ten, email, avatar_url),
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
      .order('ngay_tao', { ascending: false });

    if (viewMode !== 'kanban') {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

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

    if (reviewStatus) {
      query = query.eq('review_status', reviewStatus);
    }

    if (isStale) {
      query = query.eq('is_stale', true);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const normalizedData = (data || []).map((task) => {
      const partRelation = Array.isArray(task.phan_du_an) ? task.phan_du_an[0] : task.phan_du_an;
      const projectRole = partRelation?.du_an_id ? memberRoleMap.get(partRelation.du_an_id) || null : null;

      return {
        ...task,
        permissions: {
          canAssign: Boolean(
            currentDbUser &&
              hasPermission(
                {
                  appRole: currentDbUser.vai_tro as 'admin' | 'manager' | 'member',
                  projectRole: projectRole as 'owner' | 'admin' | 'member' | 'viewer' | null,
                  isAssignee: task.assignee_id === currentDbUser.id,
                },
                'assignTask'
              )
          ),
          canUpdate: Boolean(
            currentDbUser &&
              hasPermission(
                {
                  appRole: currentDbUser.vai_tro as 'admin' | 'manager' | 'member',
                  projectRole: projectRole as 'owner' | 'admin' | 'member' | 'viewer' | null,
                  isAssignee: task.assignee_id === currentDbUser.id,
                },
                'updateTask'
              )
          ),
          canDelete: Boolean(
            currentDbUser &&
              hasPermission(
                {
                  appRole: currentDbUser.vai_tro as 'admin' | 'manager' | 'member',
                  projectRole: projectRole as 'owner' | 'admin' | 'member' | 'viewer' | null,
                  isAssignee: task.assignee_id === currentDbUser.id,
                },
                'deleteTask'
              )
          ),
          canSubmitReview: Boolean(
            currentDbUser &&
              hasPermission(
                {
                  appRole: currentDbUser.vai_tro as 'admin' | 'manager' | 'member',
                  projectRole: projectRole as 'owner' | 'admin' | 'member' | 'viewer' | null,
                  isAssignee: task.assignee_id === currentDbUser.id,
                },
                'submitReview'
              )
          ),
          canApprove: Boolean(
            currentDbUser &&
              hasPermission(
                {
                  appRole: currentDbUser.vai_tro as 'admin' | 'manager' | 'member',
                  projectRole: projectRole as 'owner' | 'admin' | 'member' | 'viewer' | null,
                  isAssignee: task.assignee_id === currentDbUser.id,
                },
                'approveTask'
              )
          ),
          canReject: Boolean(
            currentDbUser &&
              hasPermission(
                {
                  appRole: currentDbUser.vai_tro as 'admin' | 'manager' | 'member',
                  projectRole: projectRole as 'owner' | 'admin' | 'member' | 'viewer' | null,
                  isAssignee: task.assignee_id === currentDbUser.id,
                },
                'rejectTask'
              )
          ),
        },
      };
    });

    return NextResponse.json({
      data: normalizedData,
      pagination: buildPagination({
        page,
        limit,
        total: count || 0,
        viewMode,
      }),
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
      .select('du_an_id, ten, du_an:du_an_id (ten)')
      .eq('id', validated.phan_du_an_id)
      .is('deleted_at', null)
      .single();

    if (!partData) {
      return NextResponse.json({ error: 'Phần dự án không tồn tại' }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from('thanh_vien_du_an')
      .select('id, vai_tro')
      .eq('du_an_id', partData.du_an_id)
      .eq('email', authUser.email)
      .eq('trang_thai', 'active')
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Bạn không có quyền tạo task trong dự án này' }, { status: 403 });
    }

    const canCreate = hasPermission(
      {
        appRole: dbUser.vai_tro as 'admin' | 'manager' | 'member',
        projectRole: membership.vai_tro as 'owner' | 'admin' | 'member' | 'viewer',
      },
      'createTask'
    );

    if (!canCreate) {
      return NextResponse.json({ error: 'Bạn không có quyền tạo task trong dự án này' }, { status: 403 });
    }

    const canAssign = hasPermission(
      {
        appRole: dbUser.vai_tro as 'admin' | 'manager' | 'member',
        projectRole: membership.vai_tro as 'owner' | 'admin' | 'member' | 'viewer',
      },
      'assignTask'
    );

    if (
      validated.assignee_id !== undefined &&
      !canAssign &&
      !canSelfAssignOnly({
        actorId: dbUser.id,
        nextAssigneeId: validated.assignee_id,
      })
    ) {
      return NextResponse.json(
        { error: 'Báº¡n chá»‰ cÃ³ thá»ƒ giao task cho chÃ­nh mÃ¬nh' },
        { status: 403 }
      );
    }

    if (validated.assignee_id) {
      const { data: assigneeMembership, error: assigneeMembershipError } = await supabase
        .from('thanh_vien_du_an')
        .select('id')
        .eq('du_an_id', partData.du_an_id)
        .eq('nguoi_dung_id', validated.assignee_id)
        .eq('trang_thai', 'active')
        .maybeSingle();

      if (assigneeMembershipError) {
        return NextResponse.json({ error: 'KhÃ´ng thá»ƒ kiá»ƒm tra ngÆ°á»i Ä‘Æ°á»£c giao' }, { status: 400 });
      }

      if (!assigneeMembership) {
        return NextResponse.json(
          { error: 'NgÆ°á»i Ä‘Æ°á»£c giao khÃ´ng thuá»™c dá»± Ã¡n nÃ y' },
          { status: 400 }
        );
      }
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
      trang_thai: validated.trang_thai,
      checklist_items: checklistItems,
      template_id: validated.template_id ?? null,
      progress_mode: validated.progress_mode,
      requires_review: validated.requires_review,
      actor_id: dbUser.id,
      project_id: partData.du_an_id,
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
            const projectName = getProjectNameFromRelation(partData.du_an) || 'Dự án';

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
