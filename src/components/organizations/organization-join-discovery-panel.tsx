'use client';

import { useMemo, useState } from 'react';
import { Building2, Loader2, Search, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
  useCancelOrganizationJoinRequest,
  useCreateOrganizationJoinRequest,
  useDiscoverOrganizations,
  useMyOrganizationJoinRequests,
} from '@/lib/hooks/use-organizations';

const SEARCH_PAGE_SIZE = 10;

export function OrganizationJoinDiscoveryPanel() {
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { data: discoveryResult, isLoading, isFetching } = useDiscoverOrganizations(query, currentPage, SEARCH_PAGE_SIZE);
  const { data: myRequests } = useMyOrganizationJoinRequests();
  const createRequestMutation = useCreateOrganizationJoinRequest();
  const cancelRequestMutation = useCancelOrganizationJoinRequest();

  const organizations = discoveryResult?.data || [];
  const pagination =
    discoveryResult?.pagination ||
    ({
      page: currentPage,
      limit: SEARCH_PAGE_SIZE,
      total: 0,
      totalPages: 0,
    } as const);

  const pendingRequestIds = useMemo(
    () =>
      new Set(
        (myRequests || [])
          .filter((request) => request.trang_thai === 'pending')
          .map((request) => request.to_chuc.id)
      ),
    [myRequests]
  );

  const recentRequests = useMemo(
    () => (myRequests || []).filter((request) => request.trang_thai === 'pending').slice(0, 3),
    [myRequests]
  );

  const handleRequest = (organizationId: string) => {
    createRequestMutation.mutate(
      { to_chuc_id: organizationId },
      {
        onSuccess: () => toast.success('Đã gửi yêu cầu gia nhập'),
        onError: (error: Error) => toast.error(error.message),
      }
    );
  };

  const handleCancelRequest = (requestId: string) => {
    cancelRequestMutation.mutate(
      { request_id: requestId, action: 'cancel' },
      {
        onSuccess: (result) => toast.success(result.message),
        onError: (error: Error) => toast.error(error.message),
      }
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d8e4cb] bg-white/80">
            <Search className="h-5 w-5 text-[#6d8d49]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#223021]">Tìm tổ chức để tham gia</h3>
            <p className="mt-1 text-sm leading-6 text-[#5d6c57]">
              Nếu tổ chức đang mở nhận yêu cầu gia nhập, bạn có thể gửi yêu cầu để owner hoặc admin xem xét.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên tổ chức"
            className="border-[#dfe5d6] bg-white"
          />
        </div>
      </div>

      {recentRequests.length > 0 ? (
        <div className="rounded-[28px] border border-[#e3eadc] bg-white/90 p-5 shadow-[0_16px_35px_-32px_rgba(98,115,88,0.34)]">
          <h3 className="text-lg font-semibold text-[#223021]">Yêu cầu đang chờ</h3>
          <div className="mt-4 space-y-3">
            {recentRequests.map((request) => {
              const isCancelling =
                cancelRequestMutation.isPending &&
                cancelRequestMutation.variables?.request_id === request.id;

              return (
                <div
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[#e6ebde] bg-[#fbfcf8] px-4 py-4"
                >
                  <div>
                    <p className="font-medium text-[#223021]">{request.to_chuc.ten}</p>
                    <p className="mt-1 text-sm text-[#67745f]">
                      Đã gửi vào {new Date(request.ngay_gui).toLocaleDateString('vi-VN')}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="border-[#e3e9db] bg-white text-[#5d6958] hover:bg-[#f6f8f1]"
                    disabled={isCancelling}
                    onClick={() => handleCancelRequest(request.id)}
                  >
                    {isCancelling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang rút
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Rút yêu cầu
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="rounded-[28px] border border-[#e3eadc] bg-white/90 p-5 shadow-[0_16px_35px_-32px_rgba(98,115,88,0.34)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[#223021]">Kết quả tìm kiếm</h3>
          <p className="text-sm text-[#66735f]">
            {pagination.total > 0 ? `${pagination.total} tổ chức phù hợp` : 'Chưa có kết quả phù hợp'}
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <div className="rounded-[22px] border border-[#e6ebde] bg-[#fbfcf8] px-4 py-6 text-sm text-[#6f7c69]">
              Đang tìm tổ chức...
            </div>
          ) : organizations.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[#dce4d3] bg-[#f8faf4] px-4 py-8 text-center text-sm text-[#72806c]">
              Chưa có tổ chức nào phù hợp với từ khóa này.
            </div>
          ) : (
            organizations.map((organization) => {
              const hasPendingRequest = pendingRequestIds.has(organization.id);

              return (
                <div
                  key={organization.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[#e6ebde] bg-[#fbfcf8] px-4 py-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#dce5d2] bg-white">
                      <Building2 className="h-5 w-5 text-[#6d8d49]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#223021]">{organization.ten}</p>
                      <p className="mt-1 text-sm leading-6 text-[#67745f]">
                        {organization.mo_ta || 'Chưa có mô tả ngắn.'}
                      </p>
                    </div>
                  </div>

                  <Button
                    className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
                    disabled={hasPendingRequest || createRequestMutation.isPending}
                    onClick={() => handleRequest(organization.id)}
                  >
                    {createRequestMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang gửi
                      </>
                    ) : hasPendingRequest ? (
                      'Đã gửi yêu cầu'
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Gửi yêu cầu
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {isFetching && !isLoading ? <p className="mt-3 text-xs text-[#6d7a66]">Đang tải dữ liệu trang mới...</p> : null}

        <Pagination
          currentPage={pagination.page}
          totalPages={Math.max(pagination.totalPages, 1)}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={setCurrentPage}
          className="mt-5"
        />
      </div>
    </div>
  );
}
