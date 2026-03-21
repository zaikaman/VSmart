'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
import type { ProjectMember } from '@/app/api/project-members/route';
import { usePlanningWorkload } from '@/lib/hooks/use-planning';
import { getCapacityBadgeConfig } from '@/lib/utils/workload-utils';

interface ProjectMembersManagerProps {
  projectId: string;
}

export function ProjectMembersManager({ projectId }: ProjectMembersManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin' | 'viewer'>('member');
  const queryClient = useQueryClient();
  const { data: workloadResponse } = usePlanningWorkload({
    projectId,
    enabled: !!projectId,
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/project-members?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error('Không thể tải danh sách thành viên');
      }

      return response.json() as Promise<ProjectMember[]>;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const response = await fetch('/api/project-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          du_an_id: projectId,
          email: data.email,
          vai_tro: data.role,
        }),
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
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(`/api/project-members?memberId=${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể xóa thành viên');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      toast.success('Đã xóa thành viên');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleInvite = () => {
    if (!email.trim()) {
      toast.error('Vui lòng nhập email');
      return;
    }

    inviteMutation.mutate({ email, role });
  };

  const getRoleBadgeColor = (currentRole: string) => {
    switch (currentRole) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (currentRole: string) => {
    switch (currentRole) {
      case 'owner':
        return 'Chủ sở hữu';
      case 'admin':
        return 'Quản trị viên';
      case 'member':
        return 'Thành viên';
      case 'viewer':
        return 'Người xem';
      default:
        return currentRole;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Đang hoạt động';
      case 'pending':
        return 'Chờ xác nhận';
      case 'declined':
        return 'Đã từ chối';
      default:
        return status;
    }
  };

  const workloadMap = new Map(
    (workloadResponse?.members || []).map((member) => [member.userId, member])
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Thành viên dự án</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>Mời thành viên</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mời thành viên mới</DialogTitle>
              <DialogDescription>
                Nhập email của người bạn muốn mời vào dự án.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@company.com"
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

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={inviteMutation.isPending}
                >
                  Hủy
                </Button>
                <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? 'Đang gửi...' : 'Gửi lời mời'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-gray-500">Đang tải...</div>
      ) : members.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          Chưa có thành viên nào. Hãy mời người khác tham gia dự án.
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const workload =
              member.nguoi_dung?.id ? workloadMap.get(member.nguoi_dung.id) : undefined;
            const capacity = workload ? getCapacityBadgeConfig(workload.loadStatus) : null;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={member.nguoi_dung?.avatar_url || undefined} />
                    <AvatarFallback>
                      {member.nguoi_dung?.ten?.[0] || member.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{member.nguoi_dung?.ten || member.email}</div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge className={getRoleBadgeColor(member.vai_tro)}>
                    {getRoleLabel(member.vai_tro)}
                  </Badge>
                  <Badge className={getStatusBadgeColor(member.trang_thai)}>
                    {getStatusLabel(member.trang_thai)}
                  </Badge>
                  {workload && capacity && (
                    <Badge className={capacity.className}>
                      {capacity.label} · {workload.activeTasks}
                    </Badge>
                  )}
                  {member.vai_tro !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMutation.mutate(member.id)}
                      disabled={removeMutation.isPending}
                    >
                      Xóa
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
