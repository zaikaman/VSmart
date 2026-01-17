'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, XCircle, Clock, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectInvitation {
  id: string;
  du_an_id: string;
  email: string;
  vai_tro: 'owner' | 'admin' | 'member' | 'viewer';
  ngay_moi: string;
  du_an: {
    id: string;
    ten: string;
    mo_ta: string;
  };
  nguoi_moi: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  };
}

export default function ProjectInvitations() {
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const response = await fetch('/api/project-members/invitations');
      
      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
      toast.error('Không thể tải danh sách lời mời');
    } finally {
      setLoading(false);
    }
  };

  const handleInvitation = async (invitationId: string, action: 'accept' | 'decline') => {
    setProcessingId(invitationId);
    
    try {
      const response = await fetch('/api/project-members/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitation_id: invitationId,
          action,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
        // Xóa invitation khỏi danh sách
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      } else {
        toast.error(result.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error handling invitation:', error);
      toast.error('Không thể xử lý lời mời');
    } finally {
      setProcessingId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      owner: { label: 'Chủ sở hữu', variant: 'default' },
      admin: { label: 'Quản trị viên', variant: 'default' },
      member: { label: 'Thành viên', variant: 'secondary' },
      viewer: { label: 'Người xem', variant: 'outline' },
    };

    const config = roleConfig[role] || roleConfig.member;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} phút trước`;
    } else if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    } else if (diffDays < 7) {
      return `${diffDays} ngày trước`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lời mời dự án</CardTitle>
          <CardDescription>Đang tải...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lời mời dự án</CardTitle>
          <CardDescription>Bạn chưa có lời mời nào đang chờ xử lý</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Mail className="h-12 w-12 mb-4 opacity-50" />
            <p>Không có lời mời nào</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lời mời dự án</CardTitle>
        <CardDescription>
          Bạn có {invitations.length} lời mời đang chờ xử lý
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={invitation.nguoi_moi.avatar_url || undefined} />
              <AvatarFallback>
                {invitation.nguoi_moi.ten.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
              <div>
                <h4 className="font-semibold text-base">{invitation.du_an.ten}</h4>
                {invitation.du_an.mo_ta && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {invitation.du_an.mo_ta}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  <strong>{invitation.nguoi_moi.ten}</strong> đã mời bạn tham gia
                </span>
                <span>•</span>
                {getRoleBadge(invitation.vai_tro)}
                <span>•</span>
                <Clock className="h-3 w-3" />
                <span>{formatDate(invitation.ngay_moi)}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleInvitation(invitation.id, 'accept')}
                  disabled={processingId === invitation.id}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Chấp nhận
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleInvitation(invitation.id, 'decline')}
                  disabled={processingId === invitation.id}
                  className="gap-1.5"
                >
                  <XCircle className="h-4 w-4" />
                  Từ chối
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
