import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getTaskAccessContext } from '@/lib/tasks/auth';
import { canManageTaskChecklist } from '@/lib/auth/permissions';
import { normalizeChecklistItems } from '@/lib/tasks/checklist';
import { syncTaskProgressFromChecklist } from '@/lib/tasks/progress';

const createChecklistSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề checklist không được để trống.').max(255, 'Tiêu đề checklist không được vượt quá 255 ký tự.').optional(),
  items: z.array(z.unknown()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await getTaskAccessContext(id);

    const { data, error } = await supabaseAdmin
      .from('task_checklist_item')
      .select('*')
      .eq('task_id', id)
      .order('sort_order', { ascending: true })
      .order('ngay_tao', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET task checklist error:', error);
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

    if (
      !canManageTaskChecklist({
        appRole: auth.dbUser.vai_tro,
        projectRole: auth.membership.vai_tro,
        isAssignee: auth.taskData.assignee_id === auth.dbUser.id,
      })
    ) {
      return NextResponse.json({ error: 'Bạn không có quyền thêm checklist cho task này' }, { status: 403 });
    }

    const body = await request.json();
    const validated = createChecklistSchema.parse(body);

    const items =
      validated.items && validated.items.length > 0
        ? normalizeChecklistItems(validated.items)
        : normalizeChecklistItems(validated.title ? [validated.title] : []);

    if (items.length === 0) {
      return NextResponse.json({ error: 'Checklist item không hợp lệ' }, { status: 400 });
    }

    const { data: existingItems } = await supabaseAdmin
      .from('task_checklist_item')
      .select('id')
      .eq('task_id', id);

    const offset = existingItems?.length || 0;

    const { data, error } = await supabaseAdmin
      .from('task_checklist_item')
      .insert(
        items.map((item, index) => ({
          task_id: id,
          title: item.title,
          is_done: item.is_done ?? false,
          sort_order: item.sort_order ?? offset + index,
        }))
      )
      .select()
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await syncTaskProgressFromChecklist(id);

    return NextResponse.json({ data: data || [] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }
    console.error('POST task checklist error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
