'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Thông tin cá nhân
  const [hoTen, setHoTen] = useState('');
  
  // Step 2: Thông tin công ty
  const [tenCongTy, setTenCongTy] = useState('');
  const [tenPhongBan, setTenPhongBan] = useState('');
  const [moTaCongTy, setMoTaCongTy] = useState('');

  const handleStep1Next = () => {
    if (!hoTen.trim()) {
      setError('Vui lòng nhập họ tên');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleComplete = async () => {
    if (!tenCongTy.trim() || !tenPhongBan.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin công ty và phòng ban');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Tạo organization
      const orgResponse = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ten: tenCongTy,
          mo_ta: moTaCongTy,
        }),
      });

      if (!orgResponse.ok) {
        const errorData = await orgResponse.json();
        throw new Error(errorData.error || 'Không thể tạo tổ chức');
      }

      // Cập nhật thông tin người dùng
      const userResponse = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ten: hoTen,
          ten_cong_ty: tenCongTy,
          ten_phong_ban: tenPhongBan,
          onboarding_completed: true,
        }),
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.error || 'Không thể cập nhật thông tin người dùng');
      }

      // Chuyển đến dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-2xl border-slate-200 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Chào mừng đến với VSmart! 🎉</CardTitle>
          <CardDescription>
            Hãy cho chúng tôi biết một chút về bạn và tổ chức của bạn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-center space-x-2 mb-8">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              step >= 1 ? 'bg-[#b9ff66] text-black' : 'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-[#b9ff66]' : 'bg-gray-200'}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              step >= 2 ? 'bg-[#b9ff66] text-black' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
          </div>

          {/* Step 1: Thông tin cá nhân */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Thông tin cá nhân</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="hoTen">Họ và tên *</Label>
                    <Input
                      id="hoTen"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={hoTen}
                      onChange={(e) => setHoTen(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleStep1Next} className="bg-black hover:bg-gray-800 text-white">
                  Tiếp theo
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Thông tin công ty */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Thông tin công ty</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="tenCongTy">Tên công ty *</Label>
                    <Input
                      id="tenCongTy"
                      type="text"
                      placeholder="Công ty TNHH ABC"
                      value={tenCongTy}
                      onChange={(e) => setTenCongTy(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tenPhongBan">Phòng ban của bạn *</Label>
                    <Input
                      id="tenPhongBan"
                      type="text"
                      placeholder="Phòng Công nghệ thông tin"
                      value={tenPhongBan}
                      onChange={(e) => setTenPhongBan(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="moTaCongTy">Mô tả công ty (không bắt buộc)</Label>
                    <Input
                      id="moTaCongTy"
                      type="text"
                      placeholder="Công ty chuyên về phát triển phần mềm"
                      value={moTaCongTy}
                      onChange={(e) => setMoTaCongTy(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="border-slate-300 hover:bg-slate-100"
                >
                  Quay lại
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={loading}
                  className="bg-black hover:bg-gray-800 text-white disabled:opacity-50"
                >
                  {loading ? 'Đang xử lý...' : 'Hoàn tất'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
