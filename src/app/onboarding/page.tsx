'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, CheckCircle2, Layers3, UserRound, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SetupMode = 'create-workspace' | 'join-later';

const teamTypeOptions = [
  { value: 'ca-nhan', label: 'Làm việc cá nhân', description: 'Gọn nhẹ, phù hợp để tự quản lý đầu việc và deadline.' },
  { value: 'nhom-nho', label: 'Nhóm nhỏ', description: 'Phù hợp cho team 3-10 người cần phối hợp hằng ngày.' },
  { value: 'phong-ban', label: 'Phòng ban', description: 'Dễ mở rộng khi cần chia việc theo vai trò hoặc tuyến phụ trách.' },
  { value: 'cong-ty', label: 'Toàn công ty', description: 'Dành cho không gian chung của nhiều team hoặc nhiều dự án.' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [setupMode, setSetupMode] = useState<SetupMode>('create-workspace');
  const [hoTen, setHoTen] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [teamType, setTeamType] = useState('nhom-nho');
  const [workspaceDescription, setWorkspaceDescription] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'workspace') {
      setSetupMode('create-workspace');
      setStep(2);
    }
  }, []);

  const totalSteps = setupMode === 'create-workspace' ? 3 : 2;
  const currentStep = useMemo(() => {
    if (step === 1) return 1;
    if (step === 2) return 2;
    return totalSteps;
  }, [step, totalSteps]);

  const progressWidth = `${(currentStep / totalSteps) * 100}%`;

  const handleSetupChoice = (mode: SetupMode) => {
    setSetupMode(mode);
    setError('');
    setStep(2);
  };

  const handleProfileNext = () => {
    if (!hoTen.trim()) {
      setError('Vui lòng nhập tên hiển thị để tiếp tục.');
      return;
    }

    setError('');

    if (setupMode === 'join-later') {
      handleComplete();
      return;
    }

    setStep(3);
  };

  const handleComplete = async () => {
    if (!hoTen.trim()) {
      setError('Vui lòng nhập tên hiển thị để tiếp tục.');
      return;
    }

    if (setupMode === 'create-workspace' && !workspaceName.trim()) {
      setError('Vui lòng đặt tên cho không gian làm việc.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (setupMode === 'create-workspace') {
        const workspaceSummary = workspaceDescription.trim()
          ? `${teamTypeOptions.find((item) => item.value === teamType)?.label || 'Nhóm làm việc'} • ${workspaceDescription.trim()}`
          : teamTypeOptions.find((item) => item.value === teamType)?.label || null;

        const workspaceResponse = await fetch('/api/organizations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ten: workspaceName.trim(),
            mo_ta: workspaceSummary,
          }),
        });

        if (!workspaceResponse.ok) {
          const errorData = await workspaceResponse.json().catch(() => null);
          throw new Error(errorData?.error || 'Không thể tạo không gian làm việc.');
        }
      }

      const userResponse = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ten: hoTen.trim(),
          ten_cong_ty: setupMode === 'create-workspace' ? workspaceName.trim() : undefined,
          onboarding_completed: true,
        }),
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => null);
        throw new Error(errorData?.error || 'Không thể cập nhật hồ sơ.');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
      console.error('Onboarding error:', err);
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(183,224,140,0.28),_transparent_32%),linear-gradient(135deg,#f7f5ee_0%,#f1f4ea_48%,#e7efe8_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden rounded-[36px] border border-[#d9e4d1] bg-[#203228] px-6 py-7 text-[#f4f6ef] shadow-[0_24px_80px_rgba(23,34,28,0.18)] md:px-8 md:py-9">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(198,244,126,0.18),_transparent_58%)]" />
          <div className="relative flex h-full flex-col">
            <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#dce7d1]">
              VSmart
            </div>

            <div className="mt-8 space-y-5">
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.26em] text-[#a7c78d]">Bắt đầu nhanh</p>
                <h1 className="max-w-xl text-[clamp(2.25rem,4vw,4rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
                  Thiết lập nhịp làm việc trước khi đẩy dự án vào guồng.
                </h1>
                <p className="max-w-lg text-sm leading-7 text-[#d8e3d1] md:text-base">
                  Vào nhanh để tạo dự án đầu tiên, mời cộng tác viên và để AI bắt đầu theo dõi tiến độ, rủi ro và tải công việc.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <p className="text-sm font-medium text-white">Không gian làm việc linh hoạt</p>
                  <p className="mt-2 text-sm leading-6 text-[#d0dcc8]">
                    Bạn có thể tạo workspace mới ngay bây giờ hoặc vào trước rồi tham gia team sau bằng lời mời.
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <p className="text-sm font-medium text-white">Ưu tiên giá trị đầu tiên</p>
                  <p className="mt-2 text-sm leading-6 text-[#d0dcc8]">
                    Sau bước này, trọng tâm sẽ là dự án, task và lịch phối hợp thay vì biểu mẫu hành chính.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-8">
              <div className="rounded-[28px] border border-white/10 bg-[#f3f6ec] p-5 text-[#233227]">
                <p className="text-xs uppercase tracking-[0.2em] text-[#6b7f65]">Nhịp khởi động được gợi ý</p>
                <div className="mt-4 space-y-4">
                  {[
                    'Chọn cách vào hệ thống phù hợp với team của bạn',
                    'Cập nhật tên hiển thị để bắt đầu cộng tác',
                    'Tạo workspace mới hoặc vào dashboard để tham gia sau',
                  ].map((item, index) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dff0c8] text-sm font-semibold text-[#233227]">
                        {index + 1}
                      </div>
                      <p className="pt-1 text-sm leading-6 text-[#445542]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <Card className="border-[#d9e4d1] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,250,243,0.98)_100%)] shadow-[0_22px_70px_rgba(81,101,67,0.12)]">
          <CardHeader className="space-y-5 pb-0">
            <div className="space-y-3">
              <CardTitle className="text-[1.85rem] tracking-[-0.03em] text-[#203228]">
                {step === 1 ? 'Bạn muốn bắt đầu theo cách nào?' : 'Thiết lập nhanh để vào làm việc'}
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-[#66745f]">
                {setupMode === 'create-workspace'
                  ? 'Tạo xong workspace là bạn có thể mở dự án đầu tiên ngay.'
                  : 'Bạn có thể vào dashboard trước, sau đó tham gia team khi đã có lời mời.'}
              </CardDescription>
            </div>

            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-[#e6ecde]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#b0df71_0%,#7fb65b_100%)] transition-all duration-300"
                  style={{ width: progressWidth }}
                />
              </div>
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-[#7d8974]">
                <span>Bước {currentStep}</span>
                <span>{totalSteps} bước</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {step === 1 ? (
              <div className="grid gap-4">
                <button
                  type="button"
                  onClick={() => handleSetupChoice('create-workspace')}
                  className="group rounded-[28px] border border-[#d7e5ca] bg-[#f7fbf1] p-5 text-left transition hover:border-[#aacd82] hover:bg-[#f1f8e8]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#dff0c8] text-[#203228]">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-[#203228]">Tạo không gian làm việc mới</p>
                          <p className="text-sm text-[#64725d]">Dành cho người đang thiết lập team hoặc workspace đầu tiên.</p>
                        </div>
                      </div>
                      <p className="max-w-md text-sm leading-6 text-[#50614f]">
                        Bạn sẽ đặt tên workspace, chọn quy mô phù hợp rồi vào dashboard để tạo dự án và mời cộng tác viên.
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-5 w-5 text-[#6b8d4e] transition-transform group-hover:translate-x-1" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetupChoice('join-later')}
                  className="group rounded-[28px] border border-[#e4e7df] bg-white p-5 text-left transition hover:border-[#c9d4be] hover:bg-[#fbfcf8]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef2ea] text-[#42533d]">
                          <UsersRound className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-[#203228]">Vào trước, tham gia team sau</p>
                          <p className="text-sm text-[#64725d]">Phù hợp khi bạn đang chờ lời mời hoặc chỉ muốn khám phá nhanh.</p>
                        </div>
                      </div>
                      <p className="max-w-md text-sm leading-6 text-[#50614f]">
                        Dashboard vẫn mở được. Khi có lời mời hoặc cần tạo workspace, bạn có thể hoàn tất ở bước sau.
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-5 w-5 text-[#7c8776] transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-6">
                <div className="rounded-[26px] border border-[#e5eadf] bg-[#fbfcf8] p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#edf4e5] text-[#42533d]">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-[#203228]">Tên hiển thị của bạn</p>
                      <p className="text-sm leading-6 text-[#66745f]">
                        Tên này sẽ xuất hiện trên task, bình luận và các nhắc việc trong team.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <Label htmlFor="hoTen" className="text-[#314231]">
                      Họ và tên
                    </Label>
                    <Input
                      id="hoTen"
                      type="text"
                      placeholder="Ví dụ: Nguyễn Minh Anh"
                      value={hoTen}
                      onChange={(event) => setHoTen(event.target.value)}
                      className="mt-2 h-12 border-[#dce5d2] bg-white text-[#203228]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Button variant="outline" className="border-[#d8e2cd] bg-white text-[#556451] hover:bg-[#f6f8f1]" onClick={() => setStep(1)} disabled={loading}>
                    Quay lại
                  </Button>
                  <Button className="border border-[#96bf62] bg-[#b7e07c] text-[#1d2a18] hover:bg-[#add66f]" onClick={handleProfileNext} disabled={loading}>
                    {loading ? 'Đang xử lý...' : setupMode === 'join-later' ? 'Vào dashboard' : 'Tiếp tục'}
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-6">
                <div className="rounded-[26px] border border-[#dbe7cf] bg-[linear-gradient(180deg,#f7fbf1_0%,#f3f8eb_100%)] p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#dff0c8] text-[#203228]">
                      <Layers3 className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-[#203228]">Thiết lập không gian làm việc</p>
                      <p className="text-sm leading-6 text-[#66745f]">
                        Đây là nơi gom dự án, thành viên và các nhịp theo dõi chung của team.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <Label htmlFor="workspaceName" className="text-[#314231]">
                        Tên không gian làm việc
                      </Label>
                      <Input
                        id="workspaceName"
                        type="text"
                        placeholder="Ví dụ: VSmart Product Team"
                        value={workspaceName}
                        onChange={(event) => setWorkspaceName(event.target.value)}
                        className="mt-2 h-12 border-[#dce5d2] bg-white text-[#203228]"
                      />
                    </div>

                    <div>
                      <Label className="text-[#314231]">Quy mô làm việc</Label>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        {teamTypeOptions.map((option) => {
                          const isActive = option.value === teamType;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setTeamType(option.value)}
                              className={`rounded-[22px] border p-4 text-left transition ${
                                isActive
                                  ? 'border-[#93bb62] bg-white shadow-[0_10px_24px_rgba(122,163,87,0.14)]'
                                  : 'border-[#dde5d5] bg-[#f9fbf6] hover:border-[#bfd4a7] hover:bg-white'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-[#203228]">{option.label}</p>
                                  <p className="mt-2 text-sm leading-6 text-[#66745f]">{option.description}</p>
                                </div>
                                {isActive ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[#6c9a43]" /> : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="workspaceDescription" className="text-[#314231]">
                        Ghi chú ngắn
                      </Label>
                      <Input
                        id="workspaceDescription"
                        type="text"
                        placeholder="Ví dụ: Theo dõi backlog, sprint và việc phối hợp liên phòng"
                        value={workspaceDescription}
                        onChange={(event) => setWorkspaceDescription(event.target.value)}
                        className="mt-2 h-12 border-[#dce5d2] bg-white text-[#203228]"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-dashed border-[#d6e4c7] bg-[#f9fbf4] p-4 text-sm leading-6 text-[#5d6c57]">
                  Bạn có thể bổ sung tên công ty, phòng ban hoặc logo sau trong hồ sơ và cài đặt tổ chức. Ở bước này, chỉ cần đủ để bắt đầu làm việc.
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Button variant="outline" className="border-[#d8e2cd] bg-white text-[#556451] hover:bg-[#f6f8f1]" onClick={() => setStep(2)} disabled={loading}>
                    Quay lại
                  </Button>
                  <Button className="border border-[#96bf62] bg-[#b7e07c] text-[#1d2a18] hover:bg-[#add66f]" onClick={handleComplete} disabled={loading}>
                    {loading ? 'Đang tạo workspace...' : 'Vào dashboard'}
                  </Button>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-[20px] border border-[#f0d8cd] bg-[#fff3ee] px-4 py-3 text-sm text-[#a25b3c]">
                {error}
              </div>
            ) : null}

            <div className="border-t border-[#e7ece1] pt-5 text-sm leading-6 text-[#6a7864]">
              <p>
                Đã có tài khoản và chỉ muốn quay về trang đăng nhập?{' '}
                <Link href="/login" className="font-medium text-[#42533d] underline-offset-4 hover:underline">
                  Mở lại trang đăng nhập
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
