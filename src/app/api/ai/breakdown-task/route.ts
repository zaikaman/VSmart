import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { taoChecklistBangAI } from '@/lib/openai/task-breakdown';

const breakdownSchema = z.object({
  ten: z.string().min(1).max(200),
  mo_ta: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = breakdownSchema.parse(body);
    const result = await taoChecklistBangAI(validated);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('AI breakdown error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
