import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserContext, toErrorResponse } from '@/lib/tasks/auth';
import { getWorkloadPlanningData } from '@/lib/planning/planning-service';

const workloadQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { authUser } = await getAuthenticatedUserContext();
    const searchParams = request.nextUrl.searchParams;
    const parsed = workloadQuerySchema.parse({
      projectId: searchParams.get('projectId') || undefined,
      assigneeId: searchParams.get('assigneeId') || undefined,
    });

    const data = await getWorkloadPlanningData({
      email: authUser.email,
      projectId: parsed.projectId,
      assigneeId: parsed.assigneeId,
    });

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return toErrorResponse(error, 'Không thể tải dữ liệu workload');
  }
}
