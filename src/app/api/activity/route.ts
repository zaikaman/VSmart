import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/tasks/auth';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { authUser } = await getAuthenticatedUserContext();
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entityType');
    const actorId = searchParams.get('actorId');
    const action = searchParams.get('action');
    const taskId = searchParams.get('taskId');
    const projectId = searchParams.get('projectId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);

    const { data: memberships } = await supabaseAdmin
      .from('thanh_vien_du_an')
      .select('du_an_id')
      .eq('email', authUser.email)
      .eq('trang_thai', 'active');

    const accessibleProjectIds = new Set((memberships || []).map((item) => item.du_an_id));

    let query = supabaseAdmin
      .from('activity_log')
      .select(
        `
          *,
          actor:actor_id (
            id,
            ten,
            email,
            avatar_url
          )
        `
      )
      .order('created_at', { ascending: false })
      .limit(limit * 3);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    if (actorId) {
      query = query.eq('actor_id', actorId);
    }

    if (action) {
      query = query.ilike('action', `${action}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const filtered = (data || []).filter((item) => {
      const metadata = (item.metadata || {}) as Record<string, unknown>;
      const metadataProjectId =
        typeof metadata.projectId === 'string' ? metadata.projectId : null;
      const metadataTaskId = typeof metadata.taskId === 'string' ? metadata.taskId : null;

      if (metadataProjectId && !accessibleProjectIds.has(metadataProjectId)) {
        return false;
      }

      if (projectId && metadataProjectId !== projectId) {
        return false;
      }

      if (taskId && metadataTaskId !== taskId && item.entity_id !== taskId) {
        return false;
      }

      return true;
    });

    return NextResponse.json({
      data: filtered.slice(0, limit),
    });
  } catch (error) {
    console.error('Error in GET /api/activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
