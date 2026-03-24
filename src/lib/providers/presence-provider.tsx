'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { usePathname } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { supabase } from '@/lib/supabase/client';

interface PresencePayload {
  userId: string;
  organizationId: string;
  path: string;
  lastSeenAt: string;
}

interface PresenceContextValue {
  currentUserId: string | null;
  onlineCount: number;
  onlineUserIds: string[];
  ready: boolean;
  isUserOnline: (userId?: string | null) => boolean;
}

const PresenceContext = createContext<PresenceContextValue | undefined>(undefined);

function normalizePresenceState(channel: RealtimeChannel) {
  const state = channel.presenceState<PresencePayload>();
  const onlineUserIds = new Set<string>();

  Object.entries(state).forEach(([key, presences]) => {
    const matchedPresence = presences.find((presence) => presence.userId);
    if (matchedPresence?.userId) {
      onlineUserIds.add(matchedPresence.userId);
      return;
    }

    if (key) {
      onlineUserIds.add(key);
    }
  });

  return Array.from(onlineUserIds);
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const { data: currentUser } = useCurrentUser();

  useEffect(() => {
    if (!currentUser?.id) {
      setOnlineUserIds([]);
      setReady(false);
      return;
    }

    const organizationId = currentUser.to_chuc?.id || `user:${currentUser.id}`;
    const channel = supabase.channel(`presence:${organizationId}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    let isMounted = true;

    const syncPresence = () => {
      if (!isMounted) {
        return;
      }

      setOnlineUserIds(normalizePresenceState(channel));
    };

    const trackPresence = async () => {
      const status = await channel.track({
        userId: currentUser.id,
        organizationId,
        path: pathname,
        lastSeenAt: new Date().toISOString(),
      });

      if (status !== 'ok') {
        return;
      }

      syncPresence();
    };

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe(async (status) => {
        if (!isMounted) {
          return;
        }

        if (status === 'SUBSCRIBED') {
          setReady(true);
          await trackPresence();
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setReady(false);
        }
      });

    const heartbeat = window.setInterval(() => {
      void trackPresence();
    }, 25_000);

    const refreshPresence = () => {
      void trackPresence();
    };

    const handleBeforeUnload = () => {
      void channel.untrack();
    };

    window.addEventListener('focus', refreshPresence);
    window.addEventListener('online', refreshPresence);
    document.addEventListener('visibilitychange', refreshPresence);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isMounted = false;
      setReady(false);
      window.clearInterval(heartbeat);
      window.removeEventListener('focus', refreshPresence);
      window.removeEventListener('online', refreshPresence);
      document.removeEventListener('visibilitychange', refreshPresence);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentUser?.to_chuc?.id, pathname]);

  const value = useMemo<PresenceContextValue>(
    () => ({
      currentUserId: currentUser?.id || null,
      onlineCount: onlineUserIds.length,
      onlineUserIds,
      ready,
      isUserOnline: (userId) => (userId ? onlineUserIds.includes(userId) : false),
    }),
    [currentUser?.id, onlineUserIds, ready]
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const context = useContext(PresenceContext);

  if (!context) {
    throw new Error('usePresence phải được dùng bên trong PresenceProvider');
  }

  return context;
}
