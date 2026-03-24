'use client';

import type { QueryKey } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect } from 'react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { supabase } from '@/lib/supabase/client';

type ChangeRecord = Record<string, unknown>;

function asString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getChangedRecord(payload: { new?: ChangeRecord; old?: ChangeRecord }) {
  return (payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) || {};
}

export function RealtimeDataProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    const organizationId = currentUser.to_chuc?.id || null;
    const invalidate = (...keys: QueryKey[]) => {
      keys.forEach((queryKey) => {
        void queryClient.invalidateQueries({ queryKey });
      });
    };

    const channel = supabase.channel(`realtime-cache:${currentUser.id}`);

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'task' },
      (payload) => {
        const record = getChangedRecord(payload);
        const taskId = asString(record.id);

        invalidate(
          ['tasks'],
          ['stats'],
          ['projects'],
          ['project-parts'],
          ['planning-calendar'],
          ['planning-workload'],
          ['project-forecast'],
          ['review-queue'],
          ['analytics-overview'],
          ['activity-feed']
        );

        if (taskId) {
          invalidate(['tasks', taskId]);
        }
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'task_checklist_item' },
      (payload) => {
        const record = getChangedRecord(payload);
        const taskId = asString(record.task_id);

        invalidate(['tasks'], ['stats'], ['planning-calendar'], ['planning-workload'], ['project-forecast']);

        if (taskId) {
          invalidate(['task-checklist', taskId], ['tasks', taskId]);
        }
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'task_attachment' },
      (payload) => {
        const record = getChangedRecord(payload);
        const taskId = asString(record.task_id);

        if (taskId) {
          invalidate(['task-attachments', taskId], ['tasks', taskId]);
        }
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'recurring_task_rule' },
      (payload) => {
        const record = getChangedRecord(payload);
        const taskId = asString(record.task_id);

        invalidate(['tasks']);

        if (taskId) {
          invalidate(['task-recurring-rule', taskId], ['tasks', taskId]);
        }
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'task_template' },
      () => {
        invalidate(['task-templates']);
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'binh_luan' },
      (payload) => {
        const record = getChangedRecord(payload);
        const taskId = asString(record.task_id);

        invalidate(['activity-feed'], ['notifications']);

        if (taskId) {
          invalidate(['task-comments', taskId], ['tasks', taskId]);
        }
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'activity_log' },
      () => {
        invalidate(['activity-feed'], ['analytics-overview']);
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'du_an',
        ...(organizationId ? { filter: `to_chuc_id=eq.${organizationId}` } : {}),
      },
      (payload) => {
        const record = getChangedRecord(payload);
        const projectId = asString(record.id);

        invalidate(
          ['projects'],
          ['stats'],
          ['planning-calendar'],
          ['planning-workload'],
          ['project-forecast'],
          ['analytics-overview'],
          ['activity-feed']
        );

        if (projectId) {
          invalidate(
            ['projects', projectId],
            ['project-members', projectId],
            ['project-parts', projectId],
            ['project-forecast', projectId]
          );
        }
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'phan_du_an' },
      (payload) => {
        const record = getChangedRecord(payload);
        const projectId = asString(record.du_an_id);

        invalidate(
          ['project-parts'],
          ['projects'],
          ['tasks'],
          ['stats'],
          ['planning-calendar'],
          ['planning-workload'],
          ['project-forecast'],
          ['analytics-overview'],
          ['activity-feed']
        );

        if (projectId) {
          invalidate(
            ['project-parts', projectId],
            ['projects', projectId],
            ['project-forecast', projectId],
            ['project-members', projectId]
          );
        }
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'thanh_vien_du_an' },
      (payload) => {
        const record = getChangedRecord(payload);
        const projectId = asString(record.du_an_id);

        invalidate(
          ['project-members'],
          ['project-invitations'],
          ['projects'],
          ['tasks'],
          ['users'],
          ['notifications'],
          ['stats'],
          ['planning-calendar'],
          ['planning-workload'],
          ['project-forecast'],
          ['analytics-overview'],
          ['activity-feed']
        );

        if (projectId) {
          invalidate(
            ['project-members', projectId],
            ['projects', projectId],
            ['project-parts', projectId],
            ['project-forecast', projectId]
          );
        }
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'thong_bao',
        filter: `nguoi_dung_id=eq.${currentUser.id}`,
      },
      () => {
        invalidate(['notifications']);
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'nguoi_dung',
        ...(organizationId ? { filter: `to_chuc_id=eq.${organizationId}` } : { filter: `id=eq.${currentUser.id}` }),
      },
      () => {
        invalidate(
          ['current-user'],
          ['dashboard-current-user'],
          ['analytics-current-user'],
          ['reviews-current-user'],
          ['settings-current-user'],
          ['onboarding-user'],
          ['edit-task-current-user'],
          ['user-profile'],
          ['users'],
          ['organization-members'],
          ['project-members'],
          ['stats'],
          ['planning-workload'],
          ['analytics-overview'],
          ['admin-skills-matrix']
        );
      }
    );

    if (organizationId) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'to_chuc', filter: `id=eq.${organizationId}` },
        () => {
          invalidate(
            ['organization'],
            ['current-user'],
            ['dashboard-current-user'],
            ['settings-current-user'],
            ['onboarding-user'],
            ['user-profile'],
            ['projects'],
            ['stats'],
            ['discover-organizations']
          );
        }
      );

      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'phong_ban', filter: `to_chuc_id=eq.${organizationId}` },
        () => {
          invalidate(
            ['phong-ban'],
            ['organization-members'],
            ['users'],
            ['project-parts'],
            ['projects'],
            ['planning-workload'],
            ['stats']
          );
        }
      );
    }

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'loi_moi_to_chuc' },
      () => {
        invalidate(['organization-invitations'], ['my-organization-invitations'], ['notifications']);
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'yeu_cau_gia_nhap_to_chuc' },
      () => {
        invalidate(
          ['organization-join-requests'],
          ['my-organization-join-requests'],
          ['discover-organizations'],
          ['organization-members'],
          ['notifications']
        );
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ky_nang_nguoi_dung' },
      () => {
        invalidate(['user-skills'], ['users'], ['admin-skills-matrix']);
      }
    );

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('Realtime cache sync đang gặp lỗi:', status);
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentUser?.to_chuc?.id, queryClient]);

  return children;
}
