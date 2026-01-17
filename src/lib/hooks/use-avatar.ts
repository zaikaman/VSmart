import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UploadAvatarResult {
  success: boolean;
  avatar_url: string;
  public_id: string;
}

interface DeleteAvatarResult {
  success: boolean;
  avatar_url: string | null;
}

// Hook để upload avatar
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation<UploadAvatarResult, Error, File>({
    mutationFn: async (file: File) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File phải là định dạng ảnh');
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Kích thước file không được vượt quá 5MB');
      }

      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể upload avatar');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate user profile cache
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Đã cập nhật avatar thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Có lỗi xảy ra khi upload avatar');
    },
  });
}

// Hook để xóa avatar
export function useDeleteAvatar() {
  const queryClient = useQueryClient();

  return useMutation<DeleteAvatarResult, Error>({
    mutationFn: async () => {
      const response = await fetch('/api/upload/avatar', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể xóa avatar');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Đã reset avatar về mặc định');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Có lỗi xảy ra khi xóa avatar');
    },
  });
}

// Hook để get current user với avatar
export function useCurrentUser() {
  const queryClient = useQueryClient();
  
  return {
    getCurrentUser: () => {
      return queryClient.getQueryData(['user-profile']);
    },
    updateAvatarUrl: (newUrl: string) => {
      queryClient.setQueryData(['user-profile'], (old: any) => {
        if (!old) return old;
        return { ...old, avatar_url: newUrl };
      });
    }
  };
}
