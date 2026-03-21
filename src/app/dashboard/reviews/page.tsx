'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ClipboardCheck, Keyboard, Loader2, MessageSquareWarning, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { ReviewStatusBadge } from '@/components/governance/review-status-badge';
import { ShortcutDialog } from '@/components/governance/shortcut-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useHotkeys } from '@/lib/hooks/use-hotkeys';
import { useApproveTask, useRejectTask, useReviewQueue } from '@/lib/hooks/use-governance';

export default function ReviewsPage() {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const { data: reviewTasks, isLoading } = useReviewQueue();
  const approveTask = useApproveTask();
  const rejectTask = useRejectTask();
  const { data: currentUser } = useQuery({
    queryKey: ['reviews-current-user'],
    queryFn: async () => {
      const response = await fetch('/api/users/me');
      if (!response.ok) throw new Error('Không thể tải người dùng');
      return response.json() as Promise<{ vai_tro?: string }>;
    },
  });

  useHotkeys([
    {
      key: '?',
      action: (event) => {
        event.preventDefault();
        setShortcutOpen(true);
      },
    },
  ]);

  const isManagerView = currentUser?.vai_tro === 'admin' || currentUser?.vai_tro === 'manager';
  const queueStats = useMemo(() => {
    const items = reviewTasks || [];
    return {
      total: items.length,
      highPriority: items.filter((item) => item.priority === 'high' || item.priority === 'urgent').length,
      overdue: items.filter((item) => new Date(item.deadline).getTime() < Date.now()).length,
    };
  }, [reviewTasks]);

  const handleApprove = async (taskId: string) => {
    try {
      await approveTask.mutateAsync({ taskId, review_comment: notes[taskId] || undefined });
      toast.success('Task đã được duyệt');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể duyệt task');
    }
  };

  const handleReject = async (taskId: string) => {
    try {
      await rejectTask.mutateAsync({ taskId, review_comment: notes[taskId] || '' });
      toast.success('Đã trả task về để chỉnh sửa');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể trả task');
    }
  };

  if (!isManagerView) {
    return (
      <div className="container mx-auto max-w-5xl px-6 py-8">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-4 p-6">
            <ShieldAlert className="mt-1 h-6 w-6 text-amber-600" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Trang này dành cho quản lý</h1>
              <p className="mt-2 text-sm text-slate-600">Hàng chờ duyệt chỉ hiển thị cho tài khoản quản trị hoặc quản lý để tránh nhầm luồng thao tác.</p>
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
          <h1 className="mt-4 text-3xl font-bold text-slate-900">Hàng chờ duyệt task</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Duyệt nhanh các task đã hoàn thành, gửi lại nhận xét rõ ràng và giữ lịch sử ra quyết định tập trung ở một chỗ.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShortcutOpen(true)}>
            <Keyboard className="mr-2 h-4 w-4" />
            Phím tắt
          </Button>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="min-w-[140px] border-[#e7ebdf]"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Đang chờ</p><p className="mt-2 text-2xl font-semibold text-slate-900">{queueStats.total}</p></CardContent></Card>
            <Card className="min-w-[140px] border-[#ffe2d4] bg-[#fff7f2]"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ưu tiên cao</p><p className="mt-2 text-2xl font-semibold text-[#f97316]">{queueStats.highPriority}</p></CardContent></Card>
            <Card className="min-w-[140px] border-[#ffe1e4] bg-[#fff5f6]"><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Quá hạn</p><p className="mt-2 text-2xl font-semibold text-[#e11d48]">{queueStats.overdue}</p></CardContent></Card>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-[260px] rounded-[28px]" />)}</div>
      ) : !reviewTasks || reviewTasks.length === 0 ? (
        <Card className="border-dashed border-[#dbe4ce] bg-[#f8fbf3]">
          <CardContent className="py-14 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h2 className="mt-4 text-xl font-semibold text-slate-900">Không còn task nào chờ duyệt</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">Hàng chờ đang trống. Khi đội gửi task sang bước phê duyệt, bạn sẽ thấy chúng xuất hiện ở đây kèm deadline và ghi chú liên quan.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {reviewTasks.map((task) => (
            <Card key={task.id} className="overflow-hidden rounded-[28px] border-[#e7ebdf]">
              <CardHeader className="border-b border-[#eef1e7] bg-[#fbfbf8]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-xl text-slate-900">{task.ten}</CardTitle>
                      <ReviewStatusBadge status={task.review_status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{task.phan_du_an?.du_an?.ten || 'Dự án'} • {task.phan_du_an?.ten || 'Phần dự án'}</p>
                  </div>
                  <Badge variant="outline" className="bg-white">{new Date(task.deadline).toLocaleDateString('vi-VN')}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Người phụ trách</p><p className="mt-2 text-sm font-medium text-slate-900">{task.nguoi_dung?.ten || 'Chưa phân công'}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tiến độ</p><p className="mt-2 text-sm font-medium text-slate-900">{task.progress}%</p></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Mức ưu tiên</p><p className="mt-2 text-sm font-medium text-slate-900">{task.priority}</p></div>
                </div>

                {task.mo_ta ? <p className="line-clamp-3 text-sm text-slate-600">{task.mo_ta}</p> : <p className="text-sm text-slate-400">Task này chưa có mô tả chi tiết.</p>}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nhận xét cho vòng duyệt</label>
                  <Textarea
                    value={notes[task.id] || ''}
                    onChange={(event) => setNotes((current) => ({ ...current, [task.id]: event.target.value }))}
                    placeholder="Ghi rõ điểm cần sửa hoặc bối cảnh phê duyệt để đội xử lý nhanh hơn..."
                    className="min-h-[110px]"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button className="bg-[#191a23] text-white hover:bg-[#2a2b35]" onClick={() => handleApprove(task.id)} disabled={approveTask.isPending || rejectTask.isPending}>
                    {approveTask.isPending && approveTask.variables?.taskId === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Duyệt task
                  </Button>
                  <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => handleReject(task.id)} disabled={approveTask.isPending || rejectTask.isPending}>
                    {rejectTask.isPending && rejectTask.variables?.taskId === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareWarning className="mr-2 h-4 w-4" />}
                    Yêu cầu chỉnh sửa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ShortcutDialog
        open={shortcutOpen}
        onOpenChange={setShortcutOpen}
        title="Phím tắt Review Queue"
        items={[
          { keyLabel: '?', description: 'Mở bảng phím tắt của hàng chờ duyệt' },
        ]}
      />
    </div>
  );
}
