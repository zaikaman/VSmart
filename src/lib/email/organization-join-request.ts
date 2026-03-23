import { getHtmlTemplate } from './email-template';
import { sendMail } from './mail';

interface OrganizationJoinRequestEmailParams {
  to: string;
  organizationName: string;
  requesterName: string;
  requesterEmail: string;
  requesterDepartment?: string | null;
  reviewUrl: string;
}

export async function sendOrganizationJoinRequestEmail({
  to,
  organizationName,
  requesterName,
  requesterEmail,
  requesterDepartment,
  reviewUrl,
}: OrganizationJoinRequestEmailParams): Promise<boolean> {
  const subject = `Có yêu cầu gia nhập mới vào tổ chức "${organizationName}"`;

  const content = `
    <p>Xin chào,</p>

    <p><strong>${requesterName}</strong> vừa gửi yêu cầu tham gia tổ chức <strong>${organizationName}</strong> trên VSmart.</p>

    <div class="highlight-box">
      <h2>${requesterName}</h2>
      <p><strong>Email:</strong> ${requesterEmail}</p>
      <p><strong>Phòng ban:</strong> ${requesterDepartment || 'Chưa cập nhật'}</p>
    </div>

    <p>Mở phần cài đặt tổ chức để xem và xử lý yêu cầu này.</p>
  `;

  const html = getHtmlTemplate({
    title: 'Yêu cầu gia nhập mới',
    content,
    action: {
      text: 'Mở cài đặt tổ chức',
      url: reviewUrl,
    },
    previewText: `${requesterName} vừa gửi yêu cầu tham gia ${organizationName}`,
  });

  const text = `
Yêu cầu gia nhập mới

${requesterName} vừa gửi yêu cầu tham gia tổ chức "${organizationName}" trên VSmart.

Email: ${requesterEmail}
Phòng ban: ${requesterDepartment || 'Chưa cập nhật'}

Xem và xử lý yêu cầu tại:
${reviewUrl}

---
VSmart
  `.trim();

  return sendMail({ to, subject, html, text });
}
