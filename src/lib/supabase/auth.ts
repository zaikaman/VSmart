'use server';

import { createSupabaseServerClient } from './server';
import { redirect } from 'next/navigation';

// Đăng nhập với Google OAuth
export async function signInWithGoogle() {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
    });

    if (error) {
        console.error('Lỗi đăng nhập với Google:', error.message);
        throw new Error(error.message);
    }

    if (data.url) {
        redirect(data.url);
    }
}

// Đăng xuất
export async function signOut() {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error('Lỗi đăng xuất:', error.message);
        throw new Error(error.message);
    }

    redirect('/');
}

// Lấy thông tin người dùng hiện tại (cho Server Components)
export async function getUser() {
    const supabase = await createSupabaseServerClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error) {
        return null;
    }

    return user;
}
