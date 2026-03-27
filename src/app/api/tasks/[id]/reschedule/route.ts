import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getTaskAccessContext, toErrorResponse } from '@/lib/tasks/auth';
import { isWeekendDate } from '@/lib/utils/workload-utils';

const rescheduleSchema = z.object({
  deadline: z.string().datetime(),
  reason: z.string().max(240).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { taskData } = await getTaskAccessContext(id);
    const body = await request.json();
    const parsed = rescheduleSchema.parse(body);

    const nextDeadline = new Date(parsed.deadline);
    const warnings: string[] = [];

    if (isWeekendDate(nextDeadline)) {
      warnings.push('Deadline mới rơi vào cuối tuần. Nên xác nhận lại khả năng xử lý của người phụ trách.');
    }

    if (nextDeadline.getTime() < Date.now()) {
      warnings.push('Deadline mới nằm trong quá khứ. Hãy kiểm tra lại trước khi chốt.');
    }

    if (taskData.assignee_id) {
      const dayStart = new Date(nextDeadline);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(nextDeadline);
      dayEnd.setHours(23, 59, 59, 999);

      const { data: conflicts, error: conflictError } = await supabaseAdmin
        .from('task')
        .select('id')
        .eq('assignee_id', taskData.assignee_id)
        .neq('id', id)
        .is('deleted_at', null)
        .neq('trang_thai', 'done')
        .gte('deadline', dayStart.toISOString())
        .lte('deadline', dayEnd.toISOString());

      if (conflictError) {
        throw new Error(conflictError.message);
      }

      if ((conflicts || []).length >= 3) {
        warnings.push('Người phụ trách đã có nhiều task dồn vào cùng ngày. Hệ thống ghi nhận nguy cơ xung đột tải.');
      }
    }

    const { data, error } = await supabaseAdmin
      .from('task')
      .update({
        deadline: parsed.deadline,
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select(
        `
        id,
        ten,
        deadline,
        assignee_id,
        priority,
        trang_thai,
        progress,
        risk_score
      `
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Không thể cập nhật deadline');
    }

    return NextResponse.json({
      data,
      warnings,
      message: parsed.reason?.trim()
        ? `Đã dời lịch task. Ghi chú: ${parsed.reason.trim()}`
        : 'Đã cập nhật deadline mới cho task',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }

    return toErrorResponse(error, 'Không thể dời lịch task');
  }
}
