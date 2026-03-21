import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { summarizeMeetingNotes } from '@/lib/openai/meeting-summary';
import { buildInsightDataset } from '@/lib/openai/insight-context';
import { logInsightEvent } from '@/lib/openai/insight-events';

const schema = z.object({
  notes: z.string().min(20, 'Ghi chú cuộc họp cần chi tiết hơn'),
  projectId: z.string().uuid().optional(),
  projectName: z.string().optional(),
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

    const context = parsed.data.projectId
      ? await buildInsightDataset({
          email: user.email,
          projectId: parsed.data.projectId,
          lookbackDays: 7,
          lookaheadDays: 7,
        })
      : null;

    const result = await summarizeMeetingNotes({
      notes: parsed.data.notes,
      projectName: parsed.data.projectName || null,
      context,
    });

    if (context) {
      await logInsightEvent({
        userId: context.viewer.id,
        insightType: 'meeting_summary',
        eventType: 'generated',
        referenceId: result.reference_id,
        metadata: {
          projectId: parsed.data.projectId || null,
        },
      }).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in POST /api/ai/meeting-summary:', error);
    return NextResponse.json({ error: 'Không thể tóm tắt cuộc họp' }, { status: 500 });
  }
}
