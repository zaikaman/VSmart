import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

// GET /api/project-parts - Lấy danh sách phần dự án
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const duAnId = searchParams.get('duAnId');

        let query = supabase
            .from('phan_du_an')
            .select('*, phong_ban:phong_ban_id (id, ten)')
            .order('ngay_tao', { ascending: false });

        if (duAnId) {
            query = query.eq('du_an_id', duAnId);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ data });
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
