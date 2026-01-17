import { createServerClient, CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Tạo Supabase client cho Server Components và Server Actions
export async function createSupabaseServerClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(
                    cookiesToSet: { name: string; value: string; options: CookieOptions }[]
                ) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Có thể bị gọi từ Server Component,
                        // có thể bỏ qua nếu có middleware refreshing user sessions.
                    }
                },
            },
        }
    );
}
