import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// GET /api/users - Lấy danh sách người dùng (có thể lọc theo dự án)
export async function GET(request: NextRequest) {
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

        const searchParams = request.nextUrl.searchParams;
        const projectId = searchParams.get('projectId');

        let data, error;

        if (projectId) {
            // Lấy thành viên của dự án cụ thể
            // Lấy danh sách email từ thanh_vien_du_an
            const { data: membersData, error: membersError } = await supabase
                .from('thanh_vien_du_an')
                .select('email, vai_tro')
                .eq('du_an_id', projectId)
                .eq('trang_thai', 'active');

            if (membersError) {
                error = membersError;
            } else if (membersData && membersData.length > 0) {
                const emails = membersData.map(m => m.email);
                
                // Lấy thông tin người dùng từ bảng nguoi_dung
                const result = await supabase
                    .from('nguoi_dung')
                    .select('id, ten, email, avatar_url, vai_tro, phong_ban_id')
                    .in('email', emails);

                if (result.error) {
                    error = result.error;
                } else {
                    // Transform data để thêm project_role
                    data = result.data?.map((user: any) => {
                        const memberInfo = membersData.find(m => m.email === user.email);
                        return {
                            ...user,
                            project_role: memberInfo?.vai_tro,
                        };
                    });
                }
            } else {
                data = [];
            }
        } else {
            // Lấy tất cả người dùng trong cùng organization
            const { data: userData } = await supabase
                .from('nguoi_dung')
                .select('to_chuc_id')
                .eq('email', user.email)
                .single();

            if (!userData?.to_chuc_id) {
                return NextResponse.json({ data: [] });
            }

            const result = await supabase
                .from('nguoi_dung')
                .select('id, ten, email, avatar_url, vai_tro, phong_ban_id')
                .eq('to_chuc_id', userData.to_chuc_id)
                .order('ten', { ascending: true });

            data = result.data;
            error = result.error;
        }

        if (error) {
            console.error('Error fetching users:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Error in GET /api/users:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
