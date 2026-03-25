import { getHtmlTemplate } from './email-template';
import { sendMail } from './mail';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface TaskReviewSubmittedEmailParams {
  to: string;
  recipientName: string;
  submitterName: string;
  taskName: string;
  projectName: string;
  reviewUrl: string;
  reviewRequestComment?: string | null;
}

interface TaskReviewDecisionEmailParams {
  to: string;
  recipientName: string;
  reviewerName: string;
  taskName: string;
  projectName: string;
  reviewUrl: string;
  decision: 'approved' | 'changes_requested';
  reviewComment?: string | null;
}

interface InvitationResponseEmailParams {
  to: string;
  inviterName: string;
  responderName: string;
  responderEmail: string;
  entityName: string;
  entityType: 'project' | 'organization';
  response: 'accepted' | 'declined';
  reviewUrl?: string;
}

interface OrganizationJoinRequestDecisionEmailParams {
  to: string;
  requesterName: string;
  organizationName: string;
  reviewerName: string;
  decision: 'approved' | 'rejected';
  reviewUrl?: string;
}

export async function sendTaskReviewSubmittedEmail({
  to,
  recipientName,
  submitterName,
  taskName,
  projectName,
  reviewUrl,
  reviewRequestComment,
}: TaskReviewSubmittedEmailParams): Promise<boolean> {
  const content = `
    <p>Xin chào <strong>${recipientName}</strong>,</p>
    <p><strong>${submitterName}</strong> vừa gửi một task lên để chờ duyệt.</p>

    <div class="highlight-box">
      <h2>${taskName}</h2>
      <p><strong>Dự án:</strong> ${projectName}</p>
      ${
        reviewRequestComment
          ? `<p><strong>Ghi chú:</strong> ${reviewRequestComment}</p>`
          : '<p><strong>Ghi chú:</strong> Không có ghi chú bổ sung.</p>'
      }
    </div>

    <p>Mở VSmart để xem chi tiết và xử lý khi thuận tiện.</p>
  `;

  return sendMail({
    to,
    subject: `[VSmart] Task chờ duyệt: ${taskName}`,
    html: getHtmlTemplate({
      title: 'Có task mới đang chờ duyệt',
      content,
      action: {
        text: 'Mở task',
        url: reviewUrl,
      },
      previewText: `${submitterName} vừa gửi task ${taskName} để chờ duyệt`,
    }),
  });
}

export async function sendTaskReviewDecisionEmail({
  to,
  recipientName,
  reviewerName,
  taskName,
  projectName,
  reviewUrl,
  decision,
  reviewComment,
}: TaskReviewDecisionEmailParams): Promise<boolean> {
  const isApproved = decision === 'approved';
  const title = isApproved ? 'Task đã được duyệt' : 'Task cần chỉnh sửa thêm';
  const subject = isApproved
    ? `[VSmart] Task đã được duyệt: ${taskName}`
    : `[VSmart] Task cần chỉnh sửa: ${taskName}`;

  const content = `
    <p>Xin chào <strong>${recipientName}</strong>,</p>
    <p><strong>${reviewerName}</strong> vừa ${
      isApproved ? 'duyệt task của bạn.' : 'phản hồi task của bạn và yêu cầu chỉnh sửa thêm.'
    }</p>

    <div class="highlight-box" style="border-left-color: ${isApproved ? '#22c55e' : '#f59e0b'};">
      <h2>${taskName}</h2>
      <p><strong>Dự án:</strong> ${projectName}</p>
      ${
        reviewComment
          ? `<p><strong>Nhận xét:</strong> ${reviewComment}</p>`
          : `<p><strong>Nhận xét:</strong> ${isApproved ? 'Không có ghi chú bổ sung.' : 'Vui lòng mở task để xem chi tiết.'}</p>`
      }
    </div>
  `;

  return sendMail({
    to,
    subject,
    html: getHtmlTemplate({
      title,
      content,
      action: {
        text: 'Xem task',
        url: reviewUrl,
      },
      previewText: `${reviewerName} vừa ${isApproved ? 'duyệt' : 'phản hồi'} task ${taskName}`,
    }),
  });
}

