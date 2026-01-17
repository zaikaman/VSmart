import { getUser, signOut } from '@/lib/supabase/auth';
import Link from 'next/link';

export async function AuthButton() {
    const user = await getUser();

    if (user) {
        return (
            <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="flex items-center gap-2">
                    {user.user_metadata?.avatar_url ? (
                        <img
                            src={user.user_metadata.avatar_url}
                            alt="Avatar"
                            className="h-8 w-8 rounded-full border border-white/20"
                        />
                    ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-sm font-medium text-purple-300">
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span className="hidden text-sm text-gray-300 md:inline">
                        {user.user_metadata?.full_name || user.email?.split('@')[0]}
                    </span>
                </div>

                {/* Nút đăng xuất */}
                <form action={signOut}>
                    <button
                        type="submit"
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/10"
                    >
                        Đăng xuất
                    </button>
                </form>
            </div>
        );
    }

    return (
        <Link
            href="/login"
            className="rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-2 text-sm font-medium text-white transition-all hover:from-purple-600 hover:to-blue-600 hover:shadow-lg hover:shadow-purple-500/25"
        >
            Đăng nhập
        </Link>
    );
}
