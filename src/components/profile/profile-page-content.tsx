'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { SkillsInput } from '@/components/skills/skills-input';
import { SkillsList, type Skill } from '@/components/skills/skills-list';
import { toast } from 'sonner';
import { User, Mail, Building, Briefcase, Save, Loader2 } from 'lucide-react';

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

  // Lấy thông tin user
  const { data: user, isLoading } = useQuery<UserProfile>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await fetch('/api/users/me');
      if (!response.ok) throw new Error('Không thể lấy thông tin người dùng');
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 phút
    gcTime: 5 * 60 * 1000, // 5 phút
  });

  // Lấy danh sách kỹ năng
  const { data: skillsResponse, isLoading: isLoadingSkills } = useQuery<{ data: Skill[] }>({
    queryKey: ['user-skills'],
    queryFn: async () => {
      const response = await fetch('/api/users/me/skills');
      if (!response.ok) throw new Error('Không thể lấy danh sách kỹ năng');
      return response.json();
    },
    staleTime: 3 * 60 * 1000, // 3 phút
    gcTime: 5 * 60 * 1000,
  });

  const skills = skillsResponse?.data || [];

  // Mutation cập nhật profile
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

  // Mutation thêm kỹ năng
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

  // Mutation xóa kỹ năng
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

  // Mutation cập nhật avatar
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

  const handleSaveProfile = async () => {
    updateProfileMutation.mutate(formData);
  };

  const handleAddSkill = async (data: { ten_ky_nang: string; trinh_do: string; nam_kinh_nghiem: number }) => {
    addSkillMutation.mutate(data);
  };

  const handleDeleteSkill = async (skillId: string) => {
    deleteSkillMutation.mutate(skillId);
  };

  const handleAvatarChange = async (url: string) => {
    updateAvatarMutation.mutate(url);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-red-500">Không thể tải thông tin người dùng</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Hồ Sơ Của Tôi</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar - Avatar và thông tin cơ bản */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Ảnh đại diện</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <AvatarUpload
                currentAvatarUrl={user.avatar_url}
                userName={user.ten}
                onAvatarChange={handleAvatarChange}
              />
              <div className="mt-6 text-center w-full space-y-3">
                <h2 className="text-xl font-semibold">{user.ten}</h2>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                {user.to_chuc && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span>{user.to_chuc.ten}</span>
                  </div>
                )}
                <div className="pt-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    <Briefcase className="h-3 w-3" />
                    {user.vai_tro === 'admin' ? 'Quản trị viên' : user.vai_tro === 'manager' ? 'Quản lý' : 'Thành viên'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          {/* Thông tin cá nhân */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Thông tin cá nhân</CardTitle>
                  <CardDescription>Cập nhật thông tin của bạn</CardDescription>
                </div>
                {!isEditing && (
                  <Button onClick={handleEditProfile} variant="outline" size="sm">
                    Chỉnh sửa
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="ten">Họ và tên</Label>
                  {isEditing ? (
                    <Input
                      id="ten"
                      value={formData.ten}
                      onChange={(e) => setFormData({ ...formData, ten: e.target.value })}
                      placeholder="Nhập họ tên"
                    />
                  ) : (
                    <p className="mt-1.5 text-sm">{user.ten}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <p className="mt-1.5 text-sm text-muted-foreground">{user.email}</p>
                </div>

                <div>
                  <Label htmlFor="ten_cong_ty">Công ty</Label>
                  {isEditing ? (
                    <Input
                      id="ten_cong_ty"
                      value={formData.ten_cong_ty}
                      onChange={(e) => setFormData({ ...formData, ten_cong_ty: e.target.value })}
                      placeholder="Nhập tên công ty"
                    />
                  ) : (
                    <p className="mt-1.5 text-sm">
                      {user.to_chuc?.ten || user.ten_cong_ty || 'Chưa cập nhật'}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="ten_phong_ban">Phòng ban</Label>
                  {isEditing ? (
                    <Input
                      id="ten_phong_ban"
                      value={formData.ten_phong_ban}
                      onChange={(e) => setFormData({ ...formData, ten_phong_ban: e.target.value })}
                      placeholder="Nhập tên phòng ban"
                    />
                  ) : (
                    <p className="mt-1.5 text-sm">{user.ten_phong_ban || 'Chưa cập nhật'}</p>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                  >
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
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={updateProfileMutation.isPending}
                  >
                    Hủy
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Kỹ năng */}
          <Card>
            <CardHeader>
              <CardTitle>Kỹ năng</CardTitle>
              <CardDescription>Quản lý kỹ năng và trình độ của bạn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SkillsInput
                onAddSkill={handleAddSkill}
                isLoading={addSkillMutation.isPending}
              />

              {isLoadingSkills ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : skills.length > 0 ? (
                <SkillsList
                  skills={skills}
                  onDeleteSkill={handleDeleteSkill}
                  isDeleting={deleteSkillMutation.isPending}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Bạn chưa thêm kỹ năng nào</p>
                  <p className="text-sm mt-1">Hãy thêm kỹ năng để tăng cơ hội được giao việc phù hợp</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
