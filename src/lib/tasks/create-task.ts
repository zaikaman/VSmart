import { supabaseAdmin } from '@/lib/supabase/client';
import { logTaskActivity } from '@/lib/activity/log';
import { ChecklistItemInput, normalizeChecklistItems } from './checklist';
import { syncTaskProgressFromChecklist, updatePhanDuAnProgress } from './progress';

export interface CreateTaskWithRelationsInput {
  ten: string;
  mo_ta?: string;
  deadline: string;
  phan_du_an_id: string;
  assignee_id?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  trang_thai?: 'todo' | 'in-progress' | 'done';
  progress_mode?: 'manual' | 'checklist';
  template_id?: string | null;
  recurring_rule_id?: string | null;
  checklist_items?: ChecklistItemInput[] | unknown;
  actor_id?: string;
  project_id?: string;
}

export async function createTaskWithRelations(input: CreateTaskWithRelationsInput) {
  const checklistItems = normalizeChecklistItems(input.checklist_items || []);
  const progressMode =
    input.progress_mode || (checklistItems.length > 0 ? 'checklist' : 'manual');
  const initialStatus = input.trang_thai || 'todo';
  const initialProgress =
    progressMode === 'checklist'
      ? 0
      : initialStatus === 'done'
        ? 100
        : initialStatus === 'in-progress'
          ? 50
          : 0;

  const { data: task, error: taskError } = await supabaseAdmin
    .from('task')
    .insert([
      {
        ten: input.ten,
        mo_ta: input.mo_ta,
        deadline: input.deadline,
        phan_du_an_id: input.phan_du_an_id,
        assignee_id: input.assignee_id ?? null,
        priority: input.priority || 'medium',
        trang_thai: initialStatus,
        progress: initialProgress,
        risk_score: 0,
        risk_level: 'low',
        is_stale: false,
        progress_mode: progressMode,
        template_id: input.template_id ?? null,
        recurring_rule_id: input.recurring_rule_id ?? null,
      },
    ])
    .select()
    .single();

  if (taskError || !task) {
    throw new Error(taskError?.message || 'Không thể tạo task');
  }

  if (checklistItems.length > 0) {
    const { error: checklistError } = await supabaseAdmin.from('task_checklist_item').insert(
      checklistItems.map((item, index) => ({
        task_id: task.id,
        title: item.title,
        is_done: item.is_done ?? false,
        sort_order: item.sort_order ?? index,
      }))
    );

    if (checklistError) {
      await supabaseAdmin.from('task').delete().eq('id', task.id);
      throw new Error(checklistError.message || 'Không thể tạo checklist cho task');
    }

    await syncTaskProgressFromChecklist(task.id);
  } else {
    await updatePhanDuAnProgress(task.phan_du_an_id);
  }

  if (input.actor_id) {
    await logTaskActivity({
      taskId: task.id,
      actorId: input.actor_id,
      action: 'task_created',
      historyAction: 'created',
      nextValue: {
        taskName: task.ten,
        assigneeId: task.assignee_id,
        deadline: task.deadline,
        priority: task.priority,
      },
      metadata: {
        projectId: input.project_id || null,
        partId: task.phan_du_an_id,
        taskName: task.ten,
        checklistCount: checklistItems.length,
        templateId: task.template_id,
      },
    });
  }

  return task;
}
