import nodemailer from 'nodemailer';

// Tạo transporter cho Gmail SMTP
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT || '587'),
    secure: process.env.MAIL_PORT === '465', // true for 465, false for other ports
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD?.replace(/"/g, ''), // Remove quotes if present
    },
});

interface SendMailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export async function sendMail({ to, subject, html, text }: SendMailOptions): Promise<boolean> {
    try {
        const fromName = process.env.MAIL_FROM_NAME?.replace(/"/g, '') || 'VSmart Team';
        const fromAddress = process.env.MAIL_FROM_ADDRESS || 'noreply@vsmart.com';

        await transporter.sendMail({
            from: `"${fromName}" <${fromAddress}>`,
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        });

        console.log(`Email sent successfully to ${to}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

// Verify connection configuration
export async function verifyMailConnection(): Promise<boolean> {
    try {
        await transporter.verify();
        console.log('Mail server connection verified');
        return true;
    } catch (error) {
        console.error('Mail server connection failed:', error);
        return false;
    }
}
