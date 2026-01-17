'use client';

import { useQuery } from '@tanstack/react-query';
import { SkillsMatrix } from '@/components/skills/skills-matrix';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface SkillMatrixEntry {
  ten_ky_nang: string;
  so_nguoi: number;
  beginner: number;
  intermediate: number;
  advanced: number;
  expert: number;
  tong_nam_kinh_nghiem: number;
  nguoi_dung: Array<{
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
    trinh_do: string;
    nam_kinh_nghiem: number;
  }>;
}

interface SkillsMatrixResponse {
  data: {
    skills: SkillMatrixEntry[];
    tong_nguoi_dung: number;
    tong_ky_nang: number;
  };
  error?: string;
}

export default function SkillsMatrixPage() {
  const { data, isLoading, error } = useQuery<SkillsMatrixResponse>({
    queryKey: ['admin-skills-matrix'],
    queryFn: async () => {
      const response = await fetch('/api/admin/skills-matrix');
      const json = await response.json();
      
      if (!response.ok) {
        throw new Error(json.error || 'Không thể tải dữ liệu');
      }
      
      return json;
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-64" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        
        <Skeleton className="h-12 w-full mb-4" />
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    const errorMessage = error instanceof Error ? error.message : 'Đã có lỗi xảy ra';
    
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Ma trận kỹ năng</h1>
        </div>
        
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p>{errorMessage}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Ma trận kỹ năng</h1>
          <p className="text-gray-500 mt-1">
            Tổng quan kỹ năng của toàn bộ thành viên trong tổ chức
          </p>
        </div>
      </div>

      <SkillsMatrix
        skills={data.data.skills}
        tongNguoiDung={data.data.tong_nguoi_dung}
        tongKyNang={data.data.tong_ky_nang}
      />
    </div>
  );
}
