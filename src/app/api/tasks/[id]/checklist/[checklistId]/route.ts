import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getTaskAccessContext } from '@/lib/tasks/auth';
import { syncTaskProgressFromChecklist } from '@/lib/tasks/progress';

const updateChecklistSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  is_done: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

async function ensureChecklistOwnership(taskId: string, checklistId: string) {
  const { data: checklistItem, error } = await supabaseAdmin
    .from('task_checklist_item')
    .select('id, task_id')
    .eq('id', checklistId)
    .eq('task_id', taskId)
    .single();

  if (error || !checklistItem) {
    return null;
  }

  return checklistItem;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const { id, checklistId } = await params;
    await getTaskAccessContext(id);
    const checklistItem = await ensureChecklistOwnership(id, checklistId);

    if (!checklistItem) {
      return NextResponse.json({ error: 'Không tìm thấy checklist item' }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateChecklistSchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from('task_checklist_item')
      .update(validated)
      .eq('id', checklistId)
      .eq('task_id', id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Không thể cập nhật checklist item' }, { status: 400 });
    }

    await syncTaskProgressFromChecklist(id);

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('PATCH checklist item error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const { id, checklistId } = await params;
    await getTaskAccessContext(id);
    const checklistItem = await ensureChecklistOwnership(id, checklistId);

    if (!checklistItem) {
      return NextResponse.json({ error: 'Không tìm thấy checklist item' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('task_checklist_item')
      .delete()
      .eq('id', checklistId)
      .eq('task_id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await syncTaskProgressFromChecklist(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE checklist item error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
