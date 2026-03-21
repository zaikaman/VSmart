'use client';

import { Badge } from '@/components/ui/badge';

const REVIEW_STATUS_MAP = {
  draft: {
    label: 'Bản nháp',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  pending_review: {
    label: 'Chờ duyệt',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  approved: {
    label: 'Đã duyệt',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  changes_requested: {
    label: 'Cần chỉnh sửa',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
} as const;

export function ReviewStatusBadge({
  status,
}: {
  status?: keyof typeof REVIEW_STATUS_MAP | null;
}) {
  const config = REVIEW_STATUS_MAP[status || 'draft'];

  return <Badge className={config.className}>{config.label}</Badge>;
}
