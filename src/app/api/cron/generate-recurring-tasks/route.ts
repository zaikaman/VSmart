import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createTaskWithRelations } from '@/lib/tasks/create-task';
import { getNextRunFromCronExpression } from '@/lib/tasks/recurring';
import { normalizeChecklistItems } from '@/lib/tasks/checklist';

async function runRecurringGeneration() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const nowIso = new Date().toISOString();
  const { data: rules, error } = await supabase
    .from('recurring_task_rule')
    .select('*')
    .eq('is_active', true)
    .lte('next_run_at', nowIso);

  if (error) {
    throw error;
  }

  const stats = {
    processed: rules?.length || 0,
    created: 0,
    updatedRules: 0,
    errors: 0,
  };

  for (const rule of rules || []) {
    try {
      await createTaskWithRelations({
        ten: rule.title,
        mo_ta: rule.description || '',
        deadline: getNextRunFromCronExpression(rule.cron_expression, new Date(nowIso)).toISOString(),
        phan_du_an_id: rule.phan_du_an_id,
        assignee_id: rule.assignee_id,
        priority: rule.priority,
        checklist_items: normalizeChecklistItems(rule.checklist_template),
        progress_mode: 'checklist',
        template_id: rule.template_id,
        recurring_rule_id: rule.id,
      });

      const nextRunAt = getNextRunFromCronExpression(
        rule.cron_expression,
        new Date(rule.next_run_at)
      ).toISOString();

      const { error: updateError } = await supabase
        .from('recurring_task_rule')
        .update({ next_run_at: nextRunAt })
        .eq('id', rule.id);

      if (updateError) {
        throw updateError;
      }

      stats.created += 1;
      stats.updatedRules += 1;
    } catch (error) {
      console.error(`Recurring generation failed for rule ${rule.id}:`, error);
      stats.errors += 1;
    }
  }

  return stats;
}

export async function GET() {
  try {
    const stats = await runRecurringGeneration();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Recurring task cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
