'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Keyboard, Loader2, MessageSquareWarning, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { ReviewStatusBadge } from '@/components/governance/review-status-badge';
import { ShortcutDialog } from '@/components/governance/shortcut-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useHotkeys } from '@/lib/hooks/use-hotkeys';
import { useApproveTask, useRejectTask, useReviewQueue } from '@/lib/hooks/use-governance';
import { isLeadershipRole } from '@/lib/auth/permissions';
import { getEffectiveTaskProgress, getTaskProgressLabel } from '@/lib/utils/task-progress';

export default function ReviewsPage() {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const { data: reviewTasks, isLoading } = useReviewQueue();
  const approveTask = useApproveTask();
  const rejectTask = useRejectTask();
  const { data: currentUser } = useCurrentUser();

  useHotkeys([
    {
      key: '?',
      action: (event) => {
        event.preventDefault();
        setShortcutOpen(true);
      },
    },
  ]);

  const isManagerView = isLeadershipRole(currentUser?.vai_tro);
  const sortedReviewTasks = useMemo(() => {
    const priorityRank = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    } as const;

    return [...(reviewTasks || [])].sort((left, right) => {
      const leftOverdue = new Date(left.deadline).getTime() < Date.now() ? 1 : 0;
      const rightOverdue = new Date(right.deadline).getTime() < Date.now() ? 1 : 0;
      if (leftOverdue !== rightOverdue) {
        return rightOverdue - leftOverdue;
      }

      const leftPriority = priorityRank[left.priority];
      const rightPriority = priorityRank[right.priority];
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      const leftSubmittedAt = left.submitted_for_review_at ? new Date(left.submitted_for_review_at).getTime() : 0;
      const rightSubmittedAt = right.submitted_for_review_at ? new Date(right.submitted_for_review_at).getTime() : 0;
      return leftSubmittedAt - rightSubmittedAt;
    });
  }, [reviewTasks]);

  const queueStats = useMemo(() => {
    const items = sortedReviewTasks;
    return {
      total: items.length,
      highPriority: items.filter((item) => item.priority === 'high' || item.priority === 'urgent').length,
      overdue: items.filter((item) => new Date(item.deadline).getTime() < Date.now()).length,
    };
  }, [sortedReviewTasks]);

  const handleApprove = async (taskId: string) => {
    try {
      await approveTask.mutateAsync({ taskId, comment: notes[taskId] || undefined });
      toast.success('Task Ä‘Ã£ Ä‘Æ°á»£c duyá»‡t');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'KhÃ´ng thá»ƒ duyá»‡t task');
    }
  };

  const handleReject = async (taskId: string) => {
    try {
      await rejectTask.mutateAsync({ taskId, comment: notes[taskId] || '' });
      toast.success('ÄÃ£ tráº£ task vá» Ä‘á»ƒ chá»‰nh sá»­a');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'KhÃ´ng thá»ƒ tráº£ task');
    }
  };

  if (!isManagerView) {
    return (
      <div className="container mx-auto max-w-5xl px-6 py-8">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-4 p-6">
            <ShieldAlert className="mt-1 h-6 w-6 text-amber-600" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Trang nÃ y dÃ nh cho quáº£n lÃ½</h1>
              <p className="mt-2 text-sm text-slate-600">HÃ ng chá» duyá»‡t chá»‰ hiá»ƒn thá»‹ cho tÃ i khoáº£n quáº£n trá»‹ hoáº·c quáº£n lÃ½ Ä‘á»ƒ trÃ¡nh nháº§m luá»“ng thao tÃ¡c.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dfe6d3] bg-[#f5f8ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#61705f]">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Approval flow
          </div>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">HÃ ng chá» duyá»‡t task</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Duyá»‡t nhanh cÃ¡c task Ä‘Ã£ hoÃ n thÃ nh, gá»­i láº¡i nháº­n xÃ©t rÃµ rÃ ng vÃ  giá»¯ lá»‹ch sá»­ ra quyáº¿t Ä‘á»‹nh táº­p trung á»Ÿ má»™t chá»—.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShortcutOpen(true)}>
            <Keyboard className="mr-2 h-4 w-4" />
            PhÃ­m táº¯t
          </Button>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="min-w-[140px] border-[#e7ebdf]"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Äang chá»</p><p className="mt-2 text-2xl font-semibold text-slate-900">{queueStats.total}</p></CardContent></Card>
            <Card className="min-w-[140px] border-[#ffe2d4] bg-[#fff7f2]"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Æ¯u tiÃªn cao</p><p className="mt-2 text-2xl font-semibold text-[#f97316]">{queueStats.highPriority}</p></CardContent></Card>
            <Card className="min-w-[140px] border-[#ffe1e4] bg-[#fff5f6]"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">QuÃ¡ háº¡n</p><p className="mt-2 text-2xl font-semibold text-[#e11d48]">{queueStats.overdue}</p></CardContent></Card>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-[260px] rounded-[28px]" />)}</div>
      ) : sortedReviewTasks.length === 0 ? (
        <Card className="border-dashed border-[#dbe4ce] bg-[#f8fbf3]">
          <CardContent className="py-14 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h2 className="mt-4 text-xl font-semibold text-slate-900">KhÃ´ng cÃ²n task nÃ o chá» duyá»‡t</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">HÃ ng chá» Ä‘ang trá»‘ng. Khi Ä‘á»™i gá»­i task sang bÆ°á»›c phÃª duyá»‡t, báº¡n sáº½ tháº¥y chÃºng xuáº¥t hiá»‡n á»Ÿ Ä‘Ã¢y kÃ¨m deadline vÃ  ghi chÃº liÃªn quan.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sortedReviewTasks.map((task) => {
            const effectiveProgress = getEffectiveTaskProgress({
              progress: task.progress,
              progressMode: task.progress_mode,
              status: task.trang_thai,
              reviewStatus: task.review_status,
            });
            const progressLabel = getTaskProgressLabel({
              progressMode: task.progress_mode,
              status: task.trang_thai,
              reviewStatus: task.review_status,
            });

            return (
            <Card key={task.id} className="overflow-hidden rounded-[28px] border-[#e7ebdf]">
              <CardHeader className="border-b border-[#eef1e7] bg-[#fbfbf8]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-xl text-slate-900">{task.ten}</CardTitle>
                      <ReviewStatusBadge status={task.review_status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{task.phan_du_an?.du_an?.ten || 'Dá»± Ã¡n'} â€¢ {task.phan_du_an?.ten || 'Pháº§n dá»± Ã¡n'}</p>
                  </div>
                  <Badge variant="outline" className="bg-white">{new Date(task.deadline).toLocaleDateString('vi-VN')}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">NgÆ°á»i phá»¥ trÃ¡ch</p><p className="mt-2 text-sm font-medium text-slate-900">{task.nguoi_dung?.ten || 'ChÆ°a phÃ¢n cÃ´ng'}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tiáº¿n Ä‘á»™</p><p className="mt-2 text-sm font-medium text-slate-900">{task.progress_mode === 'checklist' ? `${effectiveProgress}%` : progressLabel}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Má»©c Æ°u tiÃªn</p><p className="mt-2 text-sm font-medium text-slate-900">{task.priority}</p></div>
                </div>

                {task.mo_ta ? <p className="line-clamp-3 text-sm text-slate-600">{task.mo_ta}</p> : <p className="text-sm text-slate-400">Task nÃ y chÆ°a cÃ³ mÃ´ táº£ chi tiáº¿t.</p>}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#e7ebdf] bg-[#fbfbf8] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Gá»­i duyá»‡t lÃºc</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {task.submitted_for_review_at ? new Date(task.submitted_for_review_at).toLocaleString('vi-VN') : 'ChÆ°a rÃµ thá»i Ä‘iá»ƒm'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#e7ebdf] bg-[#fbfbf8] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ghi chÃº bÃ n giao</p>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-700">
                      {task.review_request_comment?.trim() || 'KhÃ´ng cÃ³ ghi chÃº kÃ¨m theo.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nháº­n xÃ©t cho vÃ²ng duyá»‡t</label>
                  <Textarea
                    value={notes[task.id] || ''}
                    onChange={(event) => setNotes((current) => ({ ...current, [task.id]: event.target.value }))}
                    placeholder="Ghi rÃµ Ä‘iá»ƒm cáº§n sá»­a hoáº·c bá»‘i cáº£nh phÃª duyá»‡t Ä‘á»ƒ Ä‘á»™i xá»­ lÃ½ nhanh hÆ¡n..."
                    className="min-h-[110px]"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button className="bg-[#191a23] text-white hover:bg-[#2a2b35]" onClick={() => handleApprove(task.id)} disabled={approveTask.isPending || rejectTask.isPending}>
                    {approveTask.isPending && approveTask.variables?.taskId === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Duyá»‡t task
                  </Button>
                  <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => handleReject(task.id)} disabled={approveTask.isPending || rejectTask.isPending}>
                    {rejectTask.isPending && rejectTask.variables?.taskId === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareWarning className="mr-2 h-4 w-4" />}
                    YÃªu cáº§u chá»‰nh sá»­a
                  </Button>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}

      <ShortcutDialog
        open={shortcutOpen}
        onOpenChange={setShortcutOpen}
        title="PhÃ­m táº¯t Review Queue"
        items={[
          { keyLabel: '?', description: 'Má»Ÿ báº£ng phÃ­m táº¯t cá»§a hÃ ng chá» duyá»‡t' },
        ]}
      />
    </div>
  );
}



