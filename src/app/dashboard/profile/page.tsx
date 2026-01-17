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

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    ten: '',
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
  });

  // Lấy danh sách kỹ năng
  const { data: skillsResponse, isLoading: isLoadingSkills } = useQuery<{ data: Skill[] }>({
    queryKey: ['user-skills'],
    queryFn: async () => {
      const response = await fetch('/api/users/me/skills');
      if (!response.ok) throw new Error('Không thể lấy danh sách kỹ năng');
      return response.json();
    },
  });

  const skills = skillsResponse?.data || [];

  // Mutation cập nhật profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { ten?: string; ten_phong_ban?: string }) => {
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

  // Mutation cập nhật kỹ năng
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

  // Mutation xóa kỹ năng
  const deleteSkillMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/users/me/skills/${id}`, {
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

  const handleEdit = () => {
    if (user) {
      setFormData({
        ten: user.ten,
        ten_phong_ban: user.ten_phong_ban || '',
      });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleAvatarChange = (newAvatarUrl: string) => {
    // Cập nhật cache
    queryClient.setQueryData(['user-profile'], (old: UserProfile | undefined) => {
      if (!old) return old;
      return { ...old, avatar_url: newAvatarUrl };
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Skeleton className="h-10 w-48 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-32 w-32 rounded-full mx-auto" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card className="mt-6">
          <CardHeader>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-gray-500">Không tìm thấy thông tin người dùng</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Hồ sơ cá nhân</h1>
      </div>

      <div className="space-y-6">
        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle>Ảnh đại diện</CardTitle>
            <CardDescription>
              Ảnh đại diện của bạn sẽ được hiển thị trên toàn bộ hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <AvatarUpload
              currentAvatarUrl={user.avatar_url}
              userName={user.ten}
              onAvatarChange={handleAvatarChange}
              size="lg"
            />
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Thông tin cá nhân</CardTitle>
                <CardDescription>
                  Quản lý thông tin cá nhân của bạn
                </CardDescription>
              </div>
              {!isEditing && (
                <Button onClick={handleEdit}>Chỉnh sửa</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Họ tên */}
              <div>
                <Label htmlFor="ten" className="flex items-center mb-2">
                  <User className="w-4 h-4 mr-2" />
                  Họ và tên
                </Label>
                {isEditing ? (
                  <Input
                    id="ten"
                    value={formData.ten}
                    onChange={(e) => setFormData({ ...formData, ten: e.target.value })}
                  />
                ) : (
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{user.ten}</p>
                )}
              </div>

              {/* Email (read-only) */}
              <div>
                <Label className="flex items-center mb-2">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Label>
                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{user.email}</p>
              </div>

              {/* Công ty (read-only) */}
              <div>
                <Label className="flex items-center mb-2">
                  <Building className="w-4 h-4 mr-2" />
                  Công ty
                </Label>
                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                  {user.to_chuc?.ten || user.ten_cong_ty || 'Chưa cập nhật'}
                </p>
              </div>

              {/* Phòng ban */}
              <div>
                <Label htmlFor="ten_phong_ban" className="flex items-center mb-2">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Phòng ban
                </Label>
                {isEditing ? (
                  <Input
                    id="ten_phong_ban"
                    value={formData.ten_phong_ban}
                    onChange={(e) => setFormData({ ...formData, ten_phong_ban: e.target.value })}
                  />
                ) : (
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                    {user.ten_phong_ban || 'Chưa cập nhật'}
                  </p>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateProfileMutation.isPending}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleSave}
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Info (read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin tài khoản</CardTitle>
            <CardDescription>
              Thông tin về tài khoản và vai trò của bạn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium text-gray-600">Vai trò</span>
              <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                {user.vai_tro === 'admin' ? 'Quản trị viên' : 
                 user.vai_tro === 'manager' ? 'Quản lý' : 'Thành viên'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium text-gray-600">ID người dùng</span>
              <span className="text-sm text-gray-700 font-mono">{user.id.slice(0, 8)}...</span>
            </div>
          </CardContent>
        </Card>

        {/* Skills Management */}
        <Card>
          <CardHeader>
            <CardTitle>Kỹ năng</CardTitle>
            <CardDescription>
              Quản lý danh sách kỹ năng của bạn để hệ thống gợi ý phân công task phù hợp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Skills Input */}
            <SkillsInput
              onAddSkill={(skill) => addSkillMutation.mutate(skill)}
              isLoading={addSkillMutation.isPending}
              existingSkills={skills.map(s => s.ten_ky_nang)}
            />

            {/* Skills List */}
            {isLoadingSkills ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <SkillsList
                skills={skills}
                onUpdateSkill={(id, data) => updateSkillMutation.mutate({ id, data })}
                onDeleteSkill={(id) => deleteSkillMutation.mutate(id)}
                isUpdating={updateSkillMutation.isPending}
                isDeleting={deleteSkillMutation.isPending}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
