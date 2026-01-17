import { sendMail } from './mail';
import { getHtmlTemplate } from './email-template';

interface ProjectInvitationEmailParams {
  to: string;
  projectName: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  acceptUrl: string;
}

/**
 * Gửi email thông báo lời mời vào dự án
 */
export async function sendProjectInvitationEmail({
  to,
  projectName,
  inviterName,
  inviterEmail,
  role,
  acceptUrl,
}: ProjectInvitationEmailParams): Promise<boolean> {
  const roleNames: Record<string, string> = {
    owner: 'Chủ sở hữu',
    admin: 'Quản trị viên',
    member: 'Thành viên',
    viewer: 'Người xem',
  };

  const roleName = roleNames[role] || 'Thành viên';

  const subject = `Lời mời tham gia dự án "${projectName}"`;

  const content = `
    <p>Xin chào,</p>
    
    <p><strong>${inviterName}</strong> (${inviterEmail}) đã mời bạn tham gia vào dự án trên VSmart.</p>
    
    <div class="highlight-box">
      <h2>${projectName}</h2>
      <p><strong>Vai trò:</strong> ${roleName}</p>
      <p><strong>Người mời:</strong> ${inviterName}</p>
    </div>
    
    <p>Bạn sẽ được tham gia với vai trò <strong class="text-accent">${roleName}</strong> và có thể cộng tác cùng team trong dự án này.</p>
    
    <p class="text-muted" style="font-size: 14px; margin-top: 25px;">
      Nếu bạn không mong đợi email này, bạn có thể bỏ qua nó. Lời mời sẽ hết hạn nếu không được chấp nhận.
    </p>
  `;

  // Get the complete HTML using the template
  const html = getHtmlTemplate({
    title: '🎉 Lời mời tham gia dự án',
    content,
    action: {
      text: 'Xem lời mời',
      url: acceptUrl,
    },
    previewText: `${inviterName} mời bạn tham gia dự án ${projectName}`,
  });

  const text = `
Lời mời tham gia dự án

Xin chào,

${inviterName} (${inviterEmail}) đã mời bạn tham gia vào dự án "${projectName}" trên VSmart.

Vai trò: ${roleName}

Để xem và chấp nhận lời mời, vui lòng truy cập:
${acceptUrl}

Nếu bạn không mong đợi email này, bạn có thể bỏ qua nó.

---
VSmart - Quản lý dự án thông minh
  `.trim();

  return sendMail({ to, subject, html, text });
}
