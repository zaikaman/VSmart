'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  User,
  Calendar,
  TrendingUp,
  Send,
  MessageSquare,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from 'lucide-react';
import { EditTaskModal } from './edit-task-modal';
import { toast } from 'sonner';
import {
  useAddChecklistItems,
  useDeleteChecklistItem,
  useDeleteTaskAttachment,
  useTaskAttachments,
  useTaskChecklist,
  useUpdateChecklistItem,
  useUploadTaskAttachment,
} from '@/lib/hooks/use-task-execution';

interface Task {
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
  progress_mode?: 'manual' | 'checklist';
  nguoi_dung?: {
    hoTen?: string;
    ten?: string;
    email: string;
    avatar_url?: string | null;
  } | null;
  phan_du_an?: {
    ten: string;
    du_an: {
      ten: string;
    };
  } | null;
  taoLuc?: string;
  ngay_tao?: string;
  capNhatCuoi?: string;
  cap_nhat_cuoi?: string;
}

interface Comment {
  id: string;
  noi_dung: string;
  ngay_tao: string;
  nguoi_dung: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  };
}

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
  urgent: 'bg-red-200 text-red-900',
};

const priorityLabels = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp',
};

const statusLabels = {
  todo: 'Cần Làm',
  'in-progress': 'Đang Làm',
  done: 'Hoàn Thành',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskDetailModal({ task, open, onOpenChange }: TaskDetailModalProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const taskId = task?.id || '';
  const taskStatus = (task?.trangThai || task?.trang_thai || 'todo') as 'todo' | 'in-progress' | 'done';
  const taskDescription = task?.moTa ?? task?.mo_ta ?? '';
  const taskRiskScore = task?.riskScore ?? task?.risk_score ?? 0;
  const taskCreatedAt = task?.taoLuc ?? task?.ngay_tao;
  const taskUpdatedAt = task?.capNhatCuoi ?? task?.cap_nhat_cuoi;
  const assigneeName = task?.nguoi_dung?.hoTen ?? task?.nguoi_dung?.ten ?? 'Chưa phân công';

  const { data: checklistData, isLoading: checklistLoading } = useTaskChecklist(taskId, open && !!taskId);
  const { data: attachmentsData, isLoading: attachmentsLoading } = useTaskAttachments(taskId, open && !!taskId);
  const addChecklistMutation = useAddChecklistItems(taskId);
  const updateChecklistMutation = useUpdateChecklistItem(taskId);
  const deleteChecklistMutation = useDeleteChecklistItem(taskId);
  const uploadAttachmentMutation = useUploadTaskAttachment(taskId);
  const deleteAttachmentMutation = useDeleteTaskAttachment(taskId);

  const { data: commentsData, isLoading: isLoadingComments } = useQuery<{ data: Comment[] }>({
    queryKey: ['task-comments', task?.id],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${task?.id}/comments`);
      if (!response.ok) throw new Error('Không thể lấy bình luận');
      return response.json();
    },
    enabled: !!task?.id && open,
  });

  const comments = commentsData?.data || [];
  const checklistItems = useMemo(() => checklistData?.data || [], [checklistData?.data]);
  const attachments = useMemo(() => attachmentsData?.data || [], [attachmentsData?.data]);

  const checklistSummary = useMemo(() => {
    const total = checklistItems.length;
    const done = checklistItems.filter((item) => item.is_done).length;
    return { total, done };
  }, [checklistItems]);

  const addCommentMutation = useMutation({
    mutationFn: async (noi_dung: string) => {
      const response = await fetch(`/api/tasks/${task?.id}/comments`, {
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
      queryClient.invalidateQueries({ queryKey: ['task-comments', task?.id] });
      setNewComment('');
      toast.success('Đã thêm bình luận');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (comments.length > 0) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments.length]);

  if (!task) return null;

  const handleEditModalClose = (isOpen: boolean) => {
    setEditModalOpen(isOpen);
    if (!isOpen) {
      onOpenChange(false);
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment(e);
    }
  };

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) {
      return;
    }

    try {
      await addChecklistMutation.mutateAsync({ title: newChecklistTitle.trim() });
      setNewChecklistTitle('');
      toast.success('Đã thêm checklist item');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thêm checklist item');
    }
  };

  const handleToggleChecklist = async (id: string, value: boolean) => {
    try {
      await updateChecklistMutation.mutateAsync({
        checklistId: id,
        is_done: value,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật checklist item');
    }
  };

  const handleMoveChecklist = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= checklistItems.length) {
      return;
    }

    const current = checklistItems[index];
    const target = checklistItems[targetIndex];

    try {
      await updateChecklistMutation.mutateAsync({
        checklistId: current.id,
        sort_order: target.sort_order,
      });
      await updateChecklistMutation.mutateAsync({
        checklistId: target.id,
        sort_order: current.sort_order,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể đổi thứ tự checklist');
    }
  };

  const handleDeleteChecklist = async (id: string) => {
    try {
      await deleteChecklistMutation.mutateAsync(id);
      toast.success('Đã xóa checklist item');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa checklist item');
    }
  };

  const handleUploadAttachment = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      await uploadAttachmentMutation.mutateAsync(file);
      toast.success('Đã tải file lên');
      event.target.value = '';
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải file lên');
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await deleteAttachmentMutation.mutateAsync(attachmentId);
      toast.success('Đã xóa file đính kèm');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa file đính kèm');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-2">{task.ten}</DialogTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                    {priorityLabels[task.priority as keyof typeof priorityLabels]}
                  </Badge>
                  <Badge variant="outline">
                    {statusLabels[taskStatus as keyof typeof statusLabels]}
                  </Badge>
                  {task.progress_mode === 'checklist' && (
                    <Badge variant="secondary">Progress theo checklist</Badge>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {taskDescription && (
              <div>
                <h4 className="font-semibold mb-2">Mô Tả</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{taskDescription}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Người Thực Hiện</span>
                </div>
                <p className="text-gray-900">{assigneeName}</p>
                {task.nguoi_dung?.email && (
                  <p className="text-xs text-gray-500">{task.nguoi_dung.email}</p>
                )}
              </div>

              {task.deadline && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Deadline</span>
                  </div>
                  <p className="text-gray-900">
                    {new Date(task.deadline).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>

            {task.phan_du_an && (
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">Phần Dự Án</span>
                </div>
                <p className="text-gray-900">{task.phan_du_an.ten}</p>
                <p className="text-xs text-gray-500">
                  Dự án: {task.phan_du_an.du_an.ten}
                </p>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Tiến Độ</span>
                <span className="text-sm font-semibold text-gray-900">{task.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>

            {taskRiskScore !== null && taskRiskScore !== undefined && (
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <span className="font-medium">Chỉ số rủi ro</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        taskRiskScore > 70
                          ? 'bg-red-600'
                          : taskRiskScore > 40
                            ? 'bg-yellow-500'
                            : 'bg-green-600'
                      }`}
                      style={{ width: `${taskRiskScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold">{taskRiskScore}%</span>
                </div>
              </div>
            )}

            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-semibold">Checklist</h4>
                </div>
                <Badge variant="secondary">
                  {checklistSummary.done}/{checklistSummary.total}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Input
                  value={newChecklistTitle}
                  onChange={(event) => setNewChecklistTitle(event.target.value)}
                  placeholder="Thêm checklist item..."
                />
                <Button type="button" onClick={handleAddChecklist} disabled={addChecklistMutation.isPending}>
                  <Plus className="w-4 h-4 mr-1" />
                  Thêm
                </Button>
              </div>

              <div className="space-y-2">
                {checklistLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((item) => (
                      <Skeleton key={item} className="h-12 w-full" />
                    ))}
                  </div>
                ) : checklistItems.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Chưa có checklist item nào.
                  </p>
                ) : (
                  checklistItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 ${
                        item.is_done ? 'bg-emerald-50 border-emerald-100' : 'bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.is_done}
                        onChange={(event) => handleToggleChecklist(item.id, event.target.checked)}
                        className="h-4 w-4"
                      />
                      <span className={`flex-1 text-sm ${item.is_done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {item.title}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleMoveChecklist(index, -1)}
                          disabled={index === 0 || updateChecklistMutation.isPending}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleMoveChecklist(index, 1)}
                          disabled={index === checklistItems.length - 1 || updateChecklistMutation.isPending}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteChecklist(item.id)}
                          disabled={deleteChecklistMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-slate-600" />
                  <h4 className="font-semibold">File đính kèm</h4>
                </div>
                <div className="text-sm text-gray-500">{attachments.length} file</div>
              </div>

              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  onChange={handleUploadAttachment}
                  disabled={uploadAttachmentMutation.isPending}
                />
                {uploadAttachmentMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>

              <div className="space-y-2">
                {attachmentsLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((item) => (
                      <Skeleton key={item} className="h-12 w-full" />
                    ))}
                  </div>
                ) : attachments.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Chưa có file đính kèm nào.
                  </p>
                ) : (
                  attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Paperclip className="w-4 h-4 text-slate-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachment.size)} • {formatRelativeTime(attachment.ngay_tao)}
                        </p>
                      </div>
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex"
                      >
                        <Button type="button" size="icon" variant="ghost">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteAttachment(attachment.id)}
                        disabled={deleteAttachmentMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-gray-600" />
                <h4 className="font-semibold">Bình luận</h4>
                {comments.length > 0 && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {comments.length}
                  </span>
                )}
              </div>

              <div className="space-y-4 max-h-[200px] overflow-y-auto mb-4">
                {isLoadingComments ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-2" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Chưa có bình luận nào. Hãy là người đầu tiên!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.nguoi_dung.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-[#b9ff66] text-black">
                          {getInitials(comment.nguoi_dung.ten)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {comment.nguoi_dung.ten}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(comment.ngay_tao)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">
                          {comment.noi_dung}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>

              <form onSubmit={handleSubmitComment} className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Viết bình luận... (Enter để gửi, Shift+Enter để xuống dòng)"
                  className="min-h-[60px] resize-none"
                  disabled={addCommentMutation.isPending}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="bg-[#b9ff66] text-black hover:bg-[#a8ee55] shrink-0"
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                >
                  {addCommentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>

            <div className="flex justify-between text-xs text-gray-500 pt-4 border-t">
              {taskCreatedAt && (
                <div>
                  <span>Tạo: </span>
                  <time>{new Date(taskCreatedAt).toLocaleString('vi-VN')}</time>
                </div>
              )}
              {taskUpdatedAt && (
                <div>
                  <span>Cập nhật: </span>
                  <time>{new Date(taskUpdatedAt).toLocaleString('vi-VN')}</time>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
            <Button onClick={() => setEditModalOpen(true)}>Chỉnh Sửa</Button>
          </div>
        </DialogContent>
      </Dialog>

      <EditTaskModal
        key={`${task.id}-${editModalOpen ? 'open' : 'closed'}`}
        task={{
          id: task.id,
          ten: task.ten,
          moTa: taskDescription,
          deadline: task.deadline,
          trangThai: taskStatus,
          priority: task.priority,
          progress: task.progress,
        }}
        open={editModalOpen}
        onOpenChange={handleEditModalClose}
      />
    </>
  );
}
