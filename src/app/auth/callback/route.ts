import { NextResponse } from 'next/server';
import { createServerClient, CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard';

    if (code) {
        const cookieStore = await cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(
                        cookiesToSet: {
                            name: string;
                            value: string;
                            options: CookieOptions;
                        }[]
                    ) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            );
                        } catch {
                            // Có thể bị gọi từ Server Component
                        }
                    },
                },
            }
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Lấy thông tin user sau khi đăng nhập
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Kiểm tra xem user đã tồn tại trong bảng nguoi_dung chưa
                const { data: existingUser } = await supabase
                    .from('nguoi_dung')
                    .select('id, avatar_url')
                    .eq('email', user.email)
                    .single();

                // Nếu user mới hoặc chưa có avatar, lấy từ Google
                if (!existingUser || !existingUser.avatar_url) {
                    const googleAvatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;

                    if (googleAvatarUrl) {
                        if (existingUser) {
                            // Cập nhật avatar cho user đã tồn tại
                            await supabase
                                .from('nguoi_dung')
                                .update({ avatar_url: googleAvatarUrl })
                                .eq('id', existingUser.id);
                        } else {
                            // Tạo user mới với avatar từ Google
                            const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';

                            await supabase
                                .from('nguoi_dung')
                                .insert({
                                    email: user.email!,
                                    ten: userName,
                                    avatar_url: googleAvatarUrl,
                                    mat_khau_hash: '', // OAuth users không cần password
                                    onboarding_completed: false
                                });
                        }
                    }
                }
            }

            // Lấy settings của user để redirect đến trang mặc định
            let redirectPath = next; // Default fallback

            if (next === '/dashboard') {
                // Chỉ override nếu không có explicit next param
                const { data: userData } = await supabase
                    .from('nguoi_dung')
                    .select('settings')
                    .eq('email', user?.email)
                    .single();

                const userSettings = userData?.settings;
                if (userSettings?.dashboard?.defaultPage) {
                    redirectPath = userSettings.dashboard.defaultPage;
                }
            }

            const forwardedHost = request.headers.get('x-forwarded-host');
            const isLocalEnv = process.env.NODE_ENV === 'development';

            if (isLocalEnv) {
                // Trong môi trường local, không có load balancer
                return NextResponse.redirect(`${origin}${redirectPath}`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`);
            } else {
                return NextResponse.redirect(`${origin}${redirectPath}`);
            }
        }
    }

    // Trả về trang lỗi nếu có vấn đề
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