export async function sendInvitationResponseEmail({
  to,
  inviterName,
  responderName,
  responderEmail,
  entityName,
  entityType,
  response,
  reviewUrl,
}: InvitationResponseEmailParams): Promise<boolean> {
  const accepted = response === 'accepted';
  const entityLabel = entityType === 'project' ? 'dự án' : 'tổ chức';
  const title = accepted
    ? `Lời mời vào ${entityLabel} đã được chấp nhận`
    : `Lời mời vào ${entityLabel} đã bị từ chối`;
  const subject = accepted
    ? `[VSmart] ${responderName} đã chấp nhận lời mời ${entityLabel}`
    : `[VSmart] ${responderName} đã từ chối lời mời ${entityLabel}`;

  const content = `
    <p>Xin chào <strong>${inviterName}</strong>,</p>
    <p><strong>${responderName}</strong> (${responderEmail}) vừa ${
      accepted ? 'chấp nhận' : 'từ chối'
    } lời mời tham gia ${entityLabel} mà bạn đã gửi.</p>

    <div class="highlight-box">
      <h2>${entityName}</h2>
      <p><strong>Loại:</strong> ${entityType === 'project' ? 'Dự án' : 'Tổ chức'}</p>
      <p><strong>Phản hồi:</strong> ${accepted ? 'Đã chấp nhận' : 'Đã từ chối'}</p>
    </div>
  `;

  return sendMail({
    to,
    subject,
    html: getHtmlTemplate({
      title,
      content,
      action: reviewUrl
        ? {
            text: entityType === 'project' ? 'Mở dự án' : 'Mở tổ chức',
            url: reviewUrl,
          }
        : undefined,
      previewText: `${responderName} vừa ${accepted ? 'chấp nhận' : 'từ chối'} lời mời ${entityLabel}`,
    }),
  });
}

export async function sendOrganizationJoinRequestDecisionEmail({
  to,
  requesterName,
  organizationName,
  reviewerName,
  decision,
  reviewUrl = `${appUrl}/dashboard/settings`,
}: OrganizationJoinRequestDecisionEmailParams): Promise<boolean> {
  const approved = decision === 'approved';
  const title = approved ? 'Yêu cầu gia nhập đã được duyệt' : 'Yêu cầu gia nhập chưa được chấp nhận';
  const subject = approved
    ? `[VSmart] Yêu cầu gia nhập "${organizationName}" đã được duyệt`
    : `[VSmart] Yêu cầu gia nhập "${organizationName}" đã bị từ chối`;

  const content = `
    <p>Xin chào <strong>${requesterName}</strong>,</p>
    <p><strong>${reviewerName}</strong> vừa ${
      approved ? 'duyệt yêu cầu gia nhập của bạn.' : 'từ chối yêu cầu gia nhập của bạn.'
    }</p>

    <div class="highlight-box" style="border-left-color: ${approved ? '#22c55e' : '#ef4444'};">
      <h2>${organizationName}</h2>
      <p><strong>Kết quả:</strong> ${approved ? 'Đã được chấp nhận' : 'Chưa được chấp nhận'}</p>
    </div>

    <p>${approved ? 'Bạn có thể đăng nhập để bắt đầu làm việc cùng tổ chức.' : 'Bạn có thể liên hệ quản trị viên nếu cần biết thêm chi tiết.'}</p>
  `;

  return sendMail({
    to,
    subject,
    html: getHtmlTemplate({
      title,
      content,
      action: {
        text: approved ? 'Mở VSmart' : 'Xem lại',
        url: reviewUrl,
      },
      previewText: `${organizationName}: ${approved ? 'yêu cầu đã được duyệt' : 'yêu cầu đã bị từ chối'}`,
    }),
  });
}
