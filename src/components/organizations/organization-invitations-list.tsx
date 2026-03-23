'use client';

import { Building2, CheckCircle2, Clock3, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  useMyOrganizationInvitations,
  useRespondOrganizationInvitation,
} from '@/lib/hooks/use-organizations';

const roleLabels = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  member: 'Thành viên',
} as const;

interface OrganizationInvitationsListProps {
  compact?: boolean;
}

export function OrganizationInvitationsList({ compact = false }: OrganizationInvitationsListProps) {
  const { data: invitations, isLoading } = useMyOrganizationInvitations();
  const respondMutation = useRespondOrganizationInvitation();
  const pendingInvitationId = respondMutation.variables?.invitation_id;

  const handleRespond = (invitationId: string, action: 'accept' | 'decline') => {
    respondMutation.mutate(
      { invitation_id: invitationId, action },
      {
        onSuccess: (result) => toast.success(result.message),
        onError: (error: Error) => toast.error(error.message),
      }
    );
  };

  if (isLoading) {
    return <div className="rounded-[22px] border border-[#e6ebde] bg-[#fbfcf8] px-4 py-6 text-sm text-[#6f7c69]">Đang tải lời mời tổ chức...</div>;
  }

  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {invitations.map((invitation) => {
        const isPending = respondMutation.isPending && pendingInvitationId === invitation.id;

        return (
          <div
            key={invitation.id}
            className={`rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] ${compact ? 'p-4' : 'p-5'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#dce5d2] bg-white">
                  <Building2 className="h-5 w-5 text-[#6d8d49]" />
                </div>
                <div>
                  <p className="font-semibold text-[#223021]">{invitation.to_chuc.ten}</p>
                  <p className="mt-1 text-sm leading-6 text-[#67745f]">
                    {invitation.nguoi_moi.ten} mời bạn tham gia với vai trò {roleLabels[invitation.vai_tro]}.
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#85917d]">
                    <Clock3 className="h-3.5 w-3.5" />
                    {new Date(invitation.ngay_moi).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
                  disabled={isPending}
                  onClick={() => handleRespond(invitation.id, 'accept')}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Tham gia
                    </>
                  )}
                </Button>
                <Button variant="outline" className="border-[#e3e9db] bg-white text-[#5d6958] hover:bg-[#f6f8f1]" disabled={isPending} onClick={() => handleRespond(invitation.id, 'decline')}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Từ chối
                </Button>
              </div>
            </div>

            {!compact && invitation.to_chuc.mo_ta ? (
              <p className="mt-3 text-sm leading-6 text-[#67745f]">{invitation.to_chuc.mo_ta}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
