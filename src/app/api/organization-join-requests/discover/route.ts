import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export interface DiscoverableOrganization {
  id: string;
  ten: string;
  mo_ta: string | null;
}

export interface DiscoverOrganizationsResponse {
  data: DiscoverableOrganization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser, error: currentUserError } = await supabaseAdmin
      .from('nguoi_dung')
      .select('id, to_chuc_id')
      .eq('email', user.email)
      .single();

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin người dùng' }, { status: 404 });
    }

    const query = request.nextUrl.searchParams.get('q')?.trim();
    const pageParam = Number(request.nextUrl.searchParams.get('page') || '1');
    const limitParam = Number(request.nextUrl.searchParams.get('limit') || '10');

    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 50) : 10;

    if (currentUser.to_chuc_id) {
      return NextResponse.json({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      } satisfies DiscoverOrganizationsResponse);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let organizationQuery = supabaseAdmin
      .from('to_chuc')
      .select('id, ten, mo_ta', { count: 'exact' })
      .contains('settings', { allow_join_requests: true })
      .order('ten', { ascending: true });

    if (query) {
      organizationQuery = organizationQuery.ilike('ten', `%${query}%`);
    }

    const { data, error, count } = await organizationQuery.range(from, to);

    if (error) {
      return NextResponse.json({ error: 'Không thể tải danh sách tổ chức' }, { status: 500 });
    }

    const organizations: DiscoverableOrganization[] = (data || []).map((organization) => ({
      id: organization.id,
      ten: organization.ten,
      mo_ta: organization.mo_ta,
    }));

    const total = count ?? 0;

    return NextResponse.json({
      data: organizations,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    } satisfies DiscoverOrganizationsResponse);
  } catch (error) {
    console.error('Error in GET /api/organization-join-requests/discover:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
