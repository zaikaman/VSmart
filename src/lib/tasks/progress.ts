import { supabaseAdmin } from '@/lib/supabase/client';
import { calculateDuAnProgress, calculatePhanDuAnProgress } from '@/lib/utils/calculate-progress';

function extractSingleRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

export async function updateDuAnProgress(duAnId: string) {
  const { data: parts, error: partsError } = await supabaseAdmin
    .from('phan_du_an')
    .select('id, phan_tram_hoan_thanh')
    .eq('du_an_id', duAnId)
    .is('deleted_at', null);

  if (partsError || !parts || parts.length === 0) {
    return;
  }

  const newProgress = calculateDuAnProgress(
    parts.map((part) => ({
      phanTramHoanThanh: part.phan_tram_hoan_thanh || 0,
    }))
  );

  await supabaseAdmin
    .from('du_an')
    .update({ phan_tram_hoan_thanh: newProgress })
    .eq('id', duAnId)
    .is('deleted_at', null);
}

export async function updatePhanDuAnProgress(phanDuAnId: string) {
  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from('task')
    .select('id, trang_thai, progress')
    .eq('phan_du_an_id', phanDuAnId)
    .is('deleted_at', null);

  if (tasksError || !tasks) {
    return;
  }

  const newProgress = calculatePhanDuAnProgress(
    tasks.map((task) => ({
      id: task.id,
      trangThai: task.trang_thai,
      progress: task.progress,
    }))
  );

  const { data: updatedPart, error: updateError } = await supabaseAdmin
    .from('phan_du_an')
    .update({ phan_tram_hoan_thanh: newProgress })
    .eq('id', phanDuAnId)
    .is('deleted_at', null)
    .select('du_an_id')
    .single();

  if (updateError || !updatedPart?.du_an_id) {
    return;
  }

  await updateDuAnProgress(updatedPart.du_an_id);
}

export async function syncTaskProgressFromChecklist(taskId: string) {
  const { data: task, error: taskError } = await supabaseAdmin
    .from('task')
    .select('id, progress_mode, phan_du_an_id, trang_thai')
    .eq('id', taskId)
    .is('deleted_at', null)
    .single();

  if (taskError || !task) {
    return;
  }

  const { count: totalItems } = await supabaseAdmin
    .from('task_checklist_item')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', taskId);

  const { count: completedItems } = await supabaseAdmin
    .from('task_checklist_item')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', taskId)
    .eq('is_done', true);

  if (task.progress_mode === 'checklist') {
    const total = totalItems || 0;
    const done = completedItems || 0;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    const trangThai =
      progress >= 100 ? 'done' : progress > 0 ? 'in-progress' : 'todo';

    await supabaseAdmin
      .from('task')
      .update({
        progress,
        trang_thai: trangThai,
      })
      .eq('id', taskId)
      .is('deleted_at', null);
  }

  await updatePhanDuAnProgress(task.phan_du_an_id);
}

export async function syncTaskProgressAfterTaskUpdate(taskId: string) {
  const { data: task } = await supabaseAdmin
    .from('task')
    .select(
      `
      id,
      phan_du_an_id,
      recurring_rule_id,
      recurring_task_rule (
        id,
        source_task_id
      )
    `
    )
    .eq('id', taskId)
    .single();

  if (!task?.phan_du_an_id) {
    return;
  }

  await updatePhanDuAnProgress(task.phan_du_an_id);

  const recurringRule = extractSingleRelation(
    task.recurring_task_rule as { id: string; source_task_id?: string | null } | { id: string; source_task_id?: string | null }[] | null
  );

  if (recurringRule?.source_task_id && recurringRule.source_task_id !== taskId) {
    await updatePhanDuAnProgress(task.phan_du_an_id);
  }
}
