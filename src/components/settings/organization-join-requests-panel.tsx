'use client';

import { Loader2, Mail, UserCheck2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  useOrganizationJoinRequests,
  useRespondOrganizationJoinRequest,
} from '@/lib/hooks/use-organizations';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((item) => item[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function OrganizationJoinRequestsPanel() {
  const { data: requests, isLoading } = useOrganizationJoinRequests();
  const respondMutation = useRespondOrganizationJoinRequest();
  const pendingRequestId = respondMutation.variables?.request_id;
  const pendingRequests = (requests || []).filter((request) => request.trang_thai === 'pending');

  const handleRespond = (requestId: string, action: 'approve' | 'reject') => {
    respondMutation.mutate(
      { request_id: requestId, action },
      {
        onSuccess: (result) => toast.success(result.message),
        onError: (error: Error) => toast.error(error.message),
      }
    );
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="rounded-[22px] border border-[#e6ebde] bg-[#fbfcf8] px-4 py-6 text-sm text-[#6f7c69]">Đang tải yêu cầu gia nhập...</div>
      ) : pendingRequests.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#dce4d3] bg-[#f8faf4] px-4 py-8 text-center text-sm text-[#72806c]">
          Chưa có yêu cầu gia nhập nào đang chờ duyệt.
        </div>
      ) : (
        pendingRequests.map((request) => {
          const isPending = respondMutation.isPending && pendingRequestId === request.id;

          return (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] px-4 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border border-[#dfe5d6]">
                  <AvatarImage src={request.nguoi_dung.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(request.nguoi_dung.ten)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-[#223021]">{request.nguoi_dung.ten}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#67745f]">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {request.email}
                    </span>
                    <span>•</span>
                    <span>{request.nguoi_dung.ten_phong_ban || 'Chưa có phòng ban'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
                  disabled={isPending}
                  onClick={() => handleRespond(request.id, 'approve')}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý
                    </>
                  ) : (
                    <>
                      <UserCheck2 className="mr-2 h-4 w-4" />
                      Duyệt vào tổ chức
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="border-[#e3e9db] bg-white text-[#5d6958] hover:bg-[#f6f8f1]"
                  disabled={isPending}
                  onClick={() => handleRespond(request.id, 'reject')}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Từ chối
                </Button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
