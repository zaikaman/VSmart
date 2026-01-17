'use client';

import { useState, useRef, useEffect } from 'react';
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
import { User, Calendar, TrendingUp, Send, MessageSquare, Loader2 } from 'lucide-react';
import { EditTaskModal } from './edit-task-modal';
import { toast } from 'sonner';

interface Task {
  id: string;
  ten: string;
  moTa?: string | null;
  deadline?: string | null;
  trangThai: string;
  priority: string;
  progress: number;
  riskScore?: number | null;
  nguoi_dung?: {
    hoTen: string;
    email: string;
  } | null;
  phan_du_an?: {
    ten: string;
    du_an: {
      ten: string;
    };
  } | null;
  taoLuc?: string;
  capNhatCuoi?: string;
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
};

const priorityLabels = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
};

const statusLabels = {
  todo: 'Cần Làm',
  'in-progress': 'Đang Làm',
  done: 'Hoàn Thành',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
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

export function TaskDetailModal({ task, open, onOpenChange }: TaskDetailModalProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch comments
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

  // Add comment mutation
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

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (comments.length > 0) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments.length]);

  if (!task) return null;

  const handleEditClick = () => {
    setEditModalOpen(true);
  };

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-2">{task.ten}</DialogTitle>
                <div className="flex gap-2">
                  <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                    {priorityLabels[task.priority as keyof typeof priorityLabels]}
                  </Badge>
                  <Badge variant="outline">
                    {statusLabels[task.trangThai as keyof typeof statusLabels]}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {task.moTa && (
              <div>
                <h4 className="font-semibold mb-2">Mô Tả</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{task.moTa}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {task.nguoi_dung && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <User className="w-4 h-4" />
                    <span className="font-medium">Người Thực Hiện</span>
                  </div>
                  <p className="text-gray-900">{task.nguoi_dung.hoTen}</p>
                  <p className="text-xs text-gray-500">{task.nguoi_dung.email}</p>
                </div>
              )}

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

            {task.riskScore !== null && task.riskScore !== undefined && (
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <span className="font-medium">Chỉ số rủi ro</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${task.riskScore > 70
                        ? 'bg-red-600'
                        : task.riskScore > 40
                          ? 'bg-yellow-500'
                          : 'bg-green-600'
                        }`}
                      style={{ width: `${task.riskScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold">{task.riskScore}%</span>
                </div>
              </div>
            )}

            {/* Comments Section */}
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

              {/* Comments List */}
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

              {/* Add Comment Form */}
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
              {task.taoLuc && (
                <div>
                  <span>Tạo: </span>
                  <time>{new Date(task.taoLuc).toLocaleString('vi-VN')}</time>
                </div>
              )}
              {task.capNhatCuoi && (
                <div>
                  <span>Cập nhật: </span>
                  <time>{new Date(task.capNhatCuoi).toLocaleString('vi-VN')}</time>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
            <Button onClick={handleEditClick}>Chỉnh Sửa</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Modal */}
      <EditTaskModal
        task={task}
        open={editModalOpen}
        onOpenChange={handleEditModalClose}
      />
    </>
  );
}
