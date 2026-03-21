'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/lib/hooks/use-notifications';
import { cn } from '@/lib/utils';
import { NotificationItem, NotificationSkeleton } from './notification-item';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevUnreadCount = useRef(0);

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    currentPage,
    pagination,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
  } = useNotifications({ limit: 8 });

  useEffect(() => {
    if (soundEnabled && unreadCount > prevUnreadCount.current && prevUnreadCount.current > 0) {
      try {
        const audio = new Audio('/audio/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch((error) => {
          console.log('Could not play notification sound:', error);
        });
      } catch (error) {
        console.log('Notification sound not supported:', error);
      }
    }
    prevUnreadCount.current = unreadCount;
  }, [soundEnabled, unreadCount]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'group relative rounded-lg p-2 outline-none transition-colors hover:bg-[#2a2b35]',
            className
          )}
          aria-label="Thông báo"
        >
          <Bell className="h-5 w-5 text-white/70 transition-colors group-hover:text-white" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="right"
        className="z-50 w-[380px] overflow-hidden border-border bg-background p-0 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border bg-muted/40 p-4">
          <h3 className="font-semibold text-foreground">Thông báo</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled((previous) => !previous)}
              className="rounded-lg p-1.5 transition-colors hover:bg-accent hover:text-accent-foreground"
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 rounded-lg bg-foreground px-2 py-1 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Đọc tất cả
              </button>
            )}
          </div>
        </div>

        <div className="custom-scrollbar max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-3">
              <NotificationSkeleton />
              <NotificationSkeleton />
              <NotificationSkeleton />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Không có thông báo mới</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onClose={() => setIsOpen(false)}
                />
              ))}
            </div>
          )}
        </div>

        {(notifications.length > 0 || pagination.totalPages > 1) && (
          <div className="border-t border-border bg-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Trang {currentPage}/{Math.max(pagination.totalPages, 1)}</span>
              <span>{pagination.total} thông báo</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={prevPage}
                disabled={!hasPrevPage}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Trước
              </button>
              <button
                onClick={nextPage}
                disabled={!hasNextPage}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
