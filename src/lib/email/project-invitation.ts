import { sendMail } from './mail';

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
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .content p {
          margin: 0 0 15px 0;
          color: #555;
        }
        .project-info {
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .project-info h2 {
          margin: 0 0 10px 0;
          color: #667eea;
          font-size: 18px;
        }
        .project-info p {
          margin: 5px 0;
          color: #666;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .button {
          display: inline-block;
          padding: 14px 35px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
        }
        .footer {
          background: #f8f9fa;
          padding: 25px 30px;
          text-align: center;
          border-top: 1px solid #e9ecef;
        }
        .footer p {
          margin: 5px 0;
          color: #888;
          font-size: 14px;
        }
        .footer a {
          color: #667eea;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Lời mời tham gia dự án</h1>
        </div>
        
        <div class="content">
          <p>Xin chào,</p>
          
          <p><strong>${inviterName}</strong> (${inviterEmail}) đã mời bạn tham gia vào dự án trên VSmart.</p>
          
          <div class="project-info">
            <h2>${projectName}</h2>
            <p><strong>Vai trò:</strong> ${roleName}</p>
            <p><strong>Người mời:</strong> ${inviterName}</p>
          </div>
          
          <p>Bạn sẽ được tham gia với vai trò <strong>${roleName}</strong> và có thể cộng tác cùng team trong dự án này.</p>
          
          <div class="button-container">
            <a href="${acceptUrl}" class="button">Xem lời mời</a>
          </div>
          
          <p style="color: #888; font-size: 14px; margin-top: 25px;">
            Nếu bạn không mong đợi email này, bạn có thể bỏ qua nó. Lời mời sẽ hết hạn nếu không được chấp nhận.
          </p>
        </div>
        
        <div class="footer">
          <p><strong>VSmart - Quản lý dự án thông minh</strong></p>
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
          <p>Nếu cần hỗ trợ, vui lòng liên hệ <a href="mailto:support@vsmart.com">support@vsmart.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

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
