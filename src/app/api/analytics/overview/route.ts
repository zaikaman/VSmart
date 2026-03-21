import { NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/tasks/auth';
import { hasPermission } from '@/lib/auth/permissions';
import { getAnalyticsOverview } from '@/lib/analytics/overview-service';

export async function GET() {
  try {
    const { authUser, dbUser } = await getAuthenticatedUserContext();

    if (!hasPermission({ appRole: dbUser.vai_tro as 'admin' | 'manager' | 'member' }, 'viewAnalytics')) {
      return NextResponse.json({ error: 'Bạn không có quyền xem analytics' }, { status: 403 });
    }

    const data = await getAnalyticsOverview(authUser.email);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in GET /api/analytics/overview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
