'use client';

import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  AlertCircle, 
  AlertTriangle, 
  UserPlus, 
  Clock, 
  Check,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface Notification {
  id: string;
  nguoi_dung_id: string;
  loai: 'risk_alert' | 'stale_task' | 'assignment' | 'overload';
  noi_dung: string;
  task_lien_quan_id?: string | null;
  da_doc: boolean;
  thoi_gian: string;
  task?: {
    id: string;
    ten: string;
    trang_thai: string;
    progress: number;
    risk_level: string;
  } | null;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onClose?: () => void;
}

const notificationConfig = {
  risk_alert: {
    icon: AlertCircle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-l-red-500',
  },
  stale_task: {
    icon: Clock,
    iconColor: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-l-yellow-500',
  },
  assignment: {
    icon: UserPlus,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-l-blue-500',
  },
  overload: {
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-l-orange-500',
  },
};

export function NotificationItem({ notification, onMarkAsRead, onClose }: NotificationItemProps) {
  const config = notificationConfig[notification.loai];
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.da_doc && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  const handleViewTask = () => {
    if (onClose) onClose();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'p-3 border-l-4 rounded-r-lg cursor-pointer transition-all hover:shadow-sm',
        config.borderColor,
        notification.da_doc 
          ? 'bg-gray-50 opacity-70' 
          : config.bgColor
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-1.5 rounded-full', notification.da_doc ? 'bg-gray-200' : 'bg-white')}>
          <Icon className={cn('w-4 h-4', notification.da_doc ? 'text-gray-400' : config.iconColor)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm leading-tight',
            notification.da_doc ? 'text-gray-500' : 'text-gray-700'
          )}>
            {notification.noi_dung}
          </p>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(notification.thoi_gian), {
                addSuffix: true,
                locale: vi,
              })}
            </span>
            
            <div className="flex items-center gap-2">
              {notification.task_lien_quan_id && (
                <Link
                  href={`/dashboard/kanban?task=${notification.task_lien_quan_id}`}
                  onClick={handleViewTask}
                  className="text-xs text-[#b9ff66] hover:underline flex items-center gap-1"
                >
                  Xem task
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
              
              {!notification.da_doc && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead?.(notification.id);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Đánh dấu đã đọc
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * NotificationSkeleton - Loading skeleton cho notification item
 */
export function NotificationSkeleton() {
  return (
    <div className="p-3 border-l-4 border-l-gray-200 bg-gray-50 rounded-r-lg animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}
