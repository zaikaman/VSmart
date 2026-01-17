export interface EmailAction {
    text: string;
    url: string;
}

export interface EmailTemplateParams {
    title: string;
    content: string; // HTML content
    action?: EmailAction;
    previewText?: string;
}

/**
 * Generates a unified HTML email template matching the VSmart dark theme.
 * Brand Colors:
 * - Background: #191a23
 * - Accent/Primary: #b9ff66
 * - Text: #ffffff
 * - Muted: #888888
 */
export function getHtmlTemplate({
    title,
    content,
    action,
    previewText,
}: EmailTemplateParams): string {
    const preview = previewText || title;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #ffffff;
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          width: 100%;
          background-color: #f5f5f5;
          padding: 40px 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #191a23; /* Dark sidebar color from globals.css */
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          padding: 30px 40px;
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .logo-text {
          font-size: 24px;
          font-weight: 800;
          color: #b9ff66; /* Brand Lime */
          text-decoration: none;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px;
          color: #e5e7eb; /* Gray-200 */
        }
        h1, h2, h3 {
          color: #b9ff66; /* Brand Lime */
          margin-top: 0;
        }
        p {
          margin: 0 0 20px;
          font-size: 16px;
          line-height: 26px;
        }
        strong {
          color: #ffffff;
        }
        .highlight-box {
          background-color: rgba(185, 255, 102, 0.1); /* Lime with low opacity */
          border-left: 4px solid #b9ff66;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .btn-container {
          text-align: center;
          margin: 35px 0;
        }
        .btn {
          display: inline-block;
          background-color: #b9ff66;
          color: #000000;
          font-weight: 700;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-size: 16px;
          transition: opacity 0.2s;
        }
        .btn:hover {
          opacity: 0.9;
        }
        .footer {
          background-color: #111218; /* Slightly darker than container */
          padding: 30px;
          text-align: center;
          color: #6b7280;
          font-size: 13px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .footer a {
          color: #9ca3af;
          text-decoration: underline;
        }
        /* Utility classes for content injection */
        .text-muted { color: #9ca3af; }
        .text-accent { color: #b9ff66; }
        .text-white { color: #ffffff; }
        
        @media only screen and (max-width: 620px) {
          .wrapper { padding: 20px 10px; }
          .content { padding: 25px; }
          .header { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        ${preview}
      </div>
      
      <div class="wrapper">
        <div class="container">
          <!-- Header -->
          <div class="header">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vsmart.com'}" class="logo-text">
              VSmart
            </a>
          </div>

          <!-- Main Content -->
          <div class="content">
            <h1>${title}</h1>
            
            ${content}

            ${action ? `
              <div class="btn-container">
                <a href="${action.url}" class="btn">${action.text}</a>
              </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>Email này được gửi tự động từ hệ thống VSmart.</p>
            <p>&copy; ${new Date().getFullYear()} VSmart. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
