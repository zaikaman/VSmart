'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProjectMember } from '@/app/api/project-members/route';
import { useOrganization } from '@/lib/hooks/use-organizations';
import { usePlanningWorkload } from '@/lib/hooks/use-planning';
import { getCapacityBadgeConfig } from '@/lib/utils/workload-utils';

interface ProjectMembersManagerProps {
  projectId: string;
  canManage?: boolean;
}

export function ProjectMembersManager({ projectId, canManage = true }: ProjectMembersManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin' | 'viewer'>('member');
  const queryClient = useQueryClient();
  const { data: organization } = useOrganization();
  const { data: workloadResponse } = usePlanningWorkload({ projectId, enabled: !!projectId });
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
      setEmail('');
      setRole('member');
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

  const roleLabel = (value: string) =>
    ({ owner: 'Chủ sở hữu', admin: 'Quản trị viên', member: 'Thành viên', viewer: 'Người xem' }[value] || value);
  const statusLabel = (value: string) =>
    ({ active: 'Đang hoạt động', pending: 'Chờ xác nhận', declined: 'Đã từ chối' }[value] || value);
  const roleClass = (value: string) =>
    ({ owner: 'bg-purple-100 text-purple-800', admin: 'bg-blue-100 text-blue-800', member: 'bg-green-100 text-green-800', viewer: 'bg-gray-100 text-gray-800' }[value] || 'bg-gray-100 text-gray-800');
  const statusClass = (value: string) =>
    ({ active: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', declined: 'bg-red-100 text-red-800' }[value] || 'bg-gray-100 text-gray-800');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Thành viên dự án</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!canManage}>Mời thành viên</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mời thành viên mới</DialogTitle>
              <DialogDescription>
                Nhập email và chọn vai trò phù hợp cho người được mời.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-2xl border border-[#e7ebdf] bg-[#f7faf2] px-4 py-3 text-sm text-[#60705b]">
              {allowExternalProjectInvites
                ? 'Tổ chức của bạn đang cho phép cộng tác với email ngoài tổ chức.'
                : 'Hiện chỉ email thuộc cùng tổ chức mới có thể được mời vào dự án.'}
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={allowExternalProjectInvites ? 'ten@doitac.com' : 'ten@congtyban.com'}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="role">Vai trò</Label>
                <Select value={role} onValueChange={(value) => setRole(value as 'member' | 'admin' | 'viewer')}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Người xem</SelectItem>
                    <SelectItem value="member">Thành viên</SelectItem>
                    <SelectItem value="admin">Quản trị viên</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={inviteMutation.isPending}>
                  Hủy
                </Button>
                <Button
                  onClick={() => {
                    if (!email.trim()) {
                      toast.error('Vui lòng nhập email');
                      return;
                    }
                    inviteMutation.mutate({ email, role });
                  }}
                  disabled={inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? 'Đang gửi...' : 'Gửi lời mời'}
                </Button>
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
                  <Badge className={statusClass(member.trang_thai)}>{statusLabel(member.trang_thai)}</Badge>
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
