import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

// GET /api/phong-ban - Lấy danh sách phòng ban
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('phong_ban')
            .select('*')
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
