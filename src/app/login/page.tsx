import { signInWithGoogle } from '@/lib/supabase/auth';
import Logo from '@/components/landing/Logo';
import Link from 'next/link';

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <div className="flex items-center justify-between px-[100px] max-xl:px-[60px] max-sm:px-[30px] py-[30px] w-full max-w-[1440px] mx-auto">
                <Link href="/" aria-label="Về trang chủ">
                    <Logo className="h-[36px]" />
                </Link>
            </div>

            {/* Main Content */}
            <div className="flex flex-col items-center justify-center px-[30px] pt-[60px] max-sm:pt-[40px] pb-[100px]">
                {/* Card */}
                <div className="w-full max-w-[480px] rounded-[45px] border border-[#191a23] bg-[#f3f3f3] p-[50px] max-sm:p-[30px] max-sm:rounded-[30px]">
                    {/* Header */}
                    <div className="text-center mb-[40px]">
                        <h1 className="text-[36px] max-sm:text-[28px] font-medium leading-tight text-[#191a23]">
                            Chào mừng đến VSmart
                        </h1>
                        <p className="mt-[16px] text-[18px] max-sm:text-[16px] text-[#191a23]/70">
                            Đăng nhập để bắt đầu quản lý dự án thông minh
                        </p>
                    </div>

                    {/* Google Sign In Button */}
                    <form action={signInWithGoogle}>
                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-[12px] rounded-[14px] bg-[#191a23] px-[35px] py-[20px] text-[20px] max-sm:text-[18px] font-normal text-white transition-colors hover:bg-[#2a2b35] cursor-pointer"
                        >
                            {/* Google Icon */}
                            <svg className="h-[24px] w-[24px]" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Đăng nhập với Google
                        </button>
                    </form>

                    {/* Terms */}
                    <p className="mt-[30px] text-center text-[14px] text-[#191a23]/50">
                        Bằng việc đăng nhập, bạn đồng ý với{' '}
                        <Link href="#" className="text-[#191a23] underline hover:no-underline">
                            Điều khoản dịch vụ
                        </Link>{' '}
                        và{' '}
                        <Link href="#" className="text-[#191a23] underline hover:no-underline">
                            Chính sách bảo mật
                        </Link>
                    </p>
                </div>

                {/* Back to home */}
                <Link
                    href="/"
                    className="mt-[30px] text-[18px] text-[#191a23]/70 hover:text-[#191a23] transition-colors"
                >
                    ← Quay lại trang chủ
                </Link>
            </div>
        </div>
    );
}
