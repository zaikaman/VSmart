import { supabaseAdmin } from '@/lib/supabase/client';

type ActivityEntityType = 'task' | 'project' | 'project_part' | 'comment' | 'review';

interface ActivityLogInput {
  entityType: ActivityEntityType;
  entityId: string;
  action: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}

interface TaskHistoryInput {
  taskId: string;
  actorId: string;
  action:
    | 'created'
    | 'assigned'
    | 'status_changed'
    | 'progress_updated'
    | 'completed'
    | 'deleted';
  previousValue?: Record<string, unknown> | null;
  nextValue?: Record<string, unknown> | null;
}

export async function logActivity(input: ActivityLogInput) {
  const { error } = await supabaseAdmin.from('activity_log').insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    actor_id: input.actorId,
    metadata: input.metadata || {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function logTaskHistory(input: TaskHistoryInput) {
  const { error } = await supabaseAdmin.from('lich_su_task').insert({
    task_id: input.taskId,
    hanh_dong: input.action,
    nguoi_thuc_hien_id: input.actorId,
    gia_tri_cu: input.previousValue || null,
    gia_tri_moi: input.nextValue || null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function logTaskActivity(params: {
  taskId: string;
  actorId: string;
  action: string;
  metadata?: Record<string, unknown>;
  historyAction?: TaskHistoryInput['action'];
  previousValue?: Record<string, unknown> | null;
  nextValue?: Record<string, unknown> | null;
}) {
  await logActivity({
    entityType: 'task',
    entityId: params.taskId,
    action: params.action,
    actorId: params.actorId,
    metadata: params.metadata,
  });

  if (params.historyAction) {
    await logTaskHistory({
      taskId: params.taskId,
      actorId: params.actorId,
      action: params.historyAction,
      previousValue: params.previousValue,
      nextValue: params.nextValue,
    });
  }
}
