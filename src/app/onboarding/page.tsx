'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Loader2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateOrganization } from '@/lib/hooks/use-organizations';

type WorkspaceChoice = 'create' | 'later';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [workspaceChoice, setWorkspaceChoice] = useState<WorkspaceChoice>('create');
  const [hoTen, setHoTen] = useState('');
  const [tenPhongBan, setTenPhongBan] = useState('');
  const [tenToChuc, setTenToChuc] = useState('');
  const [moTaToChuc, setMoTaToChuc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const createOrganization = useCreateOrganization();
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['onboarding-user'],
    queryFn: async () => {
      const response = await fetch('/api/users/me');
      if (!response.ok) {
        throw new Error('Không thể tải thông tin người dùng');
      }

      return response.json() as Promise<{
        ten?: string | null;
        ten_phong_ban?: string | null;
        to_chuc?: { ten?: string | null } | null;
      }>;
    },
  });

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setHoTen((currentValue) => currentValue || currentUser.ten || '');
    setTenPhongBan((currentValue) => currentValue || currentUser.ten_phong_ban || '');
    setTenToChuc((currentValue) => currentValue || currentUser.to_chuc?.ten || '');

    if (currentUser.to_chuc) {
      setWorkspaceChoice('later');
    }
  }, [currentUser]);

  const shouldShowOrganizationForm = workspaceChoice === 'create' && !currentUser?.to_chuc;
  const progressLabel = useMemo(() => `${step}/2`, [step]);

  const handleNext = () => {
    if (!hoTen.trim()) {
      setError('Vui lòng nhập họ và tên để tiếp tục');
      return;
    }

    setError('');
    setStep(2);
  };

  const handleComplete = async () => {
    if (shouldShowOrganizationForm && !tenToChuc.trim()) {
      setError('Vui lòng nhập tên tổ chức để tạo không gian làm việc');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      if (shouldShowOrganizationForm) {
        await createOrganization.mutateAsync({
          ten: tenToChuc.trim(),
          mo_ta: moTaToChuc.trim() || undefined,
        });
      }

      const userResponse = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ten: hoTen.trim(),
          ten_phong_ban: tenPhongBan.trim() || null,
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
            <h1 className="mt-5 text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-tight">Thiết lập vài thông tin để bắt đầu gọn gàng hơn.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/76">
              Hoàn thiện hồ sơ cá nhân trước, rồi chọn tạo không gian làm việc ngay hoặc để sau. Mọi thứ sẽ được sắp đúng chỗ ngay từ đầu.
            </p>

            <div className="mt-8 grid gap-3">
              {[
                ['1', 'Điền thông tin cá nhân', 'Tên hiển thị và phòng ban của bạn có thể chỉnh lại bất cứ lúc nào.'],
                ['2', 'Chọn cách bắt đầu', 'Tạo không gian làm việc ngay hoặc vào sản phẩm trước rồi làm sau.'],
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
              Tiến độ hiện tại: <strong className="font-semibold text-white">{progressLabel}</strong>
            </div>
          </section>

          <section className="rounded-[34px] border border-[#dfe5d6] bg-white/92 p-7 shadow-[0_28px_70px_-54px_rgba(89,109,84,0.42)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7d8a76]">Bước {progressLabel}</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#223021]">
                  {step === 1 ? 'Thông tin cá nhân' : 'Thiết lập không gian làm việc'}
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d9e4cd] bg-[#f5f8ef] px-3 py-1 text-xs font-medium text-[#5f6f59]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#7f9d5b]" />
                Thiết lập một lần
              </div>
            </div>

            {step === 1 ? (
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

                <div>
                  <Label htmlFor="tenPhongBan">Phòng ban</Label>
                  <Input
                    id="tenPhongBan"
                    placeholder="Ví dụ: Sản phẩm, Kỹ thuật, Vận hành"
                    value={tenPhongBan}
                    onChange={(event) => setTenPhongBan(event.target.value)}
                    className="mt-1.5 border-[#dfe5d6] bg-[#fbfcf8]"
                  />
                  <p className="mt-2 text-sm text-[#6f7c69]">Thông tin này thuộc hồ sơ cá nhân của bạn và có thể chỉnh lại sau.</p>
                </div>

                {error ? <div className="rounded-[20px] border border-[#f0ddd1] bg-[#fff5ef] px-4 py-3 text-sm text-[#a05735]">{error}</div> : null}

                <div className="flex justify-end">
                  <Button onClick={handleNext} className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]">
                    Tiếp tục
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setWorkspaceChoice('create')}
                    disabled={Boolean(currentUser?.to_chuc)}
                    className={`rounded-[26px] border px-4 py-5 text-left transition-all ${
                      workspaceChoice === 'create'
                        ? 'border-[#d3e3bf] bg-[#f4faea] shadow-[0_18px_36px_-30px_rgba(109,141,73,0.35)]'
                        : 'border-[#e3e9db] bg-[#fbfcf8] hover:border-[#d6dfcc]'
                    } ${currentUser?.to_chuc ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2 text-[#223021]">
                      <Building2 className="h-4 w-4 text-[#739055]" />
                      <span className="font-medium">Tạo không gian làm việc mới</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#647260]">
                      Bắt đầu luôn với một không gian riêng để tạo dự án và mời mọi người vào làm việc.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkspaceChoice('later')}
                    className={`rounded-[26px] border px-4 py-5 text-left transition-all ${
                      workspaceChoice === 'later'
                        ? 'border-[#d6e2ea] bg-[#f1f8fc] shadow-[0_18px_36px_-30px_rgba(75,112,145,0.22)]'
                        : 'border-[#e3e9db] bg-[#fbfcf8] hover:border-[#d6dfcc]'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[#223021]">
                      <UserRound className="h-4 w-4 text-[#56799b]" />
                      <span className="font-medium">Hoàn thiện hồ sơ trước</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#647260]">
                      Vào sản phẩm trước với hồ sơ cá nhân. Khi cần làm việc cùng team, bạn có thể tạo tổ chức sau.
                    </p>
                  </button>
                </div>

                {shouldShowOrganizationForm ? (
                  <div className="space-y-4 rounded-[28px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] p-5">
                    <div>
                      <Label htmlFor="tenToChuc">Tên tổ chức</Label>
                      <Input
                        id="tenToChuc"
                        placeholder="Ví dụ: VSmart Studio"
                        value={tenToChuc}
                        onChange={(event) => setTenToChuc(event.target.value)}
                        className="mt-1.5 border-[#dfe5d6] bg-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="moTaToChuc">Mô tả ngắn</Label>
                      <Textarea
                        id="moTaToChuc"
                        placeholder="Mô tả ngắn về team hoặc không gian làm việc này."
                        value={moTaToChuc}
                        onChange={(event) => setMoTaToChuc(event.target.value)}
                        className="mt-1.5 min-h-[110px] border-[#dfe5d6] bg-white"
                      />
                    </div>

                    <div className="rounded-[20px] border border-[#dce5d2] bg-white/80 px-4 py-3 text-sm leading-6 text-[#52614f]">
                      Người tạo đầu tiên sẽ là <strong>owner</strong> để quản lý không gian làm việc này.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-[#dce5d2] bg-[#f6f9f1] px-5 py-5 text-sm leading-6 text-[#52614f]">
                    {currentUser?.to_chuc
                      ? 'Tài khoản của bạn đã có sẵn không gian làm việc. Hoàn tất hồ sơ rồi vào làm việc ngay.'
                      : 'Bạn sẽ vào sản phẩm với hồ sơ cá nhân đã hoàn thiện. Khi cần bắt đầu dự án cho team, hãy tạo tổ chức sau.'}
                  </div>
                )}

                {error ? <div className="rounded-[20px] border border-[#f0ddd1] bg-[#fff5ef] px-4 py-3 text-sm text-[#a05735]">{error}</div> : null}

                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={() => setStep(1)} className="border-[#e0e6d7] bg-white text-[#5d6958] hover:bg-[#f6f8f1]">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Quay lại
                  </Button>
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
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
