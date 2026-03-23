import { getHtmlTemplate } from './email-template';
import { sendMail } from './mail';

interface OrganizationInvitationEmailParams {
  to: string;
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  role: 'admin' | 'manager' | 'member';
  acceptUrl: string;
}

const roleLabels: Record<OrganizationInvitationEmailParams['role'], string> = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  member: 'Thành viên',
};

export async function sendOrganizationInvitationEmail({
  to,
  organizationName,
  inviterName,
  inviterEmail,
  role,
  acceptUrl,
}: OrganizationInvitationEmailParams): Promise<boolean> {
  const roleLabel = roleLabels[role];
  const subject = `Lời mời tham gia tổ chức "${organizationName}"`;

  const content = `
    <p>Xin chào,</p>

    <p><strong>${inviterName}</strong> (${inviterEmail}) đã mời bạn tham gia tổ chức trên VSmart.</p>

    <div class="highlight-box">
      <h2>${organizationName}</h2>
      <p><strong>Vai trò:</strong> ${roleLabel}</p>
      <p><strong>Người mời:</strong> ${inviterName}</p>
    </div>

    <p>Đăng nhập bằng đúng email này để xem và phản hồi lời mời.</p>
  `;

  const html = getHtmlTemplate({
    title: 'Lời mời tham gia tổ chức',
    content,
    action: {
      text: 'Xem lời mời',
      url: acceptUrl,
    },
    previewText: `${inviterName} mời bạn tham gia tổ chức ${organizationName}`,
  });

  const text = `
Lời mời tham gia tổ chức

Xin chào,

${inviterName} (${inviterEmail}) đã mời bạn tham gia tổ chức "${organizationName}" trên VSmart.

Vai trò được đề xuất: ${roleLabel}

Đăng nhập bằng đúng email này để xem và phản hồi lời mời:
${acceptUrl}

---
VSmart
  `.trim();

  return sendMail({ to, subject, html, text });
}
