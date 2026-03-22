'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Building, Loader2, Mail, Save, Sparkles, User } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardPageShell, DashboardSection } from '@/components/dashboard/page-shell';
import { SkillsInput } from '@/components/skills/skills-input';
import { SkillsList, type Skill } from '@/components/skills/skills-list';
import { Button } from '@/components/ui/button';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface UserProfile {
  id: string;
  ten: string;
  email: string;
  avatar_url: string | null;
  ten_cong_ty: string | null;
  ten_phong_ban: string | null;
  vai_tro: string;
  to_chuc?: {
    id: string;
    ten: string;
  };
}

export function ProfilePageContent() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    ten: '',
    ten_cong_ty: '',
    ten_phong_ban: '',
  });

  const { data: user, isLoading } = useQuery<UserProfile>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await fetch('/api/users/me');
      if (!response.ok) throw new Error('Không thể lấy thông tin người dùng');
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: skillsResponse, isLoading: isLoadingSkills } = useQuery<{ data: Skill[] }>({
    queryKey: ['user-skills'],
    queryFn: async () => {
      const response = await fetch('/api/users/me/skills');
      if (!response.ok) throw new Error('Không thể lấy danh sách kỹ năng');
      return response.json();
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const skills = skillsResponse?.data || [];

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { ten?: string; ten_cong_ty?: string; ten_phong_ban?: string }) => {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể cập nhật thông tin');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Đã cập nhật thông tin thành công');
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addSkillMutation = useMutation({
    mutationFn: async (data: { ten_ky_nang: string; trinh_do: string; nam_kinh_nghiem: number }) => {
      const response = await fetch('/api/users/me/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể thêm kỹ năng');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skills'] });
      toast.success('Đã thêm kỹ năng thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateSkillMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { trinh_do?: string; nam_kinh_nghiem?: number } }) => {
      const response = await fetch(`/api/users/me/skills/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể cập nhật kỹ năng');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skills'] });
      toast.success('Đã cập nhật kỹ năng');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteSkillMutation = useMutation({
    mutationFn: async (skillId: string) => {
      const response = await fetch(`/api/users/me/skills/${skillId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể xóa kỹ năng');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skills'] });
      toast.success('Đã xóa kỹ năng');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: async (avatarUrl: string) => {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: avatarUrl }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể cập nhật avatar');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Đã cập nhật ảnh đại diện');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleEditProfile = () => {
    if (user) {
      setFormData({
        ten: user.ten,
        ten_cong_ty: user.ten_cong_ty || '',
        ten_phong_ban: user.ten_phong_ban || '',
      });
      setIsEditing(true);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Skeleton className="h-[220px] rounded-[38px]" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Skeleton className="h-[420px] rounded-[30px]" />
          <Skeleton className="h-[520px] rounded-[30px]" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-[28px] border border-[#f0ddd1] bg-[#fff3ed] p-6 text-[#a05735]">
          Không thể tải thông tin người dùng.
        </div>
      </div>
    );
  }

  return (
    <DashboardPageShell
      badge={
        <>
          <Sparkles className="h-3.5 w-3.5 text-[#87ac63]" />
          Personal profile
        </>
      }
      title="Một hồ sơ sáng, rõ và đủ sâu để AI hiểu đúng thế mạnh của bạn."
      description="Cập nhật thông tin cá nhân, ảnh đại diện và bộ kỹ năng để các gợi ý phân công khớp hơn với năng lực thật."
      metrics={[
        {
          label: 'Vai trò hiện tại',
          value: user.vai_tro === 'admin' ? 'Quản trị viên' : user.vai_tro === 'manager' ? 'Quản lý' : 'Thành viên',
          note: 'Phạm vi làm việc hiện tại',
          icon: <Briefcase className="h-4 w-4 text-[#2f6052]" />,
          surfaceClassName: 'bg-[#eef6f0] border-[#d9eadf]',
          valueClassName: 'text-xl text-[#2f6052]',
        },
        {
          label: 'Kỹ năng đã khai báo',
          value: skills.length.toString(),
          note: 'Hồ sơ năng lực của bạn',
          icon: <User className="h-4 w-4 text-[#39638d]" />,
          surfaceClassName: 'bg-[#edf5ff] border-[#d8e6f7]',
          valueClassName: 'text-[#39638d]',
        },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <DashboardSection title="Nhận diện cá nhân" description="Ảnh đại diện và thông tin nền tảng giúp hồ sơ gọn và nhất quán hơn khi xuất hiện trong team.">
          <div className="flex flex-col items-center rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-5">
            <AvatarUpload currentAvatarUrl={user.avatar_url} userName={user.ten} onAvatarChange={(url) => updateAvatarMutation.mutate(url)} />
            <div className="mt-6 w-full space-y-3 text-center">
              <h2 className="text-xl font-semibold text-[#223021]">{user.ten}</h2>
              <div className="flex items-center justify-center gap-2 text-sm text-[#67745f]">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              {user.to_chuc ? (
                <div className="flex items-center justify-center gap-2 text-sm text-[#67745f]">
                  <Building className="h-4 w-4" />
                  <span>{user.to_chuc.ten}</span>
                </div>
              ) : null}
              <div className="pt-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-[#dce5d2] bg-[#f3f8eb] px-3 py-1 text-xs font-medium text-[#4f614b]">
                  <Briefcase className="h-3 w-3" />
                  {user.vai_tro === 'admin' ? 'Quản trị viên' : user.vai_tro === 'manager' ? 'Quản lý' : 'Thành viên'}
                </span>
              </div>
            </div>
          </div>
        </DashboardSection>

        <DashboardSection
          title="Thông tin cá nhân"
          description="Những trường này được dùng cho hồ sơ hiển thị và một phần ngữ cảnh AI khi gợi ý phân công."
          actions={
            !isEditing ? (
              <Button variant="outline" className="border-[#e0e6d7] bg-white text-[#5d6958] hover:bg-[#f6f8f1]" onClick={handleEditProfile}>
                Chỉnh sửa
              </Button>
            ) : null
          }
        >
          <div className="grid gap-4">
            <div>
              <Label htmlFor="ten">Họ và tên</Label>
              {isEditing ? (
                <Input id="ten" value={formData.ten} onChange={(e) => setFormData({ ...formData, ten: e.target.value })} placeholder="Nhập họ tên" className="mt-1.5 border-[#dfe5d6] bg-[#fbfcf8]" />
              ) : (
                <p className="mt-2 text-sm text-[#223021]">{user.ten}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <p className="mt-2 text-sm text-[#67745f]">{user.email}</p>
            </div>

            <div>
              <Label htmlFor="ten_cong_ty">Công ty</Label>
              {isEditing ? (
                <Input id="ten_cong_ty" value={formData.ten_cong_ty} onChange={(e) => setFormData({ ...formData, ten_cong_ty: e.target.value })} placeholder="Nhập tên công ty" className="mt-1.5 border-[#dfe5d6] bg-[#fbfcf8]" />
              ) : (
                <p className="mt-2 text-sm text-[#223021]">{user.to_chuc?.ten || user.ten_cong_ty || 'Chưa cập nhật'}</p>
              )}
            </div>

            <div>
              <Label htmlFor="ten_phong_ban">Phòng ban</Label>
              {isEditing ? (
                <Input id="ten_phong_ban" value={formData.ten_phong_ban} onChange={(e) => setFormData({ ...formData, ten_phong_ban: e.target.value })} placeholder="Nhập tên phòng ban" className="mt-1.5 border-[#dfe5d6] bg-[#fbfcf8]" />
              ) : (
                <p className="mt-2 text-sm text-[#223021]">{user.ten_phong_ban || 'Chưa cập nhật'}</p>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="mt-5 flex gap-2">
              <Button className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]" onClick={() => updateProfileMutation.mutate(formData)} disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Lưu thay đổi
                  </>
                )}
              </Button>
              <Button variant="outline" className="border-[#e0e6d7] bg-white text-[#5d6958] hover:bg-[#f6f8f1]" onClick={() => setIsEditing(false)} disabled={updateProfileMutation.isPending}>
                Hủy
              </Button>
            </div>
          ) : null}
        </DashboardSection>
      </div>

      <DashboardSection title="Bộ kỹ năng" description="Khai báo kỹ năng và mức độ thành thạo để ma trận năng lực và AI gợi ý assignee phản ánh sát thực tế hơn.">
        <div className="space-y-6">
          <SkillsInput onAddSkill={(data) => addSkillMutation.mutate(data)} isLoading={addSkillMutation.isPending} />

          {isLoadingSkills ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-[24px]" />
              <Skeleton className="h-20 w-full rounded-[24px]" />
              <Skeleton className="h-20 w-full rounded-[24px]" />
            </div>
          ) : skills.length > 0 ? (
            <SkillsList
              skills={skills}
              onUpdateSkill={(id, data) => updateSkillMutation.mutateAsync({ id, data })}
              onDeleteSkill={(skillId) => deleteSkillMutation.mutate(skillId)}
              isUpdating={updateSkillMutation.isPending}
              isDeleting={deleteSkillMutation.isPending}
            />
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#dce4d3] bg-[#f8faf4] py-10 text-center text-[#72806c]">
              <p>Bạn chưa thêm kỹ năng nào.</p>
              <p className="mt-1 text-sm">Hãy thêm kỹ năng để tăng cơ hội được giao đúng việc và giúp AI hiểu rõ hồ sơ năng lực hơn.</p>
            </div>
          )}
        </div>
      </DashboardSection>
    </DashboardPageShell>
  );
}
