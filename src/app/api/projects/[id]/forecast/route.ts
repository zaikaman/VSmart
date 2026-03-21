import { NextResponse } from 'next/server';
import { getAuthenticatedUserContext, toErrorResponse } from '@/lib/tasks/auth';
import { getProjectForecast } from '@/lib/planning/planning-service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authUser } = await getAuthenticatedUserContext();
    const data = await getProjectForecast({
      email: authUser.email,
      projectId: id,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return toErrorResponse(error, 'Không thể tải dự báo tiến độ dự án');
  }
}
