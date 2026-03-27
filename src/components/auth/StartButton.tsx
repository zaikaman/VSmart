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
            className={`inline-flex items-center gap-2 px-5 py-2 max-xl:px-4 max-xl:py-1.5 max-sm:px-3 max-sm:py-1.5 relative rounded-full shrink-0 font-semibold text-sm text-center transition-all cursor-pointer border border-[#e6f8c9] bg-[#d4f59f] text-[#1c2b1b] hover:translate-y-[-1px] hover:bg-[#c4ea8f] ${className || ''}`}
        >
            {children}
        </Link>
    );
}
