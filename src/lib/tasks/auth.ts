import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export class RouteError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
    this.name = 'RouteError';
  }
}

export interface AuthenticatedUserContext {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  authUser: {
    id: string;
    email: string;
  };
  dbUser: {
    id: string;
    ten: string;
    email: string;
    vai_tro: string;
  };
}

export interface MembershipContext {
  id: string;
  vai_tro: string;
  trang_thai: string;
}

export interface ProjectAccessContext extends AuthenticatedUserContext {
  projectData: {
    id: string;
    ten: string;
    nguoi_tao_id: string;
  };
  projectId: string;
  membership: MembershipContext;
}

function extractSingleRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

export async function getAuthenticatedUserContext(): Promise<AuthenticatedUserContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    throw new RouteError('Unauthorized', 401);
  }

  const { data: dbUser, error: dbUserError } = await supabaseAdmin
    .from('nguoi_dung')
    .select('id, ten, email, vai_tro')
    .eq('email', user.email)
    .single();

  if (dbUserError || !dbUser) {
    throw new RouteError('Không tìm thấy người dùng', 404);
  }

  return {
    supabase,
    authUser: {
      id: user.id,
      email: user.email,
    },
    dbUser,
  };
}

export async function ensureProjectMembership(projectId: string, email: string) {
  const { data: membership, error } = await supabaseAdmin
    .from('thanh_vien_du_an')
    .select('id, vai_tro, trang_thai')
    .eq('du_an_id', projectId)
    .eq('email', email)
    .eq('trang_thai', 'active')
    .single();

  if (error || !membership) {
    throw new RouteError('Bạn không có quyền truy cập tài nguyên này', 403);
  }

  return membership;
}

export async function getProjectAccessContext(projectId: string): Promise<ProjectAccessContext> {
  const userContext = await getAuthenticatedUserContext();
  const { data: projectData, error: projectError } = await supabaseAdmin
    .from('du_an')
    .select('id, ten, nguoi_tao_id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single();

  if (projectError || !projectData) {
    throw new RouteError('Không tìm thấy dự án', 404);
  }

  const membership = await ensureProjectMembership(projectId, userContext.authUser.email);

  return {
    ...userContext,
    projectData,
    projectId,
    membership,
  };
}

export async function getPartAccessContext(phanDuAnId: string) {
  const userContext = await getAuthenticatedUserContext();
  const { data: partData, error: partError } = await supabaseAdmin
    .from('phan_du_an')
    .select('id, ten, du_an_id')
    .eq('id', phanDuAnId)
    .is('deleted_at', null)
    .single();

  if (partError || !partData) {
    throw new RouteError('Không tìm thấy phần dự án', 404);
  }

  const membership = await ensureProjectMembership(partData.du_an_id, userContext.authUser.email);

  return {
    ...userContext,
    partData,
    projectId: partData.du_an_id,
    membership,
  };
}

export async function getTaskAccessContext(taskId: string) {
  const userContext = await getAuthenticatedUserContext();
  const { data: taskData, error: taskError } = await supabaseAdmin
    .from('task')
    .select(
      `
      id,
      ten,
      phan_du_an_id,
      assignee_id,
      template_id,
      recurring_rule_id,
      progress_mode,
      review_status,
      phan_du_an (
        du_an_id
      )
    `
    )
    .eq('id', taskId)
    .is('deleted_at', null)
    .single();

  if (taskError || !taskData) {
    throw new RouteError('Không tìm thấy task', 404);
  }

  const partRelation = extractSingleRelation(taskData.phan_du_an as { du_an_id: string } | { du_an_id: string }[] | null);
  const projectId = partRelation?.du_an_id;

  if (!projectId) {
    throw new RouteError('Task không thuộc dự án hợp lệ', 400);
  }

  const membership = await ensureProjectMembership(projectId, userContext.authUser.email);

  return {
    ...userContext,
    taskData: {
      ...taskData,
      projectId,
    },
    projectId,
    membership,
  };
}

export function toErrorResponse(error: unknown, fallbackMessage = 'Internal server error') {
  if (error instanceof RouteError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Error) {
    return Response.json({ error: error.message || fallbackMessage }, { status: 500 });
  }

  return Response.json({ error: fallbackMessage }, { status: 500 });
}
