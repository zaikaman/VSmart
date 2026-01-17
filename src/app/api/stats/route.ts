import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

// GET /api/stats - Lấy thống kê dashboard
export async function GET() {
    try {
        // Đếm tổng số dự án
        const { count: projectCount } = await supabase
            .from('du_an')
            .select('*', { count: 'exact', head: true });

        // Đếm số tasks đang thực hiện
        const { count: inProgressTaskCount } = await supabase
            .from('task')
            .select('*', { count: 'exact', head: true })
            .eq('trang_thai', 'in-progress')
            .is('deleted_at', null);

        // Đếm tổng số người dùng
        const { count: userCount } = await supabase
            .from('nguoi_dung')
            .select('*', { count: 'exact', head: true });

        return NextResponse.json({
            data: {
                totalProjects: projectCount || 0,
                inProgressTasks: inProgressTaskCount || 0,
                totalUsers: userCount || 0,
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
