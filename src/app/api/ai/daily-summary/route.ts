import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { aiDailySummary } from '@/lib/openai/daily-summary';
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
    const summary = await aiDailySummary(dataset);

    await logInsightEvent({
      userId: dataset.viewer.id,
      insightType: 'daily_summary',
      eventType: 'generated',
      referenceId: summary.digest_key,
      metadata: {
        projectId: parsed.data.projectId || null,
        tone: summary.result.tone,
      },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error in POST /api/ai/daily-summary:', error);
    return NextResponse.json({ error: 'Không thể tạo tóm tắt ngày' }, { status: 500 });
  }
}
