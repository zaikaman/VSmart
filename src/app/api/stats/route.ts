import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// GET /api/stats - Lấy thống kê dashboard theo user
export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();
        
        // Lấy thông tin user hiện tại
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Lấy organization_id của user
        const { data: userData, error: userError } = await supabase
            .from('nguoi_dung')
            .select('id, to_chuc_id')
            .eq('email', user.email)
            .single();

        if (userError) {
            return NextResponse.json(
                { error: 'Không tìm thấy thông tin người dùng' },
                { status: 404 }
            );
        }

        // Đếm số dự án mà user là thành viên active
        const { count: projectCount } = await supabase
            .from('du_an')
            .select('id, thanh_vien_du_an!inner(email, trang_thai)', { count: 'exact', head: true })
            .eq('thanh_vien_du_an.email', user.email)
            .eq('thanh_vien_du_an.trang_thai', 'active');

        // Lấy danh sách project IDs mà user tham gia
        const { data: userProjects } = await supabase
            .from('thanh_vien_du_an')
            .select('du_an_id')
            .eq('email', user.email)
            .eq('trang_thai', 'active');

        const projectIds = userProjects?.map(p => p.du_an_id) || [];

        // Đếm số tasks đang thực hiện trong các dự án của user
        let inProgressTaskCount = 0;
        if (projectIds.length > 0) {
            const { count } = await supabase
                .from('task')
                .select('*', { count: 'exact', head: true })
                .in('du_an_id', projectIds)
                .eq('trang_thai', 'in-progress')
                .is('deleted_at', null);
            inProgressTaskCount = count || 0;
        }

        // Đếm số người dùng trong cùng organization
        const { count: userCount } = await supabase
            .from('nguoi_dung')
            .select('*', { count: 'exact', head: true })
            .eq('to_chuc_id', userData.to_chuc_id);

        return NextResponse.json({
            data: {
                totalProjects: projectCount || 0,
                inProgressTasks: inProgressTaskCount,
                totalUsers: userCount || 0,
            },
        });
    } catch (error) {
        console.error('Error in GET /api/stats:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
