import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { aiRebalanceSuggestions } from '@/lib/openai/rebalance-suggestions';
import { buildInsightDataset } from '@/lib/openai/insight-context';
import { logInsightEvent } from '@/lib/openai/insight-events';

const schema = z.object({
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

    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const dataset = await buildInsightDataset({
      email: user.email,
      projectId: parsed.data.projectId,
      lookbackDays: 7,
      lookaheadDays: 7,
    });
    const result = await aiRebalanceSuggestions(dataset);

    await logInsightEvent({
      userId: dataset.viewer.id,
      insightType: 'rebalance',
      eventType: 'generated',
      referenceId: result.reference_id,
      metadata: {
        projectId: parsed.data.projectId || null,
        suggestions: result.result.suggestions.length,
      },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in POST /api/ai/rebalance:', error);
    return NextResponse.json({ error: 'Không thể tạo gợi ý cân tải' }, { status: 500 });
  }
}
