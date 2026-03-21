import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getTaskAccessContext } from '@/lib/tasks/auth';
import { normalizeChecklistItems } from '@/lib/tasks/checklist';
import { getNextRunFromCronExpression } from '@/lib/tasks/recurring';

const recurringSchema = z.object({
  cron_expression: z.string().min(5),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  checklist_template: z.array(z.unknown()).optional(),
  template_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().default(true),
});

async function getRecurringRuleForTask(taskId: string, recurringRuleId?: string | null) {
  if (recurringRuleId) {
    const { data } = await supabaseAdmin
      .from('recurring_task_rule')
      .select('*')
      .eq('id', recurringRuleId)
      .single();

    if (data) {
      return data;
    }
  }

  const { data } = await supabaseAdmin
    .from('recurring_task_rule')
    .select('*')
    .eq('source_task_id', taskId)
    .order('ngay_tao', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getTaskAccessContext(id);
    const rule = await getRecurringRuleForTask(id, auth.taskData.recurring_rule_id);

    return NextResponse.json({ data: rule });
  } catch (error) {
    console.error('GET recurring rule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getTaskAccessContext(id);
    const body = await request.json();
    const validated = recurringSchema.parse(body);

    const { data: task } = await supabaseAdmin
      .from('task')
      .select('id, ten, mo_ta, priority, assignee_id, phan_du_an_id, template_id')
      .eq('id', id)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'Không tìm thấy task' }, { status: 404 });
    }

    const checklistTemplate =
      validated.checklist_template && validated.checklist_template.length > 0
        ? normalizeChecklistItems(validated.checklist_template)
        : normalizeChecklistItems(
            (
              await supabaseAdmin
                .from('task_checklist_item')
                .select('title, is_done, sort_order')
                .eq('task_id', id)
                .order('sort_order', { ascending: true })
            ).data || []
          );

    const nextRunAt = getNextRunFromCronExpression(validated.cron_expression, new Date());
    const existingRule = await getRecurringRuleForTask(id, auth.taskData.recurring_rule_id);
    const payload = {
      source_task_id: id,
      title: validated.title || task.ten,
      description: validated.description ?? task.mo_ta ?? '',
      priority: validated.priority || task.priority,
      cron_expression: validated.cron_expression,
      phan_du_an_id: task.phan_du_an_id,
      assignee_id: validated.assignee_id ?? task.assignee_id,
      template_id: validated.template_id ?? task.template_id ?? null,
      checklist_template: checklistTemplate,
      next_run_at: nextRunAt.toISOString(),
      is_active: validated.is_active,
      created_by: auth.dbUser.id,
    };

    const query = existingRule
      ? supabaseAdmin
          .from('recurring_task_rule')
          .update(payload)
          .eq('id', existingRule.id)
      : supabaseAdmin.from('recurring_task_rule').insert(payload);

    const { data, error } = await query.select().single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Không thể lưu recurring rule' }, { status: 400 });
    }

    await supabaseAdmin
      .from('task')
      .update({ recurring_rule_id: data.id })
      .eq('id', id);

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('POST recurring rule error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getTaskAccessContext(id);
    const rule = await getRecurringRuleForTask(id, auth.taskData.recurring_rule_id);

    if (!rule) {
      return NextResponse.json({ success: true });
    }

    await supabaseAdmin
      .from('recurring_task_rule')
      .update({ is_active: false })
      .eq('id', rule.id);

    await supabaseAdmin
      .from('task')
      .update({ recurring_rule_id: null })
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE recurring rule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
