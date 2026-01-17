'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/lib/hooks/use-notifications';
import { NotificationItem, NotificationSkeleton } from './notification-item';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  } = useNotifications();

  // Phát âm thanh khi có notification mới
  useEffect(() => {
    if (soundEnabled && unreadCount > prevUnreadCount.current && prevUnreadCount.current > 0) {
      playNotificationSound();
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount, soundEnabled]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/audio/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch((error) => {
        console.log('Could not play notification sound:', error);
      });
    } catch (error) {
      console.log('Notification sound not supported:', error);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative p-2 rounded-lg hover:bg-[#2a2b35] transition-colors group outline-none",
            className
          )}
          aria-label="Thông báo"
        >
          <Bell className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />

          {/* Badge số lượng */}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="right"
        className="w-[380px] p-0 overflow-hidden bg-background border-border shadow-xl z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/40">
          <h3 className="font-semibold text-foreground">Thông báo</h3>
          <div className="flex items-center gap-2">
            {/* Toggle sound */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              ) : (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {/* Mark all as read */}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 px-2 py-1 text-xs text-background bg-foreground hover:bg-foreground/90 rounded-lg transition-colors font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Đọc tất cả
              </button>
            )}
          </div>
        </div>

        {/* Notification list */}
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="space-y-2 p-3">
              <NotificationSkeleton />
              <NotificationSkeleton />
              <NotificationSkeleton />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Không có thông báo mới</p>
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

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-border bg-muted/40">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Xem tất cả thông báo
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
