'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle2, ExternalLink, Loader2, MessageSquare, Paperclip, Send, Sparkles, User } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { EditTaskModal } from './edit-task-modal';
import { ActivityFeed } from '@/components/governance/activity-feed';
import { ReviewStatusBadge } from '@/components/governance/review-status-badge';
import {
  useAddChecklistItems,
  useDeleteChecklistItem,
  useDeleteTaskAttachment,
  useTaskAttachments,
  useTaskChecklist,
  useUpdateChecklistItem,
  useUploadTaskAttachment,
} from '@/lib/hooks/use-task-execution';
import { useApproveTask, useRejectTask, useSubmitTaskForReview } from '@/lib/hooks/use-governance';
import { useTask, type Task as HookTask } from '@/lib/hooks/use-tasks';

interface BaseTask {
  id: string;
  ten: string;
  moTa?: string | null;
  mo_ta?: string | null;
  deadline?: string | null;
  trangThai?: string;
  trang_thai?: string;
  priority: string;
  progress: number;
  riskScore?: number | null;
  risk_score?: number | null;
}

interface Comment {
  id: string;
  noi_dung: string;
  ngay_tao: string;
  nguoi_dung: { id: string; ten: string; email: string; avatar_url: string | null };
}

interface Props {
  task: BaseTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const priorityLabels = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', urgent: 'Khẩn cấp' } as const;
const priorityColors = { low: 'bg-green-100 text-green-800', medium: 'bg-yellow-100 text-yellow-800', high: 'bg-red-100 text-red-800', urgent: 'bg-red-200 text-red-900' } as const;
const statusLabels = { todo: 'Cần làm', 'in-progress': 'Đang làm', done: 'Hoàn thành' } as const;

function initials(name: string) {
  return name.split(' ').map((item) => item[0]).join('').slice(0, 2).toUpperCase();
}

function relativeDate(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

function fileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeTask(task: BaseTask | null, details?: HookTask | null): HookTask | null {
  if (details) return details;
  if (!task) return null;
  return {
    id: task.id,
    ten: task.ten,
    mo_ta: task.moTa ?? task.mo_ta ?? null,
    deadline: task.deadline || new Date().toISOString(),
    phan_du_an_id: '',
    assignee_id: null,
    trang_thai: (task.trangThai || task.trang_thai || 'todo') as 'todo' | 'in-progress' | 'done',
    priority: task.priority as HookTask['priority'],
    progress: task.progress,
    risk_score: task.riskScore ?? task.risk_score ?? 0,
    risk_level: 'low',
    risk_updated_at: null,
    is_stale: false,
    ngay_tao: new Date().toISOString(),
    cap_nhat_cuoi: new Date().toISOString(),
    deleted_at: null,
  } satisfies HookTask;
}

export function TaskDetailModal({ task, open, onOpenChange }: Props) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const taskId = task?.id || '';
  const { data: taskDetails } = useTask(taskId);
  const resolvedTask = normalizeTask(task, open ? taskDetails : null);

  const { data: checklistData, isLoading: checklistLoading } = useTaskChecklist(taskId, open && !!taskId);
  const { data: attachmentsData, isLoading: attachmentsLoading } = useTaskAttachments(taskId, open && !!taskId);
  const addChecklistMutation = useAddChecklistItems(taskId);
  const updateChecklistMutation = useUpdateChecklistItem(taskId);
  const deleteChecklistMutation = useDeleteChecklistItem(taskId);
  const uploadAttachmentMutation = useUploadTaskAttachment(taskId);
  const deleteAttachmentMutation = useDeleteTaskAttachment(taskId);
  const submitReviewMutation = useSubmitTaskForReview();
  const approveTaskMutation = useApproveTask();
  const rejectTaskMutation = useRejectTask();

  const { data: commentsData, isLoading: commentsLoading } = useQuery<{ data: Comment[] }>({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/comments`);
      if (!response.ok) throw new Error('Không thể lấy bình luận');
      return response.json();
    },
    enabled: !!taskId && open,
  });

  const comments = commentsData?.data || [];
  const checklistItems = useMemo(() => checklistData?.data || [], [checklistData?.data]);
  const attachments = useMemo(() => attachmentsData?.data || [], [attachmentsData?.data]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const addCommentMutation = useMutation({
    mutationFn: async (noi_dung: string) => {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noi_dung }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể thêm bình luận');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      setNewComment('');
      toast.success('Đã thêm bình luận');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const riskExplanationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai/predict-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Không thể phân tích rủi ro');
      }
      return response.json() as Promise<{ data: { result: { ly_do: string; goi_y: string[] } | null } }>;
    },
  });

  if (!task || !resolvedTask) return null;

  const canEdit = resolvedTask.permissions?.canUpdate ?? true;
  const canSubmitReview = resolvedTask.permissions?.canSubmitReview ?? false;
  const canApprove = resolvedTask.permissions?.canApprove ?? false;
  const canReject = resolvedTask.permissions?.canReject ?? false;

  const submitComment = (event: React.FormEvent) => {
    event.preventDefault();
    if (newComment.trim()) addCommentMutation.mutate(newComment.trim());
  };

  const submitReview = async (mode: 'submit' | 'approve' | 'reject') => {
    try {
      if (mode === 'submit') {
        await submitReviewMutation.mutateAsync({ taskId, review_comment: reviewComment || undefined });
        toast.success('Task đã được gửi duyệt');
      }
      if (mode === 'approve') {
        await approveTaskMutation.mutateAsync({ taskId, review_comment: reviewComment || undefined });
        toast.success('Task đã được duyệt');
      }
      if (mode === 'reject') {
        await rejectTaskMutation.mutateAsync({ taskId, review_comment: reviewComment });
        toast.success('Đã trả task về để chỉnh sửa');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xử lý duyệt task');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-[860px]">
          <DialogHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <DialogTitle className="text-2xl text-slate-900">{resolvedTask.ten}</DialogTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge className={priorityColors[resolvedTask.priority]}>{priorityLabels[resolvedTask.priority]}</Badge>
                  <Badge variant="outline">{statusLabels[resolvedTask.trang_thai]}</Badge>
                  <ReviewStatusBadge status={resolvedTask.review_status} />
                </div>
              </div>
              <div className="rounded-2xl border border-[#e7ebdf] bg-[#fbfbf8] px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tiến độ</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{resolvedTask.progress}%</p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 space-y-6 overflow-y-auto pr-2">
            {resolvedTask.mo_ta ? (
              <div className="rounded-2xl border border-[#e7ebdf] bg-white p-4">
                <h4 className="font-semibold text-slate-900">Mô tả</h4>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{resolvedTask.mo_ta}</p>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#e7ebdf] bg-white p-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Người thực hiện</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">{resolvedTask.nguoi_dung?.ten || 'Chưa phân công'}</p>
                {resolvedTask.nguoi_dung?.email ? (
                  <p className="mt-1 text-xs text-slate-500">{resolvedTask.nguoi_dung.email}</p>
                ) : null}
              </div>

              {resolvedTask.deadline ? (
                <div className="rounded-2xl border border-[#e7ebdf] bg-white p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Deadline</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {new Date(resolvedTask.deadline).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[#e7ebdf] bg-white p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-900">Phân tích rủi ro</h4>
                <Button type="button" variant="outline" onClick={() => riskExplanationMutation.mutate()} disabled={riskExplanationMutation.isPending}>
                  {riskExplanationMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Phân tích
                </Button>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div
                  className={`h-2 rounded-full ${resolvedTask.risk_score > 70 ? 'bg-red-600' : resolvedTask.risk_score > 40 ? 'bg-yellow-500' : 'bg-green-600'}`}
                  style={{ width: `${resolvedTask.risk_score}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-500">Mức rủi ro hiện tại: {resolvedTask.risk_score}%</p>
              {riskExplanationMutation.data?.data.result ? (
                <div className="mt-3 rounded-2xl border border-[#eef1e7] bg-[#fbfbf8] p-3 text-sm text-slate-600">
                  <p>{riskExplanationMutation.data.data.result.ly_do}</p>
                  {riskExplanationMutation.data.data.result.goi_y.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {riskExplanationMutation.data.data.result.goi_y.map((item) => (
                        <div key={item} className="rounded-xl border border-[#e7ebdf] bg-white px-3 py-2">
                          {item}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[#e7ebdf] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-slate-900">Luồng duyệt task</h4>
                  <p className="mt-1 text-sm text-slate-500">Nhận xét sẽ được lưu cùng activity log để quản lý dễ theo dõi.</p>
                </div>
                {resolvedTask.review_comment ? (
                  <div className="max-w-[280px] rounded-2xl border border-[#eef1e7] bg-[#fbfbf8] px-3 py-2 text-sm text-slate-600">
                    {resolvedTask.review_comment}
                  </div>
                ) : null}
              </div>
              <Textarea
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                className="mt-4 min-h-[100px]"
                placeholder="Ghi rõ nhận xét duyệt hoặc những điểm cần chỉnh sửa..."
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {canSubmitReview ? <Button variant="outline" onClick={() => submitReview('submit')} disabled={submitReviewMutation.isPending}>Gửi duyệt</Button> : null}
                {canApprove ? <Button className="bg-[#191a23] text-white hover:bg-[#2a2b35]" onClick={() => submitReview('approve')} disabled={approveTaskMutation.isPending}>Duyệt task</Button> : null}
                {canReject ? <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => submitReview('reject')} disabled={rejectTaskMutation.isPending}>Yêu cầu chỉnh sửa</Button> : null}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e7ebdf] bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <h4 className="font-semibold text-slate-900">Checklist</h4>
                </div>
                <Badge variant="secondary">
                  {checklistItems.filter((item) => item.is_done).length}/{checklistItems.length}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Input value={newChecklistTitle} onChange={(event) => setNewChecklistTitle(event.target.value)} placeholder="Thêm checklist item..." />
                <Button
                  type="button"
                  onClick={async () => {
                    if (!newChecklistTitle.trim()) return;
                    try {
                      await addChecklistMutation.mutateAsync({ title: newChecklistTitle.trim() });
                      setNewChecklistTitle('');
                      toast.success('Đã thêm checklist item');
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Không thể thêm checklist item');
                    }
                  }}
                  disabled={addChecklistMutation.isPending}
                >
                  Thêm
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                {checklistLoading ? (
                  [1, 2].map((item) => <Skeleton key={item} className="h-12 w-full" />)
                ) : checklistItems.length === 0 ? (
                  <p className="text-sm text-slate-500">Chưa có checklist item nào.</p>
                ) : (
                  checklistItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-[#e7ebdf] bg-[#fbfbf8] p-3">
                      <input
                        type="checkbox"
                        checked={item.is_done}
                        onChange={(event) => updateChecklistMutation.mutate({ checklistId: item.id, is_done: event.target.checked })}
                        className="h-4 w-4"
                      />
                      <span className={`flex-1 text-sm ${item.is_done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.title}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => deleteChecklistMutation.mutate(item.id)} disabled={deleteChecklistMutation.isPending}>
                        Xóa
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e7ebdf] bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-slate-600" />
                  <h4 className="font-semibold text-slate-900">File đính kèm</h4>
                </div>
                <span className="text-sm text-slate-500">{attachments.length} file</span>
              </div>

              <div className="flex items-center gap-3">
                <Input type="file" onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    await uploadAttachmentMutation.mutateAsync(file);
                    toast.success('Đã tải file lên');
                    event.target.value = '';
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Không thể tải file lên');
                  }
                }} disabled={uploadAttachmentMutation.isPending} />
                {uploadAttachmentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              </div>

              <div className="mt-4 space-y-2">
                {attachmentsLoading ? (
                  [1, 2].map((item) => <Skeleton key={item} className="h-12 w-full" />)
                ) : attachments.length === 0 ? (
                  <p className="text-sm text-slate-500">Chưa có file đính kèm nào.</p>
                ) : (
                  attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-3 rounded-2xl border border-[#e7ebdf] p-3">
                      <Paperclip className="h-4 w-4 text-slate-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{attachment.file_name}</p>
                        <p className="text-xs text-slate-500">{fileSize(attachment.size)} • {relativeDate(attachment.ngay_tao)}</p>
                      </div>
                      <a href={attachment.file_url} target="_blank" rel="noreferrer">
                        <Button type="button" size="icon" variant="ghost">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button type="button" size="sm" variant="ghost" onClick={() => deleteAttachmentMutation.mutate(attachment.id)} disabled={deleteAttachmentMutation.isPending}>
                        Xóa
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e7ebdf] bg-white p-4">
              <div className="mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-600" />
                <h4 className="font-semibold text-slate-900">Bình luận</h4>
                {comments.length > 0 ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{comments.length}</span> : null}
              </div>

              <div className="mb-4 max-h-[220px] space-y-4 overflow-y-auto">
                {commentsLoading ? (
                  [1, 2].map((item) => <Skeleton key={item} className="h-16 w-full" />)
                ) : comments.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">Chưa có bình luận nào. Hãy bắt đầu cuộc trao đổi.</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.nguoi_dung.avatar_url || undefined} />
                        <AvatarFallback className="bg-[#b9ff66] text-xs text-black">{initials(comment.nguoi_dung.ten)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-slate-900">{comment.nguoi_dung.ten}</span>
                          <span className="text-xs text-slate-500">{relativeDate(comment.ngay_tao)}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{comment.noi_dung}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>

              <form onSubmit={submitComment} className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      submitComment(event);
                    }
                  }}
                  placeholder="Viết bình luận... (Enter để gửi, Shift+Enter để xuống dòng)"
                  className="min-h-[60px] resize-none"
                  disabled={addCommentMutation.isPending}
                />
                <Button type="submit" size="icon" className="shrink-0 bg-[#b9ff66] text-black hover:bg-[#a8ee55]" disabled={!newComment.trim() || addCommentMutation.isPending}>
                  {addCommentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>

            <ActivityFeed taskId={taskId} compact />

            <div className="flex justify-between border-t pt-4 text-xs text-slate-500">
              <div>
                <span>Tạo: </span>
                <time>{new Date(resolvedTask.ngay_tao).toLocaleString('vi-VN')}</time>
              </div>
              <div>
                <span>Cập nhật: </span>
                <time>{new Date(resolvedTask.cap_nhat_cuoi).toLocaleString('vi-VN')}</time>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
            {canEdit ? <Button onClick={() => setEditModalOpen(true)}>Chỉnh sửa</Button> : null}
          </div>
        </DialogContent>
      </Dialog>

      <EditTaskModal
        key={`${resolvedTask.id}-${editModalOpen ? 'open' : 'closed'}`}
        task={{
          id: resolvedTask.id,
          ten: resolvedTask.ten,
          moTa: resolvedTask.mo_ta,
          deadline: resolvedTask.deadline,
          trangThai: resolvedTask.trang_thai,
          priority: resolvedTask.priority,
          progress: resolvedTask.progress,
        }}
        open={editModalOpen}
        onOpenChange={(isOpen) => {
          setEditModalOpen(isOpen);
          if (!isOpen) onOpenChange(false);
        }}
      />
    </>
  );
}
