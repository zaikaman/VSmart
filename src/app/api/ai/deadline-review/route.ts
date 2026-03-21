import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { reviewDeadlineReasonability } from '@/lib/openai/deadline-review';
import { logInsightEvent } from '@/lib/openai/insight-events';
import { supabaseAdmin } from '@/lib/supabase/client';

const schema = z.object({
  ten: z.string().min(3, 'Tên task cần ít nhất 3 ký tự'),
  mo_ta: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  deadline: z.string(),
  projectId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const { data: viewer } = await supabaseAdmin
      .from('nguoi_dung')
      .select('id')
      .eq('email', user.email)
      .single();

    let projectName: string | null = null;

    if (parsed.data.projectId) {
      const { data: project } = await supabaseAdmin
        .from('du_an')
        .select('ten')
        .eq('id', parsed.data.projectId)
        .single();

      projectName = project?.ten || null;
    }

    const result = await reviewDeadlineReasonability({
      ...parsed.data,
      projectName,
    });

    if (viewer?.id) {
      await logInsightEvent({
        userId: viewer.id,
        insightType: 'deadline_review',
        eventType: 'generated',
        metadata: {
          warningLevel: result.result.warning_level,
        },
      }).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in POST /api/ai/deadline-review:', error);
    return NextResponse.json({ error: 'Không thể đánh giá deadline' }, { status: 500 });
  }
}
