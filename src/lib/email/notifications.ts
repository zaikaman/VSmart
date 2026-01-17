import { sendMail } from './mail';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface TaskInfo {
    taskId: string;
    taskName: string;
    projectName: string;
    deadline?: string;
    priority?: string;
}

interface CommentInfo {
    taskId: string;
    taskName: string;
    commenterName: string;
    commentContent: string;
}

// Email khi được assign task mới
export async function sendTaskAssignedEmail(
    recipientEmail: string,
    recipientName: string,
    task: TaskInfo
): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const deadlineText = task.deadline
        ? new Date(task.deadline).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        })
        : 'Chưa xác định';

    const priorityColors: Record<string, string> = {
        low: '#22c55e',
        medium: '#eab308',
        high: '#ef4444',
        urgent: '#dc2626',
    };
    const priorityLabels: Record<string, string> = {
        low: 'Thấp',
        medium: 'Trung bình',
        high: 'Cao',
        urgent: 'Khẩn cấp',
    };

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #b9ff66 0%, #8bc34a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header h1 { margin: 0; color: #1a1a1a; font-size: 24px; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .task-card { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .task-name { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 12px; }
            .task-meta { display: flex; gap: 20px; flex-wrap: wrap; }
            .meta-item { color: #6b7280; font-size: 14px; }
            .meta-item strong { color: #374151; }
            .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; color: white; }
            .btn { display: inline-block; background: #b9ff66; color: #1a1a1a; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📋 Task Mới Được Giao</h1>
            </div>
            <div class="content">
                <p>Xin chào <strong>${recipientName}</strong>,</p>
                <p>Bạn vừa được giao một task mới trong dự án <strong>${task.projectName}</strong>:</p>
                
                <div class="task-card">
                    <div class="task-name">${task.taskName}</div>
                    <div class="task-meta">
                        <div class="meta-item">
                            <strong>📅 Deadline:</strong> ${deadlineText}
                        </div>
                        ${task.priority ? `
                        <div class="meta-item">
                            <strong>🎯 Độ ưu tiên:</strong> 
                            <span class="priority-badge" style="background: ${priorityColors[task.priority] || '#6b7280'}">
                                ${priorityLabels[task.priority] || task.priority}
                            </span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <a href="${appUrl}/dashboard/kanban" class="btn">Xem Task</a>
                
                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                    Hãy hoàn thành task đúng deadline nhé! 💪
                </p>
            </div>
            <div class="footer">
                <p>Email này được gửi tự động từ VSmart. Vui lòng không trả lời email này.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    return sendMail({
        to: recipientEmail,
        subject: `[VSmart] Bạn được giao task: ${task.taskName}`,
        html,
    });
}

// Email nhắc nhở deadline
export async function sendDeadlineReminderEmail(
    recipientEmail: string,
    recipientName: string,
    task: TaskInfo,
    daysRemaining: number
): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const deadlineText = task.deadline
        ? new Date(task.deadline).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        })
        : 'Chưa xác định';

    const urgencyText = daysRemaining <= 0
        ? '⚠️ ĐÃ QUÁ HẠN!'
        : daysRemaining === 1
            ? '⏰ Còn 1 ngày!'
            : `⏰ Còn ${daysRemaining} ngày`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${daysRemaining <= 0 ? '#fecaca' : daysRemaining <= 1 ? '#fef3c7' : '#dbeafe'}; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header h1 { margin: 0; color: #1a1a1a; font-size: 24px; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .task-card { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${daysRemaining <= 0 ? '#ef4444' : daysRemaining <= 1 ? '#f59e0b' : '#3b82f6'}; }
            .task-name { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 8px; }
            .deadline { font-size: 16px; color: ${daysRemaining <= 0 ? '#dc2626' : '#6b7280'}; }
            .btn { display: inline-block; background: #b9ff66; color: #1a1a1a; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${urgencyText}</h1>
            </div>
            <div class="content">
                <p>Xin chào <strong>${recipientName}</strong>,</p>
                <p>Đây là nhắc nhở về deadline task của bạn:</p>
                
                <div class="task-card">
                    <div class="task-name">${task.taskName}</div>
                    <div class="deadline">📅 Deadline: ${deadlineText}</div>
                    <div style="color: #6b7280; margin-top: 8px;">📁 Dự án: ${task.projectName}</div>
                </div>

                <a href="${appUrl}/dashboard/kanban" class="btn">Xem Task</a>
            </div>
            <div class="footer">
                <p>Email này được gửi tự động từ VSmart. Vui lòng không trả lời email này.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    return sendMail({
        to: recipientEmail,
        subject: `[VSmart] ${urgencyText} - ${task.taskName}`,
        html,
    });
}

// Email khi có comment mới
export async function sendNewCommentEmail(
    recipientEmail: string,
    recipientName: string,
    comment: CommentInfo
): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #e0e7ff; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header h1 { margin: 0; color: #1a1a1a; font-size: 24px; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .comment-card { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #6366f1; }
            .commenter { font-weight: 600; color: #111827; margin-bottom: 8px; }
            .comment-text { color: #374151; white-space: pre-wrap; }
            .task-info { color: #6b7280; font-size: 14px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
            .btn { display: inline-block; background: #b9ff66; color: #1a1a1a; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>💬 Bình Luận Mới</h1>
            </div>
            <div class="content">
                <p>Xin chào <strong>${recipientName}</strong>,</p>
                <p>Có bình luận mới trong task của bạn:</p>
                
                <div class="comment-card">
                    <div class="commenter">${comment.commenterName} đã bình luận:</div>
                    <div class="comment-text">${comment.commentContent}</div>
                    <div class="task-info">📋 Task: ${comment.taskName}</div>
                </div>

                <a href="${appUrl}/dashboard/kanban" class="btn">Xem Bình Luận</a>
            </div>
            <div class="footer">
                <p>Email này được gửi tự động từ VSmart. Vui lòng không trả lời email này.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    return sendMail({
        to: recipientEmail,
        subject: `[VSmart] ${comment.commenterName} đã bình luận trong "${comment.taskName}"`,
        html,
    });
}

// Helper để kiểm tra user có bật notification hay không
export async function shouldSendNotification(
    userEmail: string,
    notificationType: 'emailTaskAssigned' | 'emailDeadlineReminder' | 'emailComments'
): Promise<boolean> {
    try {
        const supabase = await createSupabaseServerClient();

        const { data: userData } = await supabase
            .from('nguoi_dung')
            .select('settings')
            .eq('email', userEmail)
            .single();

        const settings = userData?.settings;
        if (!settings?.notifications) return true; // Default to true

        return settings.notifications[notificationType] !== false;
    } catch {
        return true; // Default to true if error
    }
}
