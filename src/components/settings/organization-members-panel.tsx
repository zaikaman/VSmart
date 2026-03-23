'use client';

import { useMemo, useState } from 'react';
import { ShieldCheck, ShieldEllipsis, ShieldPlus, UserCog, Users2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useOrganizationMembers,
  useUpdateOrganizationMemberRole,
} from '@/lib/hooks/use-organizations';
import type { AppRole } from '@/lib/auth/permissions';

const roleToneMap: Record<AppRole, string> = {
  owner: 'border-[#f0ddca] bg-[#fff4ea] text-[#9a5d33]',
  admin: 'border-[#d7e4f4] bg-[#eff6ff] text-[#315d88]',
  manager: 'border-[#dce8d0] bg-[#f3f8eb] text-[#476248]',
  member: 'border-[#e5e7eb] bg-[#f6f7f8] text-[#5f6b58]',
};

const roleIconMap = {
  owner: ShieldPlus,
  admin: ShieldEllipsis,
  manager: UserCog,
  member: Users2,
} satisfies Record<AppRole, typeof ShieldPlus>;

function getInitials(name: string) {
  return name
    .split(' ')
    .map((item) => item[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function OrganizationMembersPanel() {
  const { data: response, isLoading } = useOrganizationMembers();
  const updateRoleMutation = useUpdateOrganizationMemberRole();
  const [draftRoles, setDraftRoles] = useState<Record<string, AppRole>>({});

  const pendingUserId = updateRoleMutation.variables?.user_id;

  const roleCounts = useMemo(() => {
    return (response?.data || []).reduce<Record<AppRole, number>>(
      (acc, member) => {
        acc[member.vai_tro] += 1;
        return acc;
      },
      {
        owner: 0,
        admin: 0,
        manager: 0,
        member: 0,
      }
    );
  }, [response?.data]);

  if (isLoading) {
    return (
      <div className="grid gap-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-24 animate-pulse rounded-[24px] border border-[#e6ebde] bg-[#f7f9f3]" />
        ))}
      </div>
    );
  }

  if (!response) {
    return null;
  }

  const members = response.data;
  const permissions = response.permissions;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        {(['owner', 'admin', 'manager', 'member'] as AppRole[]).map((role) => {
          const Icon = roleIconMap[role];

          return (
            <div
              key={role}
              className={`rounded-[24px] border px-4 py-4 shadow-[0_18px_40px_-34px_rgba(96,111,88,0.35)] ${roleToneMap[role]}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">
                  {permissions.roleLabels[role]}
                </span>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-3xl font-semibold">{roleCounts[role]}</p>
              <p className="mt-1 text-sm opacity-80">
                {role === 'owner'
                  ? 'Giữ quyết định cao nhất'
                  : role === 'admin'
                    ? 'Quản trị vận hành'
                    : role === 'manager'
                      ? 'Điều phối công việc'
                      : 'Tham gia triển khai'}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-[28px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e4cb] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#5b6d56]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Quyền tổ chức
            </div>
            <p className="max-w-2xl text-sm leading-6 text-[#5d6c57]">
              Owner giữ quyền cuối cùng, admin phối hợp vận hành, manager điều phối công việc, member tập trung triển khai.
              Việc đổi role được tách riêng khỏi luồng đăng nhập để tránh gán quyền sai.
            </p>
          </div>
          <div className="rounded-[20px] border border-[#dce6d1] bg-white/80 px-4 py-3 text-sm text-[#52614f]">
            {permissions.canManageRoles
              ? 'Bạn có thể điều chỉnh role tổ chức theo phạm vi quyền hiện tại.'
              : 'Bạn đang ở chế độ xem. Vai trò tổ chức chỉ do owner hoặc admin cập nhật.'}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {members.map((member) => {
            const draftRole = draftRoles[member.id] || member.vai_tro;
            const isSelf = member.id === permissions.currentUserId;
            const isPending = pendingUserId === member.id && updateRoleMutation.isPending;
            const canEditRow =
              permissions.canManageRoles &&
              !isSelf &&
              permissions.assignableRoles.includes(draftRole) &&
              permissions.assignableRoles.includes(member.vai_tro);
            const Icon = roleIconMap[member.vai_tro];

            return (
              <div
                key={member.id}
                className="grid gap-4 rounded-[24px] border border-[#e3eadc] bg-white/90 px-4 py-4 shadow-[0_16px_35px_-32px_rgba(98,115,88,0.34)] md:grid-cols-[minmax(0,1.3fr)_220px_130px]"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 border border-[#dfe5d6]">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(member.ten)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-[#223021]">{member.ten}</p>
                      <Badge className={`${roleToneMap[member.vai_tro]} border`}>
                        <Icon className="mr-1 h-3 w-3" />
                        {permissions.roleLabels[member.vai_tro]}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-[#67745f]">{member.email}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#85917d]">
                      {member.ten_phong_ban || 'Chưa gắn phòng ban'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`role-${member.id}`}>Role tổ chức</Label>
                  <Select
                    value={draftRole}
                    onValueChange={(value) =>
                      setDraftRoles((current) => ({ ...current, [member.id]: value as AppRole }))
                    }
                    disabled={!permissions.canManageRoles || isSelf || isPending}
                  >
                    <SelectTrigger id={`role-${member.id}`} className="border-[#dfe5d6] bg-[#fbfcf8]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...new Set([...permissions.assignableRoles, member.vai_tro])].map((role) => (
                        <SelectItem key={role} value={role}>
                          {permissions.roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col items-start justify-between gap-3 md:items-end">
                  <Button
                    className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
                    disabled={!canEditRow || draftRole === member.vai_tro || isPending}
                    onClick={() =>
                      updateRoleMutation.mutate(
                        { user_id: member.id, vai_tro: draftRole },
                        {
                          onSuccess: () => {
                            toast.success(`Đã cập nhật role cho ${member.ten}`);
                            setDraftRoles((current) => {
                              const next = { ...current };
                              delete next[member.id];
                              return next;
                            });
                          },
                          onError: (error: Error) => toast.error(error.message),
                        }
                      )
                    }
                  >
                    {isPending ? 'Đang lưu...' : 'Lưu role'}
                  </Button>

                  <p className="text-right text-xs leading-5 text-[#7a8774]">
                    {isSelf
                      ? 'Role của chính bạn được khóa ở màn này để tránh tự khóa quyền.'
                      : permissions.canManageRoles
                        ? 'Chỉ các role nằm trong phạm vi được phép mới hiển thị trong danh sách chọn.'
                        : 'Liên hệ owner hoặc admin nếu cần điều chỉnh quyền.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
