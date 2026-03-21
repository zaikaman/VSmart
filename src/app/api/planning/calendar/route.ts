import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserContext, toErrorResponse } from '@/lib/tasks/auth';
import { getCalendarPlanningData } from '@/lib/planning/planning-service';

const planningCalendarQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
});

export async function GET(request: NextRequest) {
  try {
    const { authUser } = await getAuthenticatedUserContext();
    const searchParams = request.nextUrl.searchParams;
    const parsed = planningCalendarQuerySchema.parse({
      projectId: searchParams.get('projectId') || undefined,
      assigneeId: searchParams.get('assigneeId') || undefined,
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
    });

    const data = await getCalendarPlanningData({
      email: authUser.email,
      projectId: parsed.projectId,
      assigneeId: parsed.assigneeId,
      dateFrom: parsed.dateFrom,
      dateTo: parsed.dateTo,
    });

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return toErrorResponse(error, 'Không thể tải dữ liệu lịch planning');
  }
}
