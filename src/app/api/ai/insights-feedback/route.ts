import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logInsightEvent } from '@/lib/openai/insight-events';
import { supabaseAdmin } from '@/lib/supabase/client';

const schema = z.object({
  insight_type: z.enum([
    'daily_summary',
    'weekly_summary',
    'rebalance',
    'deadline_review',
    'meeting_summary',
    'team_digest',
  ]),
  event_type: z.enum(['viewed', 'accepted', 'dismissed', 'helpful', 'not_helpful']),
  reference_id: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
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
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const { data: viewer, error: userError } = await supabaseAdmin
      .from('nguoi_dung')
      .select('id')
      .eq('email', user.email)
      .single();

    if (userError || !viewer) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    await logInsightEvent({
      userId: viewer.id,
      insightType: parsed.data.insight_type,
      eventType: parsed.data.event_type,
      referenceId: parsed.data.reference_id || null,
      metadata: parsed.data.metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/ai/insights-feedback:', error);
    return NextResponse.json({ error: 'Không thể lưu phản hồi insight' }, { status: 500 });
  }
}
