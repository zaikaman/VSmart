'use server';

import { createSupabaseServerClient } from './server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

// Đăng nhập với Google OAuth
export async function signInWithGoogle() {
    const supabase = await createSupabaseServerClient();
    const origin = (await headers()).get('origin');

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${origin}/auth/callback`,
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
