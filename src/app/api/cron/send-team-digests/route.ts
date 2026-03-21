import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildInsightDataset } from '@/lib/openai/insight-context';
import { aiDailySummary } from '@/lib/openai/daily-summary';
import { aiWeeklySummary } from '@/lib/openai/weekly-summary';
import { logInsightEvent } from '@/lib/openai/insight-events';
import { sendTeamDigestEmail } from '@/lib/email/notifications';

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: users, error } = await supabase
      .from('nguoi_dung')
      .select('id, ten, email, vai_tro')
      .in('vai_tro', ['admin', 'manager']);

    if (error) {
      throw new Error(error.message);
    }

    const now = new Date();
    const isMonday = now.getDay() === 1;
    let sent = 0;
    let failed = 0;

    for (const user of users || []) {
      try {
        const dataset = await buildInsightDataset({
          email: user.email,
          lookbackDays: 7,
          lookaheadDays: 7,
        });

        if (dataset.project_ids.length === 0) {
          continue;
        }

        const digest = isMonday
          ? await aiWeeklySummary(dataset)
          : await aiDailySummary(dataset);

        const success = await sendTeamDigestEmail({
          recipientEmail: user.email,
          recipientName: user.ten,
          digestType: isMonday ? 'weekly' : 'daily',
          headline: digest.result.headline,
          summary: digest.result.summary,
          bullets:
            'recommended_actions' in digest.result
              ? digest.result.recommended_actions
              : digest.result.next_focus,
          referenceId: digest.digest_key,
        });

        if (success) {
          sent += 1;
          await logInsightEvent({
            userId: user.id,
            insightType: 'team_digest',
            eventType: 'sent',
            referenceId: digest.digest_key,
            metadata: {
              digestType: isMonday ? 'weekly' : 'daily',
            },
          }).catch(() => null);
        } else {
          failed += 1;
        }
      } catch (digestError) {
        failed += 1;
        console.error(`Lỗi gửi digest cho ${user.email}:`, digestError);
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      digestType: isMonday ? 'weekly' : 'daily',
    });
  } catch (error) {
    console.error('Error in POST /api/cron/send-team-digests:', error);
    return NextResponse.json({ error: 'Không thể gửi digest đội nhóm' }, { status: 500 });
  }
}
