'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDailySummary, useInsightFeedback, useWeeklySummary } from '@/lib/hooks/use-ai-insights';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '600', '800'] });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '700'] });

type SummaryTab = 'daily' | 'weekly';
type FeedbackChoice = 'helpful' | 'not_helpful';

const toneStyles = {
  'on-track': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  watch: 'border-amber-200 bg-amber-50 text-amber-700',
  critical: 'border-rose-200 bg-rose-50 text-rose-700',
};

export function ExecutiveSummaryWidget() {
  const [tab, setTab] = useState<SummaryTab>('daily');
  const [refreshToken, setRefreshToken] = useState<Record<SummaryTab, number>>({
    daily: 0,
    weekly: 0,
  });
  const [feedbackChoice, setFeedbackChoice] = useState<Record<SummaryTab, FeedbackChoice | null>>({
    daily: null,
    weekly: null,
  });

  const dailyQuery = useDailySummary(undefined, true, refreshToken.daily);
  const weeklyQuery = useWeeklySummary(undefined, tab === 'weekly', refreshToken.weekly);
  const viewEventMutation = useInsightFeedback();
  const feedbackMutation = useInsightFeedback();

  const activeData = tab === 'daily' ? dailyQuery.data : weeklyQuery.data;
  const isLoading = tab === 'daily' ? dailyQuery.isLoading : weeklyQuery.isLoading;
  const isRefreshing = tab === 'daily' ? dailyQuery.isFetching : weeklyQuery.isFetching;
  const error = tab === 'daily' ? dailyQuery.error : weeklyQuery.error;

  const referenceId = useMemo(
    () => (tab === 'daily' ? dailyQuery.data?.digest_key : weeklyQuery.data?.digest_key),
    [dailyQuery.data?.digest_key, tab, weeklyQuery.data?.digest_key]
  );
  const activeInsightType = tab === 'daily' ? 'team_digest' : 'weekly_summary';
  const currentFeedback = feedbackChoice[tab];

  useEffect(() => {
    if (!referenceId) {
      return;
    }

    viewEventMutation.mutate({
      insight_type: activeInsightType,
      event_type: 'viewed',
      reference_id: referenceId,
      metadata: {
        source: 'dashboard_widget',
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInsightType, referenceId, tab]);

  const tone =
    tab === 'daily' ? dailyQuery.data?.result.tone || 'watch' : error ? 'watch' : 'on-track';

  const handleRefresh = () => {
    setFeedbackChoice(current => ({
      ...current,
      [tab]: null,
    }));
    setRefreshToken(current => ({
      ...current,
      [tab]: current[tab] + 1,
    }));
  };

  const handleFeedback = async (choice: FeedbackChoice) => {
    if (!referenceId) {
      toast.error('Chưa có insight để ghi nhận lúc này.');
      return;
    }

    try {
      await feedbackMutation.mutateAsync({
        insight_type: activeInsightType,
        event_type: choice,
        reference_id: referenceId,
        metadata: {
          source: 'dashboard_widget',
          tab,
        },
      });

      setFeedbackChoice(current => ({
        ...current,
        [tab]: choice,
      }));
      toast.success(
        choice === 'helpful'
          ? 'Đã ghi nhận insight này hữu ích.'
          : 'Đã ghi nhận insight chưa đúng ý.'
      );
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : 'Chưa lưu được phản hồi, hãy thử lại.'
      );
    }
  };

  return (
    <section
      className={`rounded-[30px] border border-[#d9e1cf] bg-[#f8f7f2] p-6 ${bricolage.className}`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d4dbc8] bg-white px-3 py-1 text-xs tracking-[0.24em] text-[#62705d] uppercase">
            <Sparkles className="h-3.5 w-3.5 text-[#8abe4b]" />
            AI điều phối
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-[#191a23]">
            Tóm tắt điều hành cho nhịp làm việc hôm nay
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[#62705d]">
            Một lớp nhìn nhanh để thấy tín hiệu trễ, điểm nóng tải việc và việc nào nên xử lý trước.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-full border border-[#d4dbc8] bg-white p-1">
            {(
              [
                { key: 'daily', label: 'Hôm nay' },
                { key: 'weekly', label: 'Tuần này' },
              ] as const
            ).map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  tab === item.key
                    ? 'bg-[#191a23] text-white'
                    : 'text-[#62705d] hover:text-[#191a23]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label={tab === 'daily' ? 'Làm mới insight hôm nay' : 'Làm mới insight tuần này'}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-[#e2e7da] bg-white p-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : error || !activeData ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Không tải được insight điều hành lúc này. Hãy thử làm mới lại.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <Badge className={toneStyles[tone]}>
                  {tone === 'critical'
                    ? 'Cần xử lý ngay'
                    : tone === 'watch'
                      ? 'Cần theo sát'
                      : 'Đang ổn'}
                </Badge>
                <h3 className="mt-3 text-2xl font-bold text-[#191a23]">
                  {activeData.result.headline}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f6b59]">
                  {activeData.result.summary}
                </p>
              </div>

              <div
                className={`text-xs tracking-[0.2em] text-[#8abe4b] uppercase ${jetbrains.className}`}
              >
                {activeData.model}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <div className="rounded-[22px] border border-[#ecefe6] bg-[#fbfbf8] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#191a23]">
                    <AlertTriangle className="h-4 w-4 text-[#d97706]" />
                    Điểm cần xử lý
                  </div>
                  <div className="space-y-3">
                    {tab === 'daily'
                      ? dailyQuery.data?.result.top_risks.map(item => (
                          <div
                            key={item.title}
                            className="rounded-2xl border border-[#ecefe6] bg-white p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-[#191a23]">{item.title}</p>
                              <Badge
                                className={
                                  toneStyles[item.severity === 'high' ? 'critical' : 'watch']
                                }
                              >
                                {item.severity === 'high' ? 'Cao' : 'Theo dõi'}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm text-[#61705f]">{item.detail}</p>
                          </div>
                        ))
                      : weeklyQuery.data?.result.watchouts.map(item => (
                          <div
                            key={item}
                            className="rounded-2xl border border-[#ecefe6] bg-white p-3 text-sm text-[#191a23]"
                          >
                            {item}
                          </div>
                        ))}
                  </div>
                </div>

                <div className="rounded-[22px] border border-[#ecefe6] bg-[#fbfbf8] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#191a23]">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Việc nên làm tiếp
                  </div>
                  <div className="space-y-2 text-sm text-[#52604f]">
                    {(tab === 'daily'
                      ? dailyQuery.data?.result.recommended_actions
                      : weeklyQuery.data?.result.next_focus
                    )?.map(item => (
                      <div
                        key={item}
                        className="rounded-2xl border border-[#ecefe6] bg-white px-3 py-2"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[22px] border border-[#ecefe6] bg-[#191a23] p-4 text-white">
                  <p className="text-xs tracking-[0.2em] text-white/55 uppercase">Brief</p>
                  <div className="mt-3 space-y-2">
                    {(tab === 'daily'
                      ? dailyQuery.data?.result.executive_brief
                      : weeklyQuery.data?.result.wins
                    )?.map(item => (
                      <div
                        key={item}
                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/82"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {tab === 'daily' && dailyQuery.data?.result.workload_alerts?.length ? (
                  <div className="rounded-[22px] border border-[#ecefe6] bg-white p-4">
                    <p className="text-sm font-semibold text-[#191a23]">Cảnh báo tải việc</p>
                    <div className="mt-3 space-y-3">
                      {dailyQuery.data.result.workload_alerts.map(item => (
                        <div
                          key={item.member_name}
                          className="rounded-2xl border border-[#ecefe6] px-3 py-3"
                        >
                          <p className="font-semibold text-[#191a23]">{item.member_name}</p>
                          <p className="mt-1 text-sm text-[#61705f]">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[22px] border border-[#ecefe6] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#191a23]">
                        Insight này có hữu ích không?
                      </p>
                      <p className="mt-1 text-xs text-[#61705f]">
                        Giúp hệ thống ưu tiên đúng loại tín hiệu cần nổi lên.
                      </p>
                    </div>
                    {feedbackMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#61705f]" />
                    ) : null}
                  </div>
                  {currentFeedback ? (
                    <div className="mt-3 rounded-2xl border border-[#e6eadf] bg-[#f7f8f2] px-3 py-3 text-sm text-[#52604f]">
                      {currentFeedback === 'helpful'
                        ? 'Mình đã ghi nhận đây là dạng insight nên tiếp tục ưu tiên.'
                        : 'Mình đã ghi nhận để giảm bớt kiểu insight này và điều chỉnh cho sát hơn.'}
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={feedbackMutation.isPending}
                        onClick={() => void handleFeedback('helpful')}
                      >
                        <ThumbsUp className="mr-2 h-4 w-4" />
                        Hữu ích
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={feedbackMutation.isPending}
                        onClick={() => void handleFeedback('not_helpful')}
                      >
                        <ThumbsDown className="mr-2 h-4 w-4" />
                        Chưa đúng ý
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
