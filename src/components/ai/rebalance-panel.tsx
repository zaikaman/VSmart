'use client';

import { useEffect, useState } from 'react';
import { ArrowRightLeft, Loader2, Sparkles, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useInsightFeedback,
  useRebalanceSuggestions,
} from '@/lib/hooks/use-ai-insights';

interface RebalancePanelProps {
  projectId?: string;
  title?: string;
  compact?: boolean;
}

export function RebalancePanel({
  projectId,
  title = 'Gợi ý tái cân bằng công việc',
  compact = false,
}: RebalancePanelProps) {
  const rebalanceMutation = useRebalanceSuggestions();
  const feedbackMutation = useInsightFeedback();
  const [hasAccepted, setHasAccepted] = useState(false);

  const result = rebalanceMutation.data;

  useEffect(() => {
    setHasAccepted(false);
  }, [result?.reference_id]);

  return (
    <div
      className={`rounded-[24px] border border-[#d8e0ce] bg-white ${compact ? 'p-4' : 'p-5'} shadow-[0_22px_55px_-42px_rgba(92,109,84,0.32)]`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e0ce] bg-[#f7f8f2] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#61705f]">
            <Sparkles className="h-3.5 w-3.5 text-[#8abe4b]" />
            AI hỗ trợ
          </div>
          <h3 className="mt-3 text-xl font-bold text-[#191a23]">{title}</h3>
          <p className="mt-1 text-sm text-[#61705f]">
            Xem nhanh nên dời việc nào khi khối lượng bắt đầu lệch nhau hoặc
            deadline bị dồn.
          </p>
        </div>

        <Button
          type="button"
          className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
          onClick={() => rebalanceMutation.mutate({ projectId })}
          disabled={rebalanceMutation.isPending}
        >
          {rebalanceMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang phân tích
            </>
          ) : (
            <>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Chạy rebalance
            </>
          )}
        </Button>
      </div>

      {result ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-[#ecefe6] bg-[#f7f8f2] p-4 text-sm text-[#51604f]">
            {result.result.overview}
          </div>

          {result.result.suggestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d8e0ce] px-4 py-5 text-sm text-[#61705f]">
              Hiện chưa thấy phương án điều phối nào đủ phù hợp để gợi ý.
            </div>
          ) : (
            <div className="space-y-3">
              {result.result.suggestions.map((item) => (
                <div
                  key={`${item.task_id}-${item.to_user_id}`}
                  className="rounded-2xl border border-[#ecefe6] bg-[#fbfbf8] p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-[#191a23]">{item.task_name}</p>
                      <p className="mt-1 text-sm text-[#61705f]">{item.reason}</p>
                      <p className="mt-2 text-sm text-[#191a23]">
                        <span className="text-[#61705f]">Đề xuất chuyển:</span>{' '}
                        {item.from_user_name} → {item.to_user_name}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8abe4b]">
                        {item.impact}
                      </p>
                    </div>
                    <Badge className="w-fit border-[#d8e0ce] bg-white text-[#191a23]">
                      {item.confidence}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.reference_id ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={hasAccepted || feedbackMutation.isPending}
                onClick={() => {
                  feedbackMutation.mutate({
                    insight_type: 'rebalance',
                    event_type: 'accepted',
                    reference_id: result.reference_id,
                  });
                  setHasAccepted(true);
                }}
              >
                <ThumbsUp className="mr-2 h-4 w-4" />
                Gợi ý này hữu ích
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
