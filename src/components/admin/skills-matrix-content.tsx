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
  const kyNangPhoBienNhat = skills[0];

  return (
    <DashboardPageShell
      badge="Điều hành"
      title="Ma trận kỹ năng"
      description="Nhìn nhanh đội ngũ đang mạnh ở đâu, thiếu gì và ai phù hợp cho từng đầu việc trên cùng một màn hình."
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
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardSection title="Trang này dùng để làm gì?" description="Đây là nơi gom toàn bộ kỹ năng của thành viên về một chỗ để bạn đọc năng lực đội ngũ theo chiều ngang thay vì mở từng hồ sơ riêng lẻ.">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-[#e4eadf] bg-[#fbfcf8] p-4">
              <p className="text-sm font-semibold text-[#223021]">Xem đội ngũ đang mạnh ở đâu</p>
              <p className="mt-2 text-sm leading-6 text-[#65725f]">Biết kỹ năng nào đang có nhiều người nắm tốt để tự tin giao việc hoặc mở rộng dự án.</p>
            </div>
            <div className="rounded-[24px] border border-[#e4eadf] bg-[#fbfcf8] p-4">
              <p className="text-sm font-semibold text-[#223021]">Tìm đúng người cho đúng việc</p>
              <p className="mt-2 text-sm leading-6 text-[#65725f]">Mỗi dòng cho thấy ai đang có kỹ năng đó, ở mức nào và đã tích lũy bao nhiêu năm kinh nghiệm.</p>
            </div>
            <div className="rounded-[24px] border border-[#e4eadf] bg-[#fbfcf8] p-4">
              <p className="text-sm font-semibold text-[#223021]">Phát hiện chỗ còn thiếu</p>
              <p className="mt-2 text-sm leading-6 text-[#65725f]">Khi một kỹ năng quá ít người sở hữu, bạn sẽ thấy ngay nhu cầu đào tạo thêm hoặc cần tuyển mới.</p>
            </div>
          </div>
        </DashboardSection>

        <DashboardSection title="Nhìn nhanh trước khi đọc ma trận" description="Ba chỉ số này giúp bạn hiểu bức tranh năng lực tổng quát chỉ trong vài giây.">
          <div className="space-y-3">
            <div className="rounded-[24px] border border-[#e4eadf] bg-[linear-gradient(135deg,#f8fbf4_0%,#eef6e6_100%)] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70806a]">Kỹ năng phổ biến nhất</div>
              <p className="mt-3 text-lg font-semibold text-[#223021]">
                {kyNangPhoBienNhat ? kyNangPhoBienNhat.ten_ky_nang : 'Chưa có dữ liệu'}
              </p>
              <p className="mt-1 text-sm text-[#5f6d59]">
                {kyNangPhoBienNhat ? `${kyNangPhoBienNhat.so_nguoi} thành viên đang sở hữu kỹ năng này.` : 'Khi thành viên bắt đầu khai báo kỹ năng, mục này sẽ tự cập nhật.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-[#e4eadf] bg-[#fbfcf8] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70806a]">Mật độ kỹ năng</div>
                <p className="mt-3 text-2xl font-semibold text-[#223021]">{matDoKyNang.toFixed(1)}</p>
                <p className="mt-1 text-sm text-[#5f6d59]">Kỹ năng trung bình trên mỗi thành viên.</p>
              </div>
              <div className="rounded-[22px] border border-[#e4eadf] bg-[#fbfcf8] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70806a]">Kinh nghiệm cộng dồn</div>
                <p className="mt-3 text-2xl font-semibold text-[#223021]">{tongNamKinhNghiem}</p>
                <p className="mt-1 text-sm text-[#5f6d59]">Tổng số năm kinh nghiệm từ toàn bộ kỹ năng đã khai báo.</p>
              </div>
            </div>
          </div>
        </DashboardSection>
      </div>

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
