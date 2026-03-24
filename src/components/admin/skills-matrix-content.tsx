'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Layers3, ScanSearch, Users } from 'lucide-react';
import Link from 'next/link';
import { SkillsMatrix } from '@/components/skills/skills-matrix';
import { DashboardPageShell, DashboardSection } from '@/components/dashboard/page-shell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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

export function SkillsMatrixPageContent() {
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
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#fbfaf4_0%,#f4f6ef_44%,#edf2ea_100%)]">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Skeleton className="h-[220px] rounded-[38px]" />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-[132px] rounded-[28px]" />
            ))}
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Skeleton className="h-[240px] rounded-[30px]" />
            <Skeleton className="h-[240px] rounded-[30px]" />
          </div>
          <Skeleton className="mt-6 h-[560px] rounded-[30px]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    const errorMessage = error instanceof Error ? error.message : 'Đã có lỗi xảy ra';

    return (
      <DashboardPageShell
        badge="Ma trận kỹ năng"
        title="Ma trận kỹ năng"
        description="Không thể tải dữ liệu kỹ năng của tổ chức ở thời điểm này."
        actions={
          <Link href="/dashboard">
            <Button variant="outline" className="border-[#dfe5d6] bg-white text-[#5d6958] hover:bg-[#f6f8f1]">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại tổng quan
            </Button>
          </Link>
        }
      >
        <DashboardSection title="Có lỗi khi tải ma trận" description="Hãy thử làm mới trang hoặc kiểm tra lại quyền truy cập của tài khoản này.">
          <div className="flex items-start gap-3 rounded-[24px] border border-[#f2d8d8] bg-[#fff5f5] px-4 py-4 text-[#9d4545]">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm leading-6">{errorMessage}</p>
          </div>
        </DashboardSection>
      </DashboardPageShell>
    );
  }

  const skills = data.data.skills;
  const tongNguoiDung = data.data.tong_nguoi_dung;
  const tongKyNang = data.data.tong_ky_nang;
  const tongHoSoKyNang = skills.reduce((sum, skill) => sum + skill.so_nguoi, 0);
  const tongNamKinhNghiem = skills.reduce((sum, skill) => sum + skill.tong_nam_kinh_nghiem, 0);
  const soNguoiDaKhaiBaoKyNang = new Set(skills.flatMap((skill) => skill.nguoi_dung.map((user) => user.id))).size;
  const doPhuKyNang = tongNguoiDung > 0 ? (soNguoiDaKhaiBaoKyNang / tongNguoiDung) * 100 : 0;
  const matDoKyNang = tongNguoiDung > 0 ? tongHoSoKyNang / tongNguoiDung : 0;

  return (
    <DashboardPageShell
      badge="Điều hành"
      title="Ma trận kỹ năng"
      description="Tổng hợp kỹ năng của toàn bộ thành viên trong tổ chức."
      actions={
        <Link href="/dashboard">
          <Button variant="outline" className="border-[#dfe5d6] bg-white text-[#5d6958] hover:bg-[#f6f8f1]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại tổng quan
          </Button>
        </Link>
      }
      metrics={[
        {
          label: 'Thành viên',
          value: tongNguoiDung.toString(),
          note: 'Số người đang thuộc tổ chức',
          icon: <Users className="h-4 w-4 text-[#2f6052]" />,
          surfaceClassName: 'border-[#d9eadf] bg-[#eef6f0]',
          valueClassName: 'text-[#2f6052]',
        },
        {
          label: 'Kỹ năng',
          value: tongKyNang.toString(),
          note: 'Số kỹ năng khác nhau đã được ghi nhận',
          icon: <Layers3 className="h-4 w-4 text-[#39638d]" />,
          surfaceClassName: 'border-[#d8e6f7] bg-[#edf5ff]',
          valueClassName: 'text-[#39638d]',
        },
        {
          label: 'Hồ sơ kỹ năng',
          value: tongHoSoKyNang.toString(),
          note: 'Tổng số lượt khai báo kỹ năng của cả đội',
          icon: <ScanSearch className="h-4 w-4 text-[#985c21]" />,
          surfaceClassName: 'border-[#eee1bb] bg-[#fff6df]',
          valueClassName: 'text-[#985c21]',
        },
        {
          label: 'Độ phủ hồ sơ',
          value: `${doPhuKyNang.toFixed(0)}%`,
          note: tongNguoiDung > 0 ? `${soNguoiDaKhaiBaoKyNang}/${tongNguoiDung} thành viên đã có kỹ năng` : 'Chưa có thành viên nào',
          icon: <Users className="h-4 w-4 text-[#8a5b8c]" />,
          surfaceClassName: 'border-[#eadcf0] bg-[#fbf4fd]',
          valueClassName: 'text-[#8a5b8c]',
        },
      ]}
    >
      <SkillsMatrix
        skills={skills}
        tongNguoiDung={tongNguoiDung}
        tongKyNang={tongKyNang}
        tongNamKinhNghiem={tongNamKinhNghiem}
        matDoKyNang={matDoKyNang}
      />
    </DashboardPageShell>
  );
}
