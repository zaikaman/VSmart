import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

// GET /api/users - Lấy danh sách người dùng
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('nguoi_dung')
            .select('id, ten, email, avatar_url, vai_tro, phong_ban_id')
            .order('ten', { ascending: true });

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
