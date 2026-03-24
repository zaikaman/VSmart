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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import {
  useOrganization,
  useOrganizationInvitations,
  useOrganizationMembers,
} from '@/lib/hooks/use-organizations';
import { usePlanningWorkload } from '@/lib/hooks/use-planning';
import { usePresence } from '@/lib/providers/presence-provider';
import { getCapacityBadgeConfig } from '@/lib/utils/workload-utils';

interface ProjectMembersManagerProps {
  projectId: string;
  canManage?: boolean;
}

type ProjectRole = ProjectMember['vai_tro'];
type AssignableRole = Exclude<ProjectRole, 'owner'>;
type Candidate = {
  email: string;
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
  source: 'organization-member' | 'organization-invitation';
};

const ROLE_OPTIONS: Array<{ value: AssignableRole; label: string }> = [
  { value: 'viewer', label: 'Người xem' },
  { value: 'member', label: 'Thành viên' },
  { value: 'admin', label: 'Quản trị viên' },
];

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
  return parts.length > 0 ? parts.join(' • ') : 'Sẵn sàng thêm vào dự án';
}

const roleLabel = (value: string) =>
  ({ owner: 'Chủ sở hữu', admin: 'Quản trị viên', member: 'Thành viên', viewer: 'Người xem' }[value] || value);
const roleClass = (value: string) =>
  ({ owner: 'bg-purple-100 text-purple-800', admin: 'bg-blue-100 text-blue-800', member: 'bg-green-100 text-green-800', viewer: 'bg-gray-100 text-gray-800' }[value] || 'bg-gray-100 text-gray-800');
const statusLabel = (value: string) =>
  ({ active: 'Đã tham gia', pending: 'Chờ xác nhận', declined: 'Đã từ chối' }[value] || value);
