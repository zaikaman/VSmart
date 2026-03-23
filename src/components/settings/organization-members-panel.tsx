'use client';

import { useMemo, useState } from 'react';
import {
  Building2,
  ShieldCheck,
  ShieldEllipsis,
  ShieldPlus,
  UserCog,
  Users2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  canManageOrganizationTarget,
  type AppRole,
} from '@/lib/auth/permissions';
import {
  useOrganizationMembers,
  useUpdateOrganizationMemberRole,
} from '@/lib/hooks/use-organizations';
import { type PhongBan, usePhongBan } from '@/lib/hooks/use-phong-ban';

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

const departmentStatusLabel = {
  active: 'Đang dùng',
  inactive: 'Ngừng dùng',
  merged: 'Đã gộp',
} as const;

const NO_DEPARTMENT = '__none__';

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
  const updateMemberMutation = useUpdateOrganizationMemberRole();
  const { data: departments } = usePhongBan();
  const [draftRoles, setDraftRoles] = useState<Record<string, AppRole>>({});
  const [draftDepartments, setDraftDepartments] = useState<Record<string, string>>({});

  const pendingUserId = updateMemberMutation.variables?.user_id;

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
          <div
            key={item}
            className="h-28 animate-pulse rounded-[24px] border border-[#e6ebde] bg-[#f7f9f3]"
          />
        ))}
      </div>
    );
  }

  if (!response) {
    return null;
  }

  const members = response.data;
  const permissions = response.permissions;
  const activeDepartments: PhongBan[] = departments || [];

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
                  ? 'Giữ quyết định cuối cùng'
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
              Quyền và phòng ban
            </div>
            <p className="max-w-2xl text-sm leading-6 text-[#5d6c57]">
              Role giữ trách nhiệm ra quyết định. Phòng ban giữ đầu mối vận hành để phân công và chia phần dự án khớp với cơ cấu thực tế.
            </p>
          </div>
          <div className="rounded-[20px] border border-[#dce6d1] bg-white/80 px-4 py-3 text-sm text-[#52614f]">
            {permissions.canManageRoles
              ? 'Bạn có thể cập nhật role và gắn phòng ban cho thành viên trong phạm vi quyền hiện tại.'
              : 'Bạn đang ở chế độ xem. Vai trò và phòng ban chỉ do owner hoặc admin cập nhật.'}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {members.map((member) => {
            const draftRole = draftRoles[member.id] || member.vai_tro;
            const currentDepartmentValue = member.phong_ban_id || NO_DEPARTMENT;
            const draftDepartment = draftDepartments[member.id] || currentDepartmentValue;
            const isSelf = member.id === permissions.currentUserId;
            const isPending = pendingUserId === member.id && updateMemberMutation.isPending;
            const canManageTarget =
              isSelf ||
              canManageOrganizationTarget(permissions.currentUserRole, member.vai_tro);
            const canEditRole =
              permissions.canManageRoles &&
              !isSelf &&
              canManageTarget &&
              permissions.assignableRoles.includes(draftRole) &&
              permissions.assignableRoles.includes(member.vai_tro);
            const canEditDepartment =
              permissions.canManageRoles && canManageTarget;
            const roleChanged = draftRole !== member.vai_tro;
            const departmentChanged = draftDepartment !== currentDepartmentValue;
            const canSave =
              (roleChanged && canEditRole) || (departmentChanged && canEditDepartment);
            const Icon = roleIconMap[member.vai_tro];
            const currentDepartmentStillSelectable =
              Boolean(member.phong_ban_id) &&
              member.phong_ban_trang_thai &&
              member.phong_ban_trang_thai !== 'active';

            return (
              <div
                key={member.id}
                className="grid gap-4 rounded-[24px] border border-[#e3eadc] bg-white/90 px-4 py-4 shadow-[0_16px_35px_-32px_rgba(98,115,88,0.34)] md:grid-cols-[minmax(0,1.2fr)_300px_140px]"
              >
                <div className="flex items-start gap-3">
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
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#85917d]">
                      <span>{member.ten_phong_ban || 'Chưa gắn phòng ban'}</span>
                      {member.phong_ban_trang_thai && member.phong_ban_trang_thai !== 'active' ? (
                        <span className="rounded-full border border-[#ead9c8] bg-[#fff5ec] px-2 py-1 text-[10px] font-semibold tracking-[0.16em] text-[#9b633a]">
                          {departmentStatusLabel[member.phong_ban_trang_thai]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`role-${member.id}`}>Role tổ chức</Label>
                    <Select
                      value={draftRole}
                      onValueChange={(value) =>
                        setDraftRoles((current) => ({
                          ...current,
                          [member.id]: value as AppRole,
                        }))
                      }
                      disabled={!canEditRole || isPending}
                    >
                      <SelectTrigger
                        id={`role-${member.id}`}
                        className="border-[#dfe5d6] bg-[#fbfcf8]"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[...new Set([...permissions.assignableRoles, member.vai_tro])].map(
                          (role) => (
                            <SelectItem key={role} value={role}>
                              {permissions.roleLabels[role]}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`department-${member.id}`}>Phòng ban</Label>
                    <Select
                      value={draftDepartment}
                      onValueChange={(value) =>
                        setDraftDepartments((current) => ({
                          ...current,
                          [member.id]: value,
                        }))
                      }
                      disabled={!canEditDepartment || isPending}
                    >
                      <SelectTrigger
                        id={`department-${member.id}`}
                        className="border-[#dfe5d6] bg-[#fbfcf8]"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_DEPARTMENT}>Chưa gắn phòng ban</SelectItem>
                        {activeDepartments.map((department: PhongBan) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.ten}
                          </SelectItem>
                        ))}
                        {currentDepartmentStillSelectable ? (
                          <SelectItem value={member.phong_ban_id!}>
                            {member.ten_phong_ban} ({departmentStatusLabel[member.phong_ban_trang_thai!]})
                          </SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
                    {member.phong_ban_trang_thai && member.phong_ban_trang_thai !== 'active' ? (
                      <p className="text-xs leading-5 text-[#86633e]">
                        Thành viên này đang gắn vào phòng ban không còn dùng cho phân công mới. Nên chuyển sang một phòng ban đang dùng.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-start justify-between gap-3 md:items-end">
                  <Button
                    className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
                    disabled={!canSave || isPending}
                    onClick={() => {
                      const payload: {
                        user_id: string;
                        vai_tro?: AppRole;
                        phong_ban_id?: string | null;
                      } = { user_id: member.id };

                      if (roleChanged) {
                        payload.vai_tro = draftRole;
                      }

                      if (departmentChanged) {
                        payload.phong_ban_id =
                          draftDepartment === NO_DEPARTMENT ? null : draftDepartment;
                      }

                      updateMemberMutation.mutate(payload, {
                        onSuccess: () => {
                          toast.success(`Đã cập nhật thông tin của ${member.ten}`);
                          setDraftRoles((current) => {
                            const next = { ...current };
                            delete next[member.id];
                            return next;
                          });
                          setDraftDepartments((current) => {
                            const next = { ...current };
                            delete next[member.id];
                            return next;
                          });
                        },
                        onError: (error: Error) => toast.error(error.message),
                      });
                    }}
                  >
                    {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </Button>

                  <p className="text-right text-xs leading-5 text-[#7a8774]">
                    {isSelf
                      ? 'Bạn có thể tự gắn phòng ban cho mình, nhưng role của chính bạn được khóa ở màn này.'
                      : canEditDepartment || canEditRole
                        ? 'Role và phòng ban nên phản ánh đúng trách nhiệm và đầu mối phụ trách thực tế.'
                        : 'Liên hệ owner hoặc admin nếu cần điều chỉnh role hoặc phòng ban.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-[22px] border border-[#e2ead8] bg-white/75 px-4 py-3 text-sm text-[#566452]">
          <div className="flex items-start gap-2">
            <Building2 className="mt-0.5 h-4 w-4" />
            <p>
              Khi phòng ban được gắn trực tiếp cho thành viên, các bước phân công và chia phần dự án sẽ bám sát cơ cấu thực tế hơn thay vì chỉ dựa vào tên phòng ban nhập tay.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
