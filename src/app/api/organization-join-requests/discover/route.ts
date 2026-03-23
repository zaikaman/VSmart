import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import type { Organization } from '@/app/api/organizations/route';

export interface DiscoverableOrganization {
  id: string;
  ten: string;
  mo_ta: string | null;
}

function allowsJoinRequests(settings: Organization['settings'] | Record<string, unknown> | null | undefined) {
  return Boolean(settings && 'allow_join_requests' in settings && settings.allow_join_requests);
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

    if (currentUser.to_chuc_id) {
      return NextResponse.json([]);
    }

    const query = request.nextUrl.searchParams.get('q')?.trim();

    let organizationQuery = supabaseAdmin
      .from('to_chuc')
      .select('id, ten, mo_ta, settings')
      .order('ten', { ascending: true })
      .limit(12);

    if (query) {
      organizationQuery = organizationQuery.ilike('ten', `%${query}%`);
    }

    const { data, error } = await organizationQuery;

    if (error) {
      return NextResponse.json({ error: 'Không thể tải danh sách tổ chức' }, { status: 500 });
    }

    const organizations: DiscoverableOrganization[] = (data || [])
      .filter((organization) => allowsJoinRequests(organization.settings as Organization['settings']))
      .map((organization) => ({
        id: organization.id,
        ten: organization.ten,
        mo_ta: organization.mo_ta,
      }));

    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error in GET /api/organization-join-requests/discover:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
