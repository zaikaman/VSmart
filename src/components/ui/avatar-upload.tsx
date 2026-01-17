'use client';

import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Camera, Loader2, X } from 'lucide-react';

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  userName: string;
  onAvatarChange?: (newAvatarUrl: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarUpload({ 
  currentAvatarUrl, 
  userName, 
  onAvatarChange,
  size = 'md' 
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước file không được vượt quá 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setIsUploading(true);
    try {
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

      const data = await response.json();
      setPreviewUrl(data.avatar_url);
      toast.success('Đã cập nhật avatar thành công');
      
      if (onAvatarChange) {
        onAvatarChange(data.avatar_url);
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi upload avatar');
      setPreviewUrl(currentAvatarUrl); // Revert preview
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc muốn xóa avatar tùy chỉnh? Avatar sẽ được reset về ảnh Google.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/upload/avatar', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể xóa avatar');
      }

      const data = await response.json();
      setPreviewUrl(data.avatar_url);
      toast.success('Đã reset avatar về mặc định');
      
      if (onAvatarChange) {
        onAvatarChange(data.avatar_url);
      }
    } catch (error: any) {
      console.error('Error deleting avatar:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi xóa avatar');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const isCustomAvatar = previewUrl && previewUrl.includes('cloudinary.com');

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative group">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={previewUrl || undefined} alt={userName} />
          <AvatarFallback className="text-lg font-semibold">
            {userName?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        
        {/* Overlay với icon camera khi hover */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
          onClick={handleButtonClick}
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>

        {/* Button xóa ảnh tùy chỉnh */}
        {isCustomAvatar && !isUploading && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-50"
            title="Xóa avatar tùy chỉnh"
          >
            {isDeleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <X className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      <div className="flex flex-col items-center space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleButtonClick}
          disabled={isUploading || isDeleting}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang upload...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              {isCustomAvatar ? 'Đổi avatar' : 'Tải lên avatar'}
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          JPG, PNG hoặc GIF. Tối đa 5MB.
        </p>
      </div>
    </div>
  );
}
