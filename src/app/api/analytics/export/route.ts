import { NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/tasks/auth';
import { hasPermission } from '@/lib/auth/permissions';
import { buildAnalyticsCsv } from '@/lib/analytics/overview-service';

export async function GET() {
  try {
    const { authUser, dbUser } = await getAuthenticatedUserContext();

    if (!hasPermission({ appRole: dbUser.vai_tro as 'admin' | 'manager' | 'member' }, 'exportAnalytics')) {
      return NextResponse.json({ error: 'Bạn không có quyền xuất báo cáo' }, { status: 403 });
    }

    const csv = await buildAnalyticsCsv(authUser.email);
    const fileName = `bao-cao-vsmart-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/analytics/export:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
