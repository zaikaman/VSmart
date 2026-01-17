import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendDeadlineReminderEmail, shouldSendNotification } from '@/lib/email/notifications';

// Cron job để gửi email nhắc nhở deadline
// Endpoint này nên được gọi hàng ngày bởi một cron scheduler (ví dụ: Vercel Cron, GitHub Actions)
// URL: GET /api/cron/send-deadline-reminders

export async function GET() {
    try {
        // Sử dụng service role để bypass RLS
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const threeDaysFromNow = new Date(now);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        // Lấy các tasks có deadline trong vòng 3 ngày tới và chưa done
        const { data: upcomingTasks, error } = await supabase
            .from('task')
            .select(`
                id,
                ten,
                deadline,
                assignee_id,
                nguoi_dung:assignee_id (id, email, ten),
                phan_du_an (
                    du_an (ten)
                )
            `)
            .is('deleted_at', null)
            .neq('trang_thai', 'done')
            .lte('deadline', threeDaysFromNow.toISOString())
            .gte('deadline', now.toISOString())
            .not('assignee_id', 'is', null);

        if (error) {
            console.error('Error fetching tasks for deadline reminders:', error);
            return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
        }

        let emailsSent = 0;
        let emailsFailed = 0;

        for (const task of upcomingTasks || []) {
            try {
                // Handle assignee (can be array or object)
                const assignee = Array.isArray(task.nguoi_dung)
                    ? task.nguoi_dung[0]
                    : task.nguoi_dung;

                if (!assignee?.email) continue;

                // Check if user has notification enabled
                const shouldSend = await shouldSendNotification(assignee.email, 'emailDeadlineReminder');
                if (!shouldSend) continue;

                // Calculate days remaining
                const deadlineDate = new Date(task.deadline);
                const daysRemaining = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                // Get project name - use type assertion for nested relations
                const phanDuAn = Array.isArray(task.phan_du_an) ? task.phan_du_an[0] : task.phan_du_an;
                const duAn = (phanDuAn as { du_an?: { ten?: string } | { ten?: string }[] | null })?.du_an;
                const projectName = Array.isArray(duAn)
                    ? (duAn[0] as { ten?: string })?.ten
                    : (duAn as { ten?: string })?.ten || 'Chưa xác định';

                const success = await sendDeadlineReminderEmail(
                    assignee.email,
                    assignee.ten,
                    {
                        taskId: task.id,
                        taskName: task.ten,
                        projectName: projectName || 'Chưa xác định',
                        deadline: task.deadline,
                    },
                    daysRemaining
                );

                if (success) {
                    emailsSent++;
                    console.log(`Deadline reminder sent to ${assignee.email} for task "${task.ten}"`);
                } else {
                    emailsFailed++;
                }
            } catch (taskError) {
                console.error(`Error processing task ${task.id}:`, taskError);
                emailsFailed++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${upcomingTasks?.length || 0} tasks`,
            emailsSent,
            emailsFailed,
            processedAt: now.toISOString(),
        });
    } catch (error) {
        console.error('Deadline reminder cron error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