const statusClass = (value: string) =>
  ({ active: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', declined: 'bg-red-100 text-red-800' }[value] || 'bg-gray-100 text-gray-800');

export function ProjectMembersManager({ projectId, canManage = true }: ProjectMembersManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AssignableRole>('member');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [draftRoles, setDraftRoles] = useState<Record<string, AssignableRole>>({});

  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: organization } = useOrganization();
  const { data: orgMembersResponse, isLoading: isOrgMembersLoading } = useOrganizationMembers();
  const { data: orgInvitations = [], isLoading: isOrgInvitationsLoading } = useOrganizationInvitations();
  const { data: workloadResponse } = usePlanningWorkload({ projectId, enabled: !!projectId });
  const { isUserOnline, ready: presenceReady } = usePresence();

  const allowExternalProjectInvites = organization?.settings.allow_external_project_invites ?? false;
  const organizationMembers = orgMembersResponse?.data || [];

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/project-members?projectId=${projectId}`);
      if (!response.ok) throw new Error('Không thể tải danh sách thành viên');
      return response.json() as Promise<ProjectMember[]>;
    },
    enabled: !!projectId,
  });

  const inviteMutation = useMutation({
    mutationFn: async (payload: { email: string; vai_tro: AssignableRole }) => {
      const response = await fetch('/api/project-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ du_an_id: projectId, ...payload }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}) as { error?: string });
        throw new Error(error.error || 'Không thể mời thành viên');
      }
      return response.json() as Promise<ProjectMember>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      toast.success('Đã gửi lời mời');
      setIsAddDialogOpen(false);
      setSearchTerm('');
      setManualEmail('');
      setInviteRole('member');
      setSelectedCandidate(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (payload: { member_id: string; vai_tro: AssignableRole }) => {
      const response = await fetch('/api/project-members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}) as { error?: string });
        throw new Error(error.error || 'Không thể cập nhật vai trò');
      }
      return response.json() as Promise<ProjectMember>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(`/api/project-members?memberId=${memberId}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}) as { error?: string });
        throw new Error(error.error || 'Không thể gỡ thành viên');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      toast.success('Đã gỡ thành viên khỏi dự án');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const workloadMap = new Map((workloadResponse?.members || []).map((item) => [item.userId, item]));
  const existingEmails = new Set(members.map((member) => normalizeText(member.email)));
  const orgMemberEmails = new Set(organizationMembers.map((member) => normalizeText(member.email)));
  const keyword = normalizeText(searchTerm);

  const availableOrganizationMembers = organizationMembers.filter((member) => {
    if (existingEmails.has(normalizeText(member.email))) return false;
    if (!keyword) return true;
    return [member.ten, member.email, member.ten_phong_ban]
      .map((value) => normalizeText(value))
      .some((value) => value.includes(keyword));
  });

  const pendingOrganizationInvitations = orgInvitations.filter((invitation) => {
    const email = normalizeText(invitation.email);
    if (invitation.trang_thai !== 'pending') return false;
    if (existingEmails.has(email) || orgMemberEmails.has(email)) return false;
    if (!keyword) return true;
    return [invitation.email, invitation.nguoi_moi.ten]
      .map((value) => normalizeText(value))
      .some((value) => value.includes(keyword));
  });

  const handleInvite = (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error('Vui lòng chọn người cần mời hoặc nhập email');
      return;
    }
    inviteMutation.mutate({ email: normalizedEmail, vai_tro: inviteRole });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Thành viên dự án</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setSearchTerm('');
            setManualEmail('');
            setInviteRole('member');
            setSelectedCandidate(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button disabled={!canManage}>Mời thành viên</Button>
          </DialogTrigger>
          <DialogContent className="overflow-hidden border-[#dfe8d8] bg-[#fcfdf9] p-0 sm:max-w-[820px]">
            <div className="border-b border-[#e4eadf] bg-[linear-gradient(135deg,#f7faf3_0%,#eef5e7_100%)] px-6 py-5">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="text-xl text-[#223021]">Mời người vào dự án</DialogTitle>
                <DialogDescription className="max-w-2xl text-sm leading-6 text-[#62705b]">
                  Chọn nhanh trong tổ chức hoặc nhập email nếu bạn muốn mời thủ công.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1.45fr)_280px]">
              <div className="space-y-4 rounded-[26px] border border-[#dfe8d8] bg-white p-4 shadow-[0_20px_45px_-38px_rgba(87,109,71,0.42)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dae5ce] bg-[#f5f9ee]">
                      <Users className="h-5 w-5 text-[#6b874d]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#223021]">Chọn từ tổ chức</p>
                      <p className="text-sm text-[#66745f]">Những người đã ở trong dự án sẽ tự ẩn khỏi danh sách này.</p>
                    </div>
                  </div>
                  <div className="relative w-full max-w-[280px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8973]" />
                    <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm theo tên, email, phòng ban" className="border-[#dfe5d6] bg-[#fbfcf8] pl-9" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7e8b77]">Người trong tổ chức</p>
                    <Badge className="border border-[#dbe6cf] bg-[#f3f8eb] text-[#4d604a]">{availableOrganizationMembers.length} người</Badge>
                  </div>
                  {isOrgMembersLoading ? <div className="rounded-[22px] border border-[#e5ebde] bg-[#fbfcf8] px-4 py-6 text-sm text-[#6f7c69]">Đang tải danh sách trong tổ chức...</div> : availableOrganizationMembers.length === 0 ? <div className="rounded-[22px] border border-dashed border-[#dce4d3] bg-[#f8faf4] px-4 py-8 text-center text-sm text-[#72806c]">{keyword ? 'Không thấy ai khớp với từ khóa này.' : 'Hiện chưa còn ai trong tổ chức để mời vào dự án.'}</div> : availableOrganizationMembers.map((member) => (
                    <button key={member.id} type="button" onClick={() => setSelectedCandidate({ email: member.email, title: member.ten, subtitle: buildMemberSubtitle(member), avatarUrl: member.avatar_url, source: 'organization-member' })} className={`flex w-full items-center justify-between gap-3 rounded-[22px] border px-4 py-3 text-left transition ${selectedCandidate?.email === member.email ? 'border-[#9fbb7e] bg-[#f3f8eb] shadow-[0_16px_30px_-28px_rgba(109,141,73,0.7)]' : 'border-[#e5ebde] bg-[#fbfcf8] hover:border-[#cfdcc0] hover:bg-[#f7faf2]'}`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-11 w-11 border border-[#dfe5d6]"><AvatarImage src={member.avatar_url || undefined} /><AvatarFallback>{getInitials(member.ten || member.email)}</AvatarFallback></Avatar>
                        <div className="min-w-0"><p className="truncate font-medium text-[#223021]">{member.ten}</p><p className="truncate text-sm text-[#66745f]">{member.email}</p><p className="truncate text-xs uppercase tracking-[0.12em] text-[#8a9683]">{buildMemberSubtitle(member)}</p></div>
                      </div>
                      <Badge className="border border-[#dce8d0] bg-white text-[#51624f]">{selectedCandidate?.email === member.email ? 'Đã chọn' : 'Chọn nhanh'}</Badge>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7e8b77]">Đang chờ vào tổ chức</p>
                    <Badge className="border border-[#e4e7cf] bg-[#faf8eb] text-[#726d42]">{pendingOrganizationInvitations.length} email</Badge>
                  </div>
                  {isOrgInvitationsLoading ? <div className="rounded-[22px] border border-[#e5ebde] bg-[#fbfcf8] px-4 py-6 text-sm text-[#6f7c69]">Đang tải lời mời tổ chức...</div> : pendingOrganizationInvitations.length === 0 ? <div className="rounded-[22px] border border-dashed border-[#e4e7d7] bg-[#fbfbf6] px-4 py-6 text-sm text-[#7c8374]">Không có email nào đang chờ tham gia tổ chức.</div> : pendingOrganizationInvitations.map((invitation) => (
                    <button key={invitation.id} type="button" onClick={() => setSelectedCandidate({ email: invitation.email, title: invitation.email, subtitle: `Đã được ${invitation.nguoi_moi.ten} mời vào tổ chức`, source: 'organization-invitation' })} className={`flex w-full items-center justify-between gap-3 rounded-[22px] border px-4 py-3 text-left transition ${selectedCandidate?.email === invitation.email ? 'border-[#d2c56b] bg-[#fbf7de] shadow-[0_16px_30px_-28px_rgba(171,150,53,0.7)]' : 'border-[#ebe7cf] bg-[#fffdf4] hover:border-[#ddd7b8] hover:bg-[#fcfaef]'}`}>
                      <div className="min-w-0"><p className="truncate font-medium text-[#3c3a22]">{invitation.email}</p><p className="mt-1 truncate text-sm text-[#6f6b46]">{invitation.nguoi_moi.ten} đã gửi lời mời vào tổ chức</p><div className="mt-2 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[#948d63]"><Clock3 className="h-3.5 w-3.5" />{new Date(invitation.ngay_moi).toLocaleDateString('vi-VN')}</div></div>
                      <Badge className="border border-[#e0d7a7] bg-white text-[#74692e]">{selectedCandidate?.email === invitation.email ? 'Đã chọn' : 'Chọn nhanh'}</Badge>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[26px] border border-[#dfe8d8] bg-white p-4 shadow-[0_20px_45px_-38px_rgba(87,109,71,0.42)]">
                  <Label htmlFor="project-member-role" className="text-sm text-[#4d5d49]">Vai trò trong dự án</Label>
                  <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as AssignableRole)}>
                    <SelectTrigger id="project-member-role" className="mt-2 border-[#dfe5d6] bg-[#fbfcf8]"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="mt-4 rounded-[22px] border border-[#e7ecdf] bg-[#f8faf5] px-4 py-3 text-sm leading-6 text-[#62705b]">{allowExternalProjectInvites ? 'Bạn có thể chọn người trong tổ chức hoặc mời thêm cộng tác viên bằng email.' : 'Dự án này đang ưu tiên cộng tác nội bộ. Email bên ngoài chỉ dùng được khi đã có lời mời vào tổ chức hoặc khi cài đặt cho phép.'}</div>
                </div>

                <div className="rounded-[26px] border border-[#dfe8d8] bg-white p-4 shadow-[0_20px_45px_-38px_rgba(87,109,71,0.42)]">
                  <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dae5ce] bg-[#f5f9ee]"><UserPlus2 className="h-5 w-5 text-[#6b874d]" /></div><div><p className="font-semibold text-[#223021]">Người được chọn</p><p className="text-sm text-[#67745f]">Chọn xong vai trò là có thể mời ngay.</p></div></div>
                  {selectedCandidate ? <div className="mt-4 rounded-[22px] border border-[#dce6d0] bg-[#f7faf2] p-4"><div className="flex items-center gap-3"><Avatar className="h-12 w-12 border border-[#dfe5d6]"><AvatarImage src={selectedCandidate.avatarUrl || undefined} /><AvatarFallback>{getInitials(selectedCandidate.title || selectedCandidate.email)}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate font-medium text-[#223021]">{selectedCandidate.title}</p><p className="truncate text-sm text-[#66745f]">{selectedCandidate.email}</p><p className="text-xs uppercase tracking-[0.12em] text-[#88947f]">{selectedCandidate.subtitle}</p></div></div><div className="mt-3 flex flex-wrap items-center gap-2"><Badge className="border border-[#dbe6cf] bg-white text-[#52634f]">{selectedCandidate.source === 'organization-member' ? 'Trong tổ chức' : 'Đang chờ vào tổ chức'}</Badge><Badge className="border border-[#dbe6cf] bg-white text-[#52634f]">{roleLabel(inviteRole)}</Badge></div><Button className="mt-4 w-full border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]" onClick={() => handleInvite(selectedCandidate.email)} disabled={inviteMutation.isPending}>{inviteMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang gửi lời mời</> : <><UserPlus2 className="mr-2 h-4 w-4" />Mời người đã chọn</>}</Button></div> : <div className="mt-4 rounded-[22px] border border-dashed border-[#dce4d3] bg-[#f8faf4] px-4 py-8 text-center text-sm text-[#72806c]">Chọn một người ở cột bên trái để mời nhanh hơn.</div>}
                </div>

                <div className="rounded-[26px] border border-[#dfe8d8] bg-white p-4 shadow-[0_20px_45px_-38px_rgba(87,109,71,0.42)]">
                  <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dae5ce] bg-[#f5f9ee]"><MailPlus className="h-5 w-5 text-[#6b874d]" /></div><div><p className="font-semibold text-[#223021]">Nhập nhanh bằng email</p><p className="text-sm text-[#67745f]">Dùng khi bạn đã có sẵn email người cần mời.</p></div></div>
                  <div className="mt-4"><Label htmlFor="project-member-email" className="text-sm text-[#4d5d49]">Email</Label><Input id="project-member-email" type="email" value={manualEmail} onChange={(event) => setManualEmail(event.target.value)} placeholder={allowExternalProjectInvites ? 'ten@doitac.com' : 'ten@congtyban.com'} className="mt-2 border-[#dfe5d6] bg-[#fbfcf8]" /><p className="mt-2 text-sm leading-6 text-[#66745f]">{allowExternalProjectInvites ? 'Bạn có thể mời cả email ngoài tổ chức nếu cần phối hợp với đối tác.' : 'Nếu email này chưa thuộc tổ chức, hệ thống chỉ nhận khi người đó đã có lời mời vào tổ chức.'}</p></div>
                  <Button className="mt-4 w-full" variant="outline" onClick={() => handleInvite(manualEmail)} disabled={inviteMutation.isPending || !manualEmail.trim()}>{inviteMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang gửi lời mời</> : <><MailPlus className="mr-2 h-4 w-4" />Mời bằng email</>}</Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!canManage ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">Bạn đang ở chế độ xem. Các thao tác mời, đổi vai trò hoặc gỡ thành viên được ẩn theo quyền hiện tại.</div> : <div className="rounded-[22px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] px-4 py-3 text-sm text-[#556352]">Bạn có thể đổi vai trò ngay trên từng thành viên. Quyền owner được giữ cố định để tránh khóa nhầm quyền quản lý dự án.</div>}

      {isLoading ? <div className="py-8 text-center text-gray-500">Đang tải...</div> : members.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-slate-500">Chưa có thành viên nào. Hãy mời người khác tham gia dự án.</div> : <div className="space-y-2">{members.map((member) => {
        const workload = member.nguoi_dung?.id ? workloadMap.get(member.nguoi_dung.id) : undefined;
        const capacity = workload ? getCapacityBadgeConfig(workload.loadStatus) : null;
        const showPresence = Boolean(member.nguoi_dung?.id) && member.trang_thai === 'active';
        const isOnline = member.nguoi_dung?.id ? isUserOnline(member.nguoi_dung.id) : false;
        const isOwner = member.vai_tro === 'owner';
        const isSelf = normalizeText(currentUser?.email) === normalizeText(member.email);
        const selectedRole = isOwner ? member.vai_tro : draftRoles[member.id] || member.vai_tro;
        const canEditRole = canManage && !isOwner && !isSelf;
        const roleChanged = !isOwner && selectedRole !== member.vai_tro;
        const isUpdatingRole = updateRoleMutation.isPending && updateRoleMutation.variables?.member_id === member.id;
        const helperText = isOwner ? 'Chủ sở hữu đang giữ quyền cao nhất của dự án.' : isSelf ? 'Bạn không đổi vai trò của chính mình ở đây.' : member.trang_thai === 'pending' ? 'Vai trò mới sẽ áp dụng ngay trên lời mời đang chờ.' : 'Cập nhật để điều chỉnh phạm vi thao tác trong dự án.';

        return <div key={member.id} className="grid gap-4 rounded-[24px] border border-[#e3eadc] bg-white px-4 py-4 shadow-[0_16px_35px_-32px_rgba(98,115,88,0.34)] md:grid-cols-[minmax(0,1.2fr)_220px_140px]">
          <div className="min-w-0"><div className="flex items-start gap-3"><Avatar className="border border-[#dfe5d6]"><AvatarImage src={member.nguoi_dung?.avatar_url || undefined} /><AvatarFallback>{member.nguoi_dung?.ten?.[0] || member.email[0].toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><div className="font-medium text-slate-900">{member.nguoi_dung?.ten || member.email}</div><div className="truncate text-sm text-slate-500">{member.email}</div><div className="mt-3 flex flex-wrap items-center gap-2"><Badge className={roleClass(member.vai_tro)}>{roleLabel(member.vai_tro)}</Badge><Badge className={statusClass(member.trang_thai)}>{statusLabel(member.trang_thai)}</Badge>{showPresence ? <Badge className={isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}>{presenceReady ? (isOnline ? 'Đang online' : 'Đang offline') : 'Đang kiểm tra'}</Badge> : null}{workload && capacity ? <Badge className={capacity.className}>{capacity.label} · {workload.activeTasks}</Badge> : null}</div></div></div></div>

          <div className="space-y-2"><Label htmlFor={`project-role-${member.id}`} className="text-sm text-[#4d5d49]">Vai trò</Label><Select value={selectedRole} onValueChange={(value) => setDraftRoles((current) => ({ ...current, [member.id]: value as AssignableRole }))} disabled={!canEditRole || isUpdatingRole}><SelectTrigger id={`project-role-${member.id}`} className="border-[#dfe5d6] bg-[#fbfcf8]"><SelectValue /></SelectTrigger><SelectContent>{ROLE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><p className="text-xs leading-5 text-[#74806f]">{helperText}</p></div>

          <div className="flex flex-col items-start justify-between gap-3 md:items-end">
            {canEditRole ? <Button className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]" disabled={!roleChanged || isUpdatingRole} onClick={() => updateRoleMutation.mutate({ member_id: member.id, vai_tro: selectedRole as AssignableRole }, { onSuccess: () => { toast.success(`Đã cập nhật vai trò cho ${member.nguoi_dung?.ten || member.email}`); setDraftRoles((current) => { const next = { ...current }; delete next[member.id]; return next; }); }, onError: (error: Error) => toast.error(error.message) })}>{isUpdatingRole ? 'Đang lưu...' : 'Lưu vai trò'}</Button> : <div className="rounded-full border border-[#e3e8dc] bg-[#f8faf5] px-3 py-1 text-xs font-medium text-[#71806f]">{isOwner ? 'Vai trò cố định' : isSelf ? 'Chính bạn' : 'Chỉ xem'}</div>}
            {member.vai_tro !== 'owner' && canManage ? <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(member.id)} disabled={removeMutation.isPending || isUpdatingRole}>Gỡ</Button> : null}
          </div>
        </div>;
      })}</div>}
    </div>
  );
}
