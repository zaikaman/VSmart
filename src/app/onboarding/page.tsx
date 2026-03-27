'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type OnboardingUser = {
  ten?: string | null;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [hoTen, setHoTen] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['onboarding-user'],
    queryFn: async () => {
      const response = await fetch('/api/users/me');
      if (!response.ok) {
        throw new Error('Không thể tải thông tin người dùng');
      }

      return response.json() as Promise<OnboardingUser>;
    },
  });

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setHoTen((currentValue) => currentValue || currentUser.ten || '');
  }, [currentUser]);

  const handleComplete = async () => {
    if (!hoTen.trim()) {
      setError('Vui lòng nhập họ và tên để vào dashboard');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const userResponse = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ten: hoTen.trim(),
          onboarding_completed: true,
        }),
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => null);
        throw new Error(errorData?.error || 'Không thể hoàn tất thiết lập hồ sơ');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      console.error('Onboarding error:', err);
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fbfaf4_0%,#f4f6ef_44%,#edf2ea_100%)]">
        <div className="rounded-[28px] border border-[#dfe5d6] bg-white/90 px-8 py-6 text-sm text-[#5d6c57] shadow-[0_22px_65px_-48px_rgba(89,109,84,0.35)]">
          Đang chuẩn bị không gian bắt đầu...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f6f9ee_0%,#fbfaf4_38%,#eef4eb_100%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-[34px] border border-[#dfe5d6] bg-[linear-gradient(160deg,#223123_0%,#314532_40%,#4d6a46_100%)] p-8 text-[#f4f7ee] shadow-[0_28px_70px_-48px_rgba(34,49,35,0.7)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/78">
              Thiết lập ban đầu
            </div>
            <h1 className="mt-5 text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-tight">
              Chỉ cần một bước nhỏ là vào làm việc ngay.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/76">
              Điền tên hiển thị của bạn để hoàn tất onboarding. Phần không gian làm việc có thể thiết lập sau ngay trong dashboard.
            </p>

            <div className="mt-8 grid gap-3">
              {[
                ['1', 'Điền thông tin cá nhân', 'Tên hiển thị của bạn có thể chỉnh lại bất cứ lúc nào trong hồ sơ.'],
              ].map(([index, title, description]) => (
                <div key={index} className="rounded-[24px] border border-white/12 bg-white/8 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-semibold">
                      {index}
                    </div>
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="mt-1 text-sm text-white/72">{description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[24px] border border-white/12 bg-white/8 px-4 py-4 text-sm text-white/76">
              Tiến độ hiện tại: <strong className="font-semibold text-white">1/1</strong>
            </div>
          </section>

          <section className="rounded-[34px] border border-[#dfe5d6] bg-white/92 p-7 shadow-[0_28px_70px_-54px_rgba(89,109,84,0.42)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7d8a76]">Bước 1/1</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#223021]">Thông tin cá nhân</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d9e4cd] bg-[#f5f8ef] px-3 py-1 text-xs font-medium text-[#5f6f59]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#7f9d5b]" />
                Thiết lập một lần
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <Label htmlFor="hoTen">Họ và tên</Label>
                <Input
                  id="hoTen"
                  placeholder="Ví dụ: Nguyễn Minh Anh"
                  value={hoTen}
                  onChange={(event) => setHoTen(event.target.value)}
                  className="mt-1.5 border-[#dfe5d6] bg-[#fbfcf8]"
                />
              </div>
              <div className="rounded-[28px] border border-[#dce5d2] bg-[#f6f9f1] px-5 py-5 text-sm leading-6 text-[#52614f]">
                Sau khi hoàn tất, bạn sẽ vào thẳng dashboard. Nếu cần làm việc cùng team, bạn có thể tạo không gian làm việc sau.
              </div>

              {error ? <div className="rounded-[20px] border border-[#f0ddd1] bg-[#fff5ef] px-4 py-3 text-sm text-[#a05735]">{error}</div> : null}

              <div className="flex justify-end">
                <Button
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang hoàn tất...
                    </>
                  ) : (
                    'Vào dashboard'
                  )}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
