import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createTaskWithRelations } from '@/lib/tasks/create-task';
import { getAuthenticatedUserContext, getPartAccessContext } from '@/lib/tasks/auth';
import { normalizeChecklistItems } from '@/lib/tasks/checklist';

const instantiateTemplateSchema = z.object({
  phan_du_an_id: z.string().uuid(),
  deadline: z.string().datetime(),
  assignee_id: z.string().uuid().nullable().optional(),
  ten: z.string().min(1).max(200).optional(),
  mo_ta: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUserContext();
    const body = await request.json();
    const validated = instantiateTemplateSchema.parse(body);
    await getPartAccessContext(validated.phan_du_an_id);

    const { data: template, error } = await supabaseAdmin
      .from('task_template')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Template không tồn tại' }, { status: 404 });
    }

    if (!template.is_shared && template.created_by !== auth.dbUser.id) {
      return NextResponse.json({ error: 'Bạn không có quyền dùng template này' }, { status: 403 });
    }

    const task = await createTaskWithRelations({
      ten: validated.ten || template.ten,
      mo_ta: validated.mo_ta ?? template.mo_ta ?? '',
      deadline: validated.deadline,
      phan_du_an_id: validated.phan_du_an_id,
      assignee_id: validated.assignee_id ?? null,
      priority: validated.priority || template.default_priority,
      checklist_items: normalizeChecklistItems(template.checklist_template),
      template_id: template.id,
      progress_mode: 'checklist',
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Instantiate template error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
