'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Clock, Mail, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600'] });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'] });

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
        body: JSON.stringify({ invitation_id: invitationId, action }),
      });
      const result = await response.json();
      if (response.ok) {
        toast.success(result.message);
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
    const roleConfig: Record<string, { label: string; color: string }> = {
      owner: { label: 'OWNER', color: 'text-purple-400 border-purple-400/50 bg-purple-400/10' },
      admin: { label: 'ADMIN', color: 'text-blue-400 border-blue-400/50 bg-blue-400/10' },
      member: { label: 'MEMBER', color: 'text-[#b9ff66] border-[#b9ff66]/50 bg-[#b9ff66]/10' },
      viewer: { label: 'VIEWER', color: 'text-gray-400 border-gray-400/50 bg-gray-400/10' },
    };
    const config = roleConfig[role] || roleConfig.member;
    return (
      <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} MINS AGO`;
    if (diffHours < 24) return `${diffHours} HOURS AGO`;
    if (diffDays < 7) return `${diffDays} DAYS AGO`;
    return date.toLocaleDateString('en-US').toUpperCase();
  };

  if (loading) {
    return (
      <div className="border border-[#222] bg-[#0a0a0a] p-6">
        <div className="h-6 w-48 bg-[#1a1a1a] animate-pulse mb-6" />
        <div className="h-24 bg-[#111] animate-pulse border border-[#222]" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return null; // Tránh hiển thị phần trống chiếm diện tích trên dashboard nếu không có lời mời
  }

  return (
    <div className={`border border-[#222] bg-[#0a0a0a] p-6 relative overflow-hidden ${bricolage.className}`}>
      {/* Accent corner */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-[#b9ff66]/5 rounded-bl-[100px] pointer-events-none" />

      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="w-5 h-5 text-[#b9ff66]" />
        <h2 className="text-xl font-bold text-white tracking-wide uppercase">Requires Attention</h2>
        <span className={`ml-auto bg-[#b9ff66] text-black ${jetbrains.className} px-2 py-1 text-xs font-bold`}>
          {invitations.length} PENDING
        </span>
      </div>

      <div className="space-y-4">
        {invitations.map((inv) => (
          <div
            key={inv.id}
            className="group flex flex-col md:flex-row md:items-center gap-4 p-4 border border-[#222] bg-[#111] hover:border-[#b9ff66]/50 transition-colors"
          >
            <Avatar className="h-12 w-12 border border-[#333] rounded-none">
              <AvatarImage src={inv.nguoi_moi.avatar_url || undefined} />
              <AvatarFallback className="bg-[#1a1a1a] text-white rounded-none">
                {inv.nguoi_moi.ten.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h4 className="font-bold text-white text-lg tracking-wide uppercase group-hover:text-[#b9ff66] transition-colors">
                {inv.du_an.ten}
              </h4>
              <div className={`flex flex-wrap items-center gap-2 mt-2 text-xs font-medium ${jetbrains.className} text-[#666]`}>
                <span className="text-[#888]">INVITED BY
                  <span className="text-white ml-2">[{inv.nguoi_moi.ten}]</span>
                </span>
                <span className="text-[#333]">/</span>
                {getRoleBadge(inv.vai_tro)}
                <span className="text-[#333]">/</span>
                <Clock className="h-3 w-3" />
                <span>{formatDate(inv.ngay_moi)}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4 md:mt-0">
              <button
                onClick={() => handleInvitation(inv.id, 'accept')}
                disabled={processingId === inv.id}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-[#b9ff66] text-black font-bold uppercase tracking-widest text-xs hover:bg-[#a3e659] transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                ACCEPT
              </button>
              <button
                onClick={() => handleInvitation(inv.id, 'decline')}
                disabled={processingId === inv.id}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-[#444] text-[#888] font-bold uppercase tracking-widest text-xs hover:border-red-500 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                DECLINE
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
