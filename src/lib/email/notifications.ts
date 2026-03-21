import { sendMail } from './mail';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getHtmlTemplate } from './email-template';

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

interface TeamDigestInfo {
    recipientEmail: string;
    recipientName: string;
    digestType: 'daily' | 'weekly';
    headline: string;
    summary: string;
    bullets: string[];
    referenceId: string;
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

    const content = `
        <p>Xin chào <strong>${recipientName}</strong>,</p>
        <p>Bạn vừa được giao một task mới trong dự án <strong>${task.projectName}</strong>:</p>
        
        <div class="highlight-box">
            <h3 style="margin-top:0">${task.taskName}</h3>
            <div style="display:flex; gap:20px; flex-wrap:wrap; margin-top:10px;">
                <div>
                    <strong>📅 Deadline:</strong> <span class="text-muted">${deadlineText}</span>
                </div>
                ${task.priority ? `
                <div>
                    <strong>🎯 Độ ưu tiên:</strong> 
                    <span style="color: ${priorityColors[task.priority] || '#6b7280'}; font-weight:bold;">
                        ${priorityLabels[task.priority] || task.priority}
                    </span>
                </div>
                ` : ''}
            </div>
        </div>
        
        <p class="text-muted" style="margin-top: 30px; font-size: 14px;">
            Hãy hoàn thành task đúng deadline nhé! 💪
        </p>
    `;

    const html = getHtmlTemplate({
        title: '📋 Task Mới Được Giao',
        content,
        action: {
            text: 'Xem Task',
            url: `${appUrl}/dashboard/kanban`,
        },
        previewText: `Bạn được giao task mới: ${task.taskName}`,
    });

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

    const content = `
        <p>Xin chào <strong>${recipientName}</strong>,</p>
        <p>Đây là nhắc nhở về deadline task của bạn:</p>
        
        <div class="highlight-box" style="border-left-color: ${daysRemaining <= 0 ? '#ef4444' : daysRemaining <= 1 ? '#f59e0b' : '#3b82f6'};">
            <h3 style="margin-top:0">${task.taskName}</h3>
            <div style="font-size: 16px; color: ${daysRemaining <= 0 ? '#ef4444' : '#ffffff'}; font-weight:bold;">
                📅 Deadline: ${deadlineText}
            </div>
            <div class="text-muted" style="margin-top: 8px;">📁 Dự án: ${task.projectName}</div>
        </div>
    `;

    const html = getHtmlTemplate({
        title: urgencyText,
        content,
        action: {
            text: 'Xem Task',
            url: `${appUrl}/dashboard/kanban`,
        },
        previewText: `${urgencyText}: ${task.taskName}`,
    });

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

    const content = `
        <p>Xin chào <strong>${recipientName}</strong>,</p>
        <p>Có bình luận mới trong task của bạn:</p>
        
        <div class="highlight-box" style="border-left-color: #6366f1;">
            <div style="font-weight: 600; color: #b9ff66; margin-bottom: 8px;">${comment.commenterName} đã bình luận:</div>
            <div style="color: #ffffff; white-space: pre-wrap;">${comment.commentContent}</div>
            <div class="text-muted" style="font-size: 14px; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
                📋 Task: ${comment.taskName}
            </div>
        </div>
    `;

    const html = getHtmlTemplate({
        title: '💬 Bình Luận Mới',
        content,
        action: {
            text: 'Xem Bình Luận',
            url: `${appUrl}/dashboard/kanban`,
        },
        previewText: `${comment.commenterName} đã bình luận trong ${comment.taskName}`,
    });

    return sendMail({
        to: recipientEmail,
        subject: `[VSmart] ${comment.commenterName} đã bình luận trong "${comment.taskName}"`,
        html,
    });
}

export async function sendTeamDigestEmail(digest: TeamDigestInfo): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const digestLabel = digest.digestType === 'weekly' ? 'Tóm tắt tuần' : 'Tóm tắt hôm nay';

    const content = `
        <p>Xin chào <strong>${digest.recipientName}</strong>,</p>
        <p>Dưới đây là ${digestLabel.toLowerCase()} của đội:</p>

        <div class="highlight-box" style="border-left-color: #b9ff66;">
            <h3 style="margin-top:0">${digest.headline}</h3>
            <p style="color:#d7dde8; margin-bottom: 14px;">${digest.summary}</p>
            ${
                digest.bullets.length > 0
                    ? `
                <ul style="padding-left: 18px; margin: 0; color: #ffffff;">
                    ${digest.bullets.map((item) => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
                </ul>
            `
                    : ''
            }
        </div>
    `;

    const html = getHtmlTemplate({
        title: digestLabel,
        content,
        action: {
            text: 'Mở dashboard',
            url: `${appUrl}/dashboard?digest=${encodeURIComponent(digest.referenceId)}`,
        },
        previewText: `${digestLabel}: ${digest.headline}`,
    });

    return sendMail({
        to: digest.recipientEmail,
        subject: `[VSmart] ${digestLabel}: ${digest.headline}`,
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
