import { NextResponse } from 'next/server';
import {
  getDashboardCurrentUser,
  getDashboardOrganization,
  getDashboardOrganizationInvitations,
  getDashboardStats,
  getRecentProjects,
} from '@/lib/dashboard/dashboard-data';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getDashboardCurrentUser(user.email);

    if (!currentUser) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin người dùng' }, { status: 404 });
    }

    const organization = await getDashboardOrganization(currentUser.to_chuc?.id);

    const [organizationInvitations, projects, stats] = await Promise.all([
      getDashboardOrganizationInvitations(user.email),
      getRecentProjects(user.email, 6),
      organization ? getDashboardStats(user.email) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      data: {
        currentUser,
        organization,
        organizationInvitations,
        projects,
        stats,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/dashboard/bootstrap:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
