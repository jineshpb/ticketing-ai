import nodemailer from "nodemailer";

// Create transporter based on environment configuration
let transporter;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Use SMTP if credentials are provided
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
} else if (process.env.EMAIL_USE_SENDMAIL === 'true' && process.env.EMAIL_SENDMAIL_PATH) {
    // Use sendmail if explicitly configured
    transporter = nodemailer.createTransport({
        sendmail: true,
        newline: "unix",
        path: process.env.EMAIL_SENDMAIL_PATH,
    });
} else {
    // Development mode: use test transport that just logs emails
    console.log("⚠️  Email: Using test transport (emails will be logged, not sent)");
    console.log("⚠️  To send real emails, configure SMTP_HOST, SMTP_USER, and SMTP_PASS");
    transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: "unix",
        buffer: true,
    });
}

const sendEmail = async (to, subject, text) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || "noreply@example.com",
            to,
            subject,
            text,
        };

        const info = await transporter.sendMail(mailOptions);
        
        // In development/test mode, log the email
        if (!process.env.SMTP_HOST) {
            console.log("📧 Email (test mode):", {
                to,
                subject,
                text: text.substring(0, 100) + "...",
            });
        }
        
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};

export default sendEmail;

