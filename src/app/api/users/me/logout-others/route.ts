import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// POST: Đăng xuất tất cả thiết bị khác
export async function POST() {
    try {
        const supabase = await createSupabaseServerClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
        }

        // Đăng xuất tất cả sessions khác ngoài session hiện tại
        const { error } = await supabase.auth.signOut({ scope: 'others' });

        if (error) {
            console.error('Error signing out other sessions:', error);
            return NextResponse.json({ error: 'Không thể đăng xuất các thiết bị khác' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Đã đăng xuất tất cả các thiết bị khác thành công' });
    } catch (error) {
        console.error('Logout other devices error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
