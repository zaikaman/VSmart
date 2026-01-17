import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// DELETE: Xóa tài khoản người dùng
export async function DELETE() {
    try {
        const supabase = await createSupabaseServerClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
        }

        // Lấy nguoi_dung record
        const { data: nguoiDung, error: fetchError } = await supabase
            .from('nguoi_dung')
            .select('id')
            .eq('email', user.email)
            .single();

        if (fetchError || !nguoiDung) {
            console.error('Error finding user:', fetchError);
            return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
        }

        // Xóa dữ liệu liên quan trong nguoi_dung (các FK sẽ cascade)
        const { error: deleteError } = await supabase
            .from('nguoi_dung')
            .delete()
            .eq('id', nguoiDung.id);

        if (deleteError) {
            console.error('Error deleting user data:', deleteError);
            return NextResponse.json({ error: 'Không thể xóa dữ liệu người dùng' }, { status: 500 });
        }

        // Đăng xuất user
        await supabase.auth.signOut();

        return NextResponse.json({ message: 'Đã xóa tài khoản thành công' });
    } catch (error) {
        console.error('Delete account error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
