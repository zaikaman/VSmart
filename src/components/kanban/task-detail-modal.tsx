'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, Calendar, TrendingUp } from 'lucide-react';

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

export function TaskDetailModal({ task, open, onOpenChange }: TaskDetailModalProps) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
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

        <div className="space-y-6">
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

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button>Chỉnh Sửa</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
