import { getUser } from '@/lib/supabase/auth';
import Link from 'next/link';

// Server component để quyết định href cho nút "Bắt đầu ngay"
export async function StartButton({
    className,
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    const user = await getUser();

    // Nếu đã đăng nhập -> dashboard, nếu chưa -> login
    const href = user ? '/dashboard' : '/login';

    return (
        <Link
            href={href}
            className={`flex items-start px-[35px] py-[20px] max-xl:px-[25px] max-xl:py-[15px] max-sm:px-[20px] max-sm:py-[10px] relative rounded-[14px] shrink-0 font-normal leading-[28px] text-[20px] text-center transition-colors cursor-pointer border border-[#191a23] border-solid text-black hover:bg-[#f5f5f5] ${className || ''}`}
        >
            {children}
        </Link>
    );
}
