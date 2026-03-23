'use client';

import { useMemo, useState } from 'react';
import { Loader2, MailPlus, Send, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useInviteOrganizationMember,
  useOrganizationInvitations,
  useOrganizationMembers,
} from '@/lib/hooks/use-organizations';

type InvitableRole = 'admin' | 'manager' | 'member';

const roleLabels: Record<InvitableRole, string> = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  member: 'Thành viên',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((item) => item[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function OrganizationInvitationsPanel() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InvitableRole>('member');
  const inviteMutation = useInviteOrganizationMember();
  const { data: invitations, isLoading } = useOrganizationInvitations();
  const { data: organizationMembersResponse } = useOrganizationMembers();
  const assignableRoles = (organizationMembersResponse?.permissions.assignableRoles || []).filter(
    (item): item is InvitableRole => item !== 'owner'
  );

  const pendingInvitations = useMemo(
    () => (invitations || []).filter((invitation) => invitation.trang_thai === 'pending'),
    [invitations]
  );

  const availableRoles = assignableRoles.length > 0 ? assignableRoles : (['member'] as InvitableRole[]);

  const handleInvite = () => {
    inviteMutation.mutate(
      {
        email: email.trim(),
        vai_tro: availableRoles.includes(role) ? role : availableRoles[0],
      },
      {
        onSuccess: () => {
          toast.success('Đã gửi lời mời tổ chức');
          setEmail('');
          setRole('member');
        },
        onError: (error: Error) => toast.error(error.message),
      }
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d8e4cb] bg-white/80">
            <MailPlus className="h-5 w-5 text-[#6d8d49]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#223021]">Mời người vào tổ chức</h3>
            <p className="mt-1 text-sm leading-6 text-[#5d6c57]">
              Gửi lời mời bằng email để họ tham gia tổ chức này và bắt đầu làm việc cùng team.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_140px]">
          <div>
            <Label htmlFor="organization-invite-email">Email</Label>
            <Input
              id="organization-invite-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ten@congty.com"
              className="mt-1.5 border-[#dfe5d6] bg-white"
            />
          </div>

          <div>
            <Label htmlFor="organization-invite-role">Vai trò</Label>
            <Select value={availableRoles.includes(role) ? role : availableRoles[0]} onValueChange={(value) => setRole(value as InvitableRole)}>
              <SelectTrigger id="organization-invite-role" className="mt-1.5 border-[#dfe5d6] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((availableRole) => (
                  <SelectItem key={availableRole} value={availableRole}>
                    {roleLabels[availableRole]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              className="w-full border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
              onClick={handleInvite}
              disabled={!email.trim() || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang gửi
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Gửi lời mời
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-[#e3eadc] bg-white/90 p-5 shadow-[0_16px_35px_-32px_rgba(98,115,88,0.34)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#223021]">Lời mời đang chờ</h3>
            <p className="mt-1 text-sm text-[#67745f]">Danh sách những email đã được mời nhưng chưa phản hồi.</p>
          </div>
          <Badge className="border border-[#d8e4cb] bg-[#f4faea] text-[#4f614b]">{pendingInvitations.length} đang chờ</Badge>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <div className="rounded-[22px] border border-[#e6ebde] bg-[#fbfcf8] px-4 py-6 text-sm text-[#6f7c69]">Đang tải lời mời...</div>
          ) : pendingInvitations.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[#dce4d3] bg-[#f8faf4] px-4 py-8 text-center text-sm text-[#72806c]">
              Chưa có lời mời nào đang chờ phản hồi.
            </div>
          ) : (
            pendingInvitations.map((invitation) => (
              <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[#e6ebde] bg-[#fbfcf8] px-4 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 border border-[#dfe5d6]">
                    <AvatarImage src={invitation.nguoi_moi.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(invitation.nguoi_moi.ten)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-[#223021]">{invitation.email}</p>
                    <p className="mt-1 text-sm text-[#67745f]">
                      {invitation.nguoi_moi.ten} đã gửi lời mời vào {new Date(invitation.ngay_moi).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>

                <Badge className="border border-[#dce8d0] bg-[#f3f8eb] text-[#476248]">
                  <UserPlus className="mr-1 h-3 w-3" />
                  {roleLabels[invitation.vai_tro]}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
