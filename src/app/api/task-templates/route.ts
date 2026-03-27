import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getAuthenticatedUserContext } from '@/lib/tasks/auth';
import { normalizeChecklistItems, serializeChecklistTemplate } from '@/lib/tasks/checklist';

const createTemplateSchema = z.object({
  ten: z.string().trim().min(1, 'Tên mẫu task là bắt buộc.').max(200, 'Tên mẫu task không được vượt quá 200 ký tự.'),
  mo_ta: z.string().trim().max(2000, 'Mô tả mẫu task không được vượt quá 2000 ký tự.').optional(),
  default_priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  checklist_template: z.array(z.unknown()).optional(),
  is_shared: z.boolean().default(false),
});

export async function GET() {
  try {
    const auth = await getAuthenticatedUserContext();
    const { data, error } = await supabaseAdmin
      .from('task_template')
      .select('*')
      .or(`created_by.eq.${auth.dbUser.id},is_shared.eq.true`)
      .order('ngay_tao', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET task templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    const body = await request.json();
    const validated = createTemplateSchema.parse(body);
    const checklistTemplate = serializeChecklistTemplate(
      normalizeChecklistItems(validated.checklist_template || [])
    );

    const { data, error } = await supabaseAdmin
      .from('task_template')
      .insert({
        ten: validated.ten,
        mo_ta: validated.mo_ta,
        default_priority: validated.default_priority,
        checklist_template: checklistTemplate,
        created_by: auth.dbUser.id,
        is_shared: validated.is_shared,
      })
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Không thể tạo template' }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }
    console.error('POST task template error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
