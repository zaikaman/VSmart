'use client';

import { useState } from 'react';
import { Clock3, Loader2, MailPlus, Search, UserPlus2, Users } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { OrganizationMember } from '@/app/api/organization-members/route';
import type { ProjectMember } from '@/app/api/project-members/route';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganization, useOrganizationInvitations, useOrganizationMembers } from '@/lib/hooks/use-organizations';
import { usePlanningWorkload } from '@/lib/hooks/use-planning';
import { usePresence } from '@/lib/providers/presence-provider';
import { getCapacityBadgeConfig } from '@/lib/utils/workload-utils';

interface ProjectMembersManagerProps {
  projectId: string;
  canManage?: boolean;
}

type ProjectInviteRole = 'member' | 'admin' | 'viewer';

type SelectedCandidate = {
  email: string;
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
  source: 'organization-member' | 'organization-invitation';
};

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((item) => item[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function normalizeText(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function buildMemberSubtitle(member: OrganizationMember) {
  const parts = [member.ten_phong_ban, member.vai_tro === 'owner' ? 'Chủ tổ chức' : null].filter(Boolean);
  return parts.length > 0 ? parts.join(' • ') : 'Đang sẵn sàng để thêm vào dự án';
}

export function ProjectMembersManager({ projectId, canManage = true }: ProjectMembersManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [role, setRole] = useState<ProjectInviteRole>('member');
  const [searchTerm, setSearchTerm] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<SelectedCandidate | null>(null);
  const queryClient = useQueryClient();
  const { data: organization } = useOrganization();
  const { data: organizationMembersResponse, isLoading: isOrganizationMembersLoading } = useOrganizationMembers();
  const { data: organizationInvitations = [], isLoading: isOrganizationInvitationsLoading } = useOrganizationInvitations();
  const { data: workloadResponse } = usePlanningWorkload({ projectId, enabled: !!projectId });
  const { isUserOnline, ready: presenceReady } = usePresence();
  const allowExternalProjectInvites = organization?.settings.allow_external_project_invites ?? false;

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/project-members?projectId=${projectId}`);
      if (!response.ok) throw new Error('Không thể tải danh sách thành viên');
      return response.json() as Promise<ProjectMember[]>;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const response = await fetch('/api/project-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ du_an_id: projectId, email: data.email, vai_tro: data.role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể mời thành viên');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      toast.success('Đã gửi lời mời thành công');
      setIsAddDialogOpen(false);
      setRole('member');
      setSearchTerm('');
      setManualEmail('');
      setSelectedCandidate(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(`/api/project-members?memberId=${memberId}`, { method: 'DELETE' });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể xóa thành viên');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      toast.success('Đã gỡ thành viên');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const workloadMap = new Map((workloadResponse?.members || []).map((member) => [member.userId, member]));
  const existingProjectEmails = new Set(members.map((member) => normalizeText(member.email)));
  const organizationMembers = organizationMembersResponse?.data || [];
  const organizationMemberEmails = new Set(organizationMembers.map((member) => normalizeText(member.email)));
  const normalizedSearch = normalizeText(searchTerm);

  const availableOrganizationMembers = organizationMembers.filter((member) => {
    if (existingProjectEmails.has(normalizeText(member.email))) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [member.ten, member.email, member.ten_phong_ban]
      .map((value) => normalizeText(value))
      .some((value) => value.includes(normalizedSearch));
  });

  const pendingOrganizationInvitations = organizationInvitations.filter((invitation) => {
    if (invitation.trang_thai !== 'pending') {
      return false;
    }

    const normalizedEmail = normalizeText(invitation.email);
    if (existingProjectEmails.has(normalizedEmail) || organizationMemberEmails.has(normalizedEmail)) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [invitation.email, invitation.nguoi_moi.ten].map((value) => normalizeText(value)).some((value) => value.includes(normalizedSearch));
  });

  const roleLabel = (value: string) =>
    ({ owner: 'Chủ sở hữu', admin: 'Quản trị viên', member: 'Thành viên', viewer: 'Người xem' }[value] || value);
  const membershipStatusLabel = (value: string) =>
    ({ active: 'Đã tham gia', pending: 'Chờ xác nhận', declined: 'Đã từ chối' }[value] || value);
  const roleClass = (value: string) =>
    ({ owner: 'bg-purple-100 text-purple-800', admin: 'bg-blue-100 text-blue-800', member: 'bg-green-100 text-green-800', viewer: 'bg-gray-100 text-gray-800' }[value] || 'bg-gray-100 text-gray-800');
  const membershipStatusClass = (value: string) =>
    ({ active: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', declined: 'bg-red-100 text-red-800' }[value] || 'bg-gray-100 text-gray-800');

  const handleInvite = (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error('Vui lòng chọn người cần mời hoặc nhập email');
      return;
    }

    inviteMutation.mutate({ email: normalizedEmail, role });
  };

  const isCandidateSelected = (email: string) => selectedCandidate?.email === email;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Thành viên dự án</h3>
        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);

            if (!open) {
              setSearchTerm('');
              setManualEmail('');
              setSelectedCandidate(null);
              setRole('member');
            }
          }}
        >
          <DialogTrigger asChild>
            <Button disabled={!canManage}>Mời thành viên</Button>
          </DialogTrigger>
          <DialogContent className="overflow-hidden border-[#dfe8d8] bg-[#fcfdf9] p-0 sm:max-w-[820px]">
            <div className="border-b border-[#e4eadf] bg-[linear-gradient(135deg,#f7faf3_0%,#eef5e7_100%)] px-6 py-5">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="text-xl text-[#223021]">Mời người vào dự án</DialogTitle>
                <DialogDescription className="max-w-2xl text-sm leading-6 text-[#62705b]">
                  Chọn nhanh người đang làm cùng trong tổ chức, hoặc nhập email nếu bạn muốn mời theo cách thủ công.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1.45fr)_280px]">
              <div className="space-y-4">
                <div className="rounded-[26px] border border-[#dfe8d8] bg-white p-4 shadow-[0_20px_45px_-38px_rgba(87,109,71,0.42)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dae5ce] bg-[#f5f9ee]">
                        <Users className="h-5 w-5 text-[#6b874d]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#223021]">Chọn từ tổ chức</p>
                        <p className="text-sm text-[#66745f]">
                          Danh sách này tự ẩn những người đã có trong dự án hoặc đã được mời trước đó.
                        </p>
                      </div>
                    </div>

                    <div className="w-full max-w-[280px]">
                      <Label htmlFor="project-member-search" className="sr-only">
                        Tìm thành viên
                      </Label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8973]" />
                        <Input
                          id="project-member-search"
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                          placeholder="Tìm theo tên, email, phòng ban"
                          className="border-[#dfe5d6] bg-[#fbfcf8] pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7e8b77]">Người trong tổ chức</p>
                        <Badge className="border border-[#dbe6cf] bg-[#f3f8eb] text-[#4d604a]">
                          {availableOrganizationMembers.length} người phù hợp
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {isOrganizationMembersLoading ? (
                          <div className="rounded-[22px] border border-[#e5ebde] bg-[#fbfcf8] px-4 py-6 text-sm text-[#6f7c69]">
                            Đang tải danh sách trong tổ chức...
                          </div>
                        ) : availableOrganizationMembers.length === 0 ? (
                          <div className="rounded-[22px] border border-dashed border-[#dce4d3] bg-[#f8faf4] px-4 py-8 text-center text-sm text-[#72806c]">
                            {normalizedSearch
                              ? 'Không thấy ai khớp với từ khóa này.'
                              : 'Hiện chưa còn ai trong tổ chức để mời vào dự án.'}
                          </div>
                        ) : (
                          availableOrganizationMembers.map((member) => (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() =>
                                setSelectedCandidate({
                                  email: member.email,
                                  title: member.ten,
                                  subtitle: buildMemberSubtitle(member),
                                  avatarUrl: member.avatar_url,
                                  source: 'organization-member',
                                })
                              }
                              className={`flex w-full items-center justify-between gap-3 rounded-[22px] border px-4 py-3 text-left transition ${
                                isCandidateSelected(member.email)
                                  ? 'border-[#9fbb7e] bg-[#f3f8eb] shadow-[0_16px_30px_-28px_rgba(109,141,73,0.7)]'
                                  : 'border-[#e5ebde] bg-[#fbfcf8] hover:border-[#cfdcc0] hover:bg-[#f7faf2]'
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar className="h-11 w-11 border border-[#dfe5d6]">
                                  <AvatarImage src={member.avatar_url || undefined} />
                                  <AvatarFallback>{getInitials(member.ten || member.email)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-[#223021]">{member.ten}</p>
                                  <p className="truncate text-sm text-[#66745f]">{member.email}</p>
                                  <p className="truncate text-xs uppercase tracking-[0.12em] text-[#8a9683]">
                                    {buildMemberSubtitle(member)}
                                  </p>
                                </div>
                              </div>

                              <Badge className="border border-[#dce8d0] bg-white text-[#51624f]">
                                {isCandidateSelected(member.email) ? 'Đã chọn' : 'Chọn nhanh'}
                              </Badge>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7e8b77]">Đang chờ vào tổ chức</p>
                        <Badge className="border border-[#e4e7cf] bg-[#faf8eb] text-[#726d42]">
                          {pendingOrganizationInvitations.length} email
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {isOrganizationInvitationsLoading ? (
                          <div className="rounded-[22px] border border-[#e5ebde] bg-[#fbfcf8] px-4 py-6 text-sm text-[#6f7c69]">
                            Đang tải lời mời tổ chức...
                          </div>
                        ) : pendingOrganizationInvitations.length === 0 ? (
                          <div className="rounded-[22px] border border-dashed border-[#e4e7d7] bg-[#fbfbf6] px-4 py-6 text-sm text-[#7c8374]">
                            Không có email nào đang chờ tham gia tổ chức.
                          </div>
                        ) : (
                          pendingOrganizationInvitations.map((invitation) => (
                            <button
                              key={invitation.id}
                              type="button"
                              onClick={() =>
                                setSelectedCandidate({
                                  email: invitation.email,
                                  title: invitation.email,
                                  subtitle: `Đã được ${invitation.nguoi_moi.ten} mời vào tổ chức`,
                                  source: 'organization-invitation',
                                })
                              }
                              className={`flex w-full items-center justify-between gap-3 rounded-[22px] border px-4 py-3 text-left transition ${
                                isCandidateSelected(invitation.email)
                                  ? 'border-[#d2c56b] bg-[#fbf7de] shadow-[0_16px_30px_-28px_rgba(171,150,53,0.7)]'
                                  : 'border-[#ebe7cf] bg-[#fffdf4] hover:border-[#ddd7b8] hover:bg-[#fcfaef]'
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-[#3c3a22]">{invitation.email}</p>
                                <p className="mt-1 truncate text-sm text-[#6f6b46]">
                                  {invitation.nguoi_moi.ten} đã gửi lời mời vào tổ chức
                                </p>
                                <div className="mt-2 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[#948d63]">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {new Date(invitation.ngay_moi).toLocaleDateString('vi-VN')}
                                </div>
                              </div>

                              <Badge className="border border-[#e0d7a7] bg-white text-[#74692e]">
                                {isCandidateSelected(invitation.email) ? 'Đã chọn' : 'Chọn nhanh'}
                              </Badge>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[26px] border border-[#dfe8d8] bg-white p-4 shadow-[0_20px_45px_-38px_rgba(87,109,71,0.42)]">
                  <Label htmlFor="project-member-role" className="text-sm text-[#4d5d49]">
                    Vai trò trong dự án
                  </Label>
                  <Select value={role} onValueChange={(value) => setRole(value as ProjectInviteRole)}>
                    <SelectTrigger id="project-member-role" className="mt-2 border-[#dfe5d6] bg-[#fbfcf8]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Người xem</SelectItem>
                      <SelectItem value="member">Thành viên</SelectItem>
                      <SelectItem value="admin">Quản trị viên</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="mt-4 rounded-[22px] border border-[#e7ecdf] bg-[#f8faf5] px-4 py-3 text-sm leading-6 text-[#62705b]">
                    {allowExternalProjectInvites
                      ? 'Bạn có thể chọn người trong tổ chức hoặc mời thêm cộng tác viên bằng email.'
                      : 'Dự án này đang ưu tiên cộng tác nội bộ. Email bên ngoài chỉ dùng được khi đã có lời mời vào tổ chức hoặc khi cài đặt cho phép.'}
                  </div>
                </div>

                <div className="rounded-[26px] border border-[#dfe8d8] bg-white p-4 shadow-[0_20px_45px_-38px_rgba(87,109,71,0.42)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dae5ce] bg-[#f5f9ee]">
                      <UserPlus2 className="h-5 w-5 text-[#6b874d]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#223021]">Người được chọn</p>
                      <p className="text-sm text-[#67745f]">Mời ngay sau khi chọn xong vai trò phù hợp.</p>
                    </div>
                  </div>

                  {selectedCandidate ? (
                    <div className="mt-4 rounded-[22px] border border-[#dce6d0] bg-[#f7faf2] p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border border-[#dfe5d6]">
                          <AvatarImage src={selectedCandidate.avatarUrl || undefined} />
                          <AvatarFallback>{getInitials(selectedCandidate.title || selectedCandidate.email)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[#223021]">{selectedCandidate.title}</p>
                          <p className="truncate text-sm text-[#66745f]">{selectedCandidate.email}</p>
                          <p className="text-xs uppercase tracking-[0.12em] text-[#88947f]">{selectedCandidate.subtitle}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge className="border border-[#dbe6cf] bg-white text-[#52634f]">
                          {selectedCandidate.source === 'organization-member' ? 'Trong tổ chức' : 'Đang chờ vào tổ chức'}
                        </Badge>
                        <Badge className="border border-[#dbe6cf] bg-white text-[#52634f]">{roleLabel(role)}</Badge>
                      </div>

                      <Button
                        className="mt-4 w-full border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
                        onClick={() => handleInvite(selectedCandidate.email)}
                        disabled={inviteMutation.isPending}
                      >
                        {inviteMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang gửi lời mời
                          </>
                        ) : (
                          <>
                            <UserPlus2 className="mr-2 h-4 w-4" />
                            Mời người đã chọn
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[22px] border border-dashed border-[#dce4d3] bg-[#f8faf4] px-4 py-8 text-center text-sm text-[#72806c]">
                      Chọn một người ở cột bên trái để gửi lời mời nhanh hơn.
                    </div>
                  )}
                </div>

                <div className="rounded-[26px] border border-[#dfe8d8] bg-white p-4 shadow-[0_20px_45px_-38px_rgba(87,109,71,0.42)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dae5ce] bg-[#f5f9ee]">
                      <MailPlus className="h-5 w-5 text-[#6b874d]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#223021]">Nhập nhanh bằng email</p>
                      <p className="text-sm text-[#67745f]">Dùng khi bạn muốn dán sẵn email thay vì tìm trong danh sách.</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="project-member-email" className="text-sm text-[#4d5d49]">
                      Email
                    </Label>
                    <Input
                      id="project-member-email"
                      type="email"
                      value={manualEmail}
                      onChange={(event) => setManualEmail(event.target.value)}
                      placeholder={allowExternalProjectInvites ? 'ten@doitac.com' : 'ten@congtyban.com'}
                      className="mt-2 border-[#dfe5d6] bg-[#fbfcf8]"
                    />
                    <p className="mt-2 text-sm leading-6 text-[#66745f]">
                      {allowExternalProjectInvites
                        ? 'Bạn có thể mời cả email ngoài tổ chức nếu cần phối hợp với đối tác.'
                        : 'Nếu email này chưa thuộc tổ chức, hệ thống chỉ nhận khi người đó đã có lời mời vào tổ chức.'}
                    </p>
                  </div>

                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    onClick={() => handleInvite(manualEmail)}
                    disabled={inviteMutation.isPending || !manualEmail.trim()}
                  >
                    {inviteMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang gửi lời mời
                      </>
                    ) : (
                      <>
                        <MailPlus className="mr-2 h-4 w-4" />
                        Mời bằng email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!canManage ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Bạn đang ở chế độ xem. Các thao tác mời hoặc gỡ thành viên đã được ẩn theo quyền hiện tại.
        </div>
      ) : null}

      {isLoading ? (
        <div className="py-8 text-center text-gray-500">Đang tải...</div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-slate-500">
          Chưa có thành viên nào. Hãy mời người khác tham gia dự án.
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const workload = member.nguoi_dung?.id ? workloadMap.get(member.nguoi_dung.id) : undefined;
            const capacity = workload ? getCapacityBadgeConfig(workload.loadStatus) : null;
            const isOnline = member.nguoi_dung?.id ? isUserOnline(member.nguoi_dung.id) : false;
            const showPresence = Boolean(member.nguoi_dung?.id) && member.trang_thai === 'active';

            return (
              <div key={member.id} className="flex items-center justify-between rounded-2xl border border-[#e7ebdf] p-3 hover:bg-slate-50">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={member.nguoi_dung?.avatar_url || undefined} />
                    <AvatarFallback>{member.nguoi_dung?.ten?.[0] || member.email[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-slate-900">{member.nguoi_dung?.ten || member.email}</div>
                    <div className="text-sm text-slate-500">{member.email}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Badge className={roleClass(member.vai_tro)}>{roleLabel(member.vai_tro)}</Badge>
                  <Badge className={membershipStatusClass(member.trang_thai)}>{membershipStatusLabel(member.trang_thai)}</Badge>
                  {showPresence ? (
                    <Badge className={isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}>
                      {presenceReady ? (isOnline ? 'Đang online' : 'Đang offline') : 'Đang kiểm tra'}
                    </Badge>
                  ) : null}
                  {workload && capacity ? <Badge className={capacity.className}>{capacity.label} · {workload.activeTasks}</Badge> : null}
                  {member.vai_tro !== 'owner' && canManage ? (
                    <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(member.id)} disabled={removeMutation.isPending}>
                      Gỡ
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
